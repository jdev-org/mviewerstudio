"""Connectivity and CORS validation helpers for generated mviewer apps."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Mapping
from urllib.parse import parse_qsl, quote, urlencode, urljoin, urlparse, urlunparse

import requests

from .mcp_config import current_settings
from .network_policy import assert_allowed_url


def validate_app_connectivity(
    spec: dict[str, Any],
    public_origin: str = "",
    timeout: float = 10,
    backend_headers: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    """Validate layer availability, browser CORS risk and proxy fallback."""
    origin = public_origin or _default_public_origin()
    layers = _operational_layers(spec)
    layer_reports = [
        _validate_layer(
            layer=layer,
            spec=spec,
            public_origin=origin,
            timeout=timeout,
            backend_headers=backend_headers or {},
        )
        for layer in layers
    ]
    needs_proxy = [
        report for report in layer_reports if report.get("proxy_required")
    ]
    fixable = [
        report
        for report in needs_proxy
        if report.get("proxy", {}).get("ok")
    ]
    return {
        "public_origin": origin,
        "proxy_url": spec.get("proxy_url", "proxy/?url="),
        "layer_count": len(layer_reports),
        "ok": all(
            report.get("direct", {}).get("available")
            and (not report.get("proxy_required") or report.get("proxy", {}).get("ok"))
            for report in layer_reports
        ),
        "proxy_required_count": len(needs_proxy),
        "proxy_fixable_count": len(fixable),
        "layers": layer_reports,
    }


def fix_app_connectivity(
    spec: dict[str, Any],
    public_origin: str = "",
    timeout: float = 10,
    backend_headers: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    """Return a copied ApplicationSpec with useproxy enabled only when needed."""
    fixed_spec = deepcopy(spec)
    report = validate_app_connectivity(
        fixed_spec,
        public_origin=public_origin,
        timeout=timeout,
        backend_headers=backend_headers,
    )
    fixed_layers = _operational_layers(fixed_spec)
    changed_layers: list[dict[str, str]] = []
    reports_by_path = {
        layer_report["path"]: layer_report for layer_report in report["layers"]
    }
    for layer in fixed_layers:
        layer_report = reports_by_path.get(layer["path"], {})
        if layer_report.get("proxy_required") and layer_report.get("proxy", {}).get("ok"):
            layer["data"]["useproxy"] = True
            changed_layers.append(
                {
                    "path": layer["path"],
                    "id": str(layer["data"].get("id", "")),
                    "reason": ",".join(layer_report.get("proxy_reasons", [])),
                }
            )
    return {
        "spec": fixed_spec,
        "connectivity": report,
        "changed_layers": changed_layers,
    }


def _validate_layer(
    layer: dict[str, Any],
    spec: dict[str, Any],
    public_origin: str,
    timeout: float,
    backend_headers: Mapping[str, str],
) -> dict[str, Any]:
    data = layer["data"]
    layer_id = str(data.get("id", ""))
    url = str(data.get("url", ""))
    report: dict[str, Any] = {
        "path": layer["path"],
        "id": layer_id,
        "name": data.get("name", ""),
        "type": data.get("type", ""),
        "url": url,
        "current_useproxy": _bool(data.get("useproxy")),
        "direct": {},
        "proxy_required": False,
        "proxy_reasons": [],
        "proxy": {},
    }
    if not url:
        report["direct"] = {"available": False, "error": "Missing layer URL"}
        return report

    try:
        assert_allowed_url(url)
    except ValueError as error:
        report["direct"] = {"available": False, "error": str(error)}
        return report

    capabilities_url = (
        _wms_capabilities_url(url)
        if str(data.get("type", "wms")).lower() == "wms"
        else url
    )
    direct = _request_url(
        capabilities_url,
        public_origin=public_origin,
        timeout=timeout,
    )
    direct["tested_url"] = capabilities_url
    direct["same_origin"] = _same_origin(public_origin, url)
    direct["mixed_content"] = _is_mixed_content(public_origin, url)
    report["direct"] = direct

    if direct["mixed_content"]:
        report["proxy_required"] = True
        report["proxy_reasons"].append("mixed_content")
    if direct["available"] and not direct["cors_ok"]:
        report["proxy_required"] = True
        report["proxy_reasons"].append("cors_missing")
    if report["current_useproxy"]:
        report["proxy_required"] = True
        report["proxy_reasons"].append("already_configured")

    render_url = _wms_getmap_url(data)
    if render_url:
        render = _request_url(
            render_url,
            public_origin=public_origin,
            timeout=timeout,
        )
        render["tested_url"] = render_url
        report["render"] = render
        if render["available"] and not render["cors_ok"]:
            report["proxy_required"] = True
            if "cors_missing" not in report["proxy_reasons"]:
                report["proxy_reasons"].append("cors_missing")

    if report["proxy_required"]:
        proxy_url = _proxied_url(
            str(spec.get("proxy_url", "proxy/?url=")),
            capabilities_url,
        )
        if proxy_url:
            report["proxy"] = _request_url(
                proxy_url,
                public_origin="",
                timeout=timeout,
                headers=backend_headers,
            )
            report["proxy"]["tested_url"] = proxy_url
        else:
            report["proxy"] = {"ok": False, "available": False, "error": "Missing proxy URL"}
    return report


def _request_url(
    url: str,
    public_origin: str = "",
    timeout: float = 10,
    headers: Mapping[str, str] | None = None,
) -> dict[str, Any]:
    request_headers = dict(headers or {})
    if public_origin:
        request_headers.setdefault("Origin", public_origin)
    try:
        response = requests.get(url, headers=request_headers, timeout=timeout)
    except requests.RequestException as error:
        return {
            "ok": False,
            "available": False,
            "cors_ok": False,
            "error": str(error),
        }
    available = 200 <= response.status_code < 400
    cors_ok = _cors_ok(response.headers, public_origin, url)
    return {
        "ok": available and cors_ok,
        "available": available,
        "cors_ok": cors_ok,
        "status_code": response.status_code,
        "content_type": response.headers.get("Content-Type", ""),
        "access_control_allow_origin": response.headers.get(
            "Access-Control-Allow-Origin",
            "",
        ),
    }


def _cors_ok(headers: Mapping[str, str], public_origin: str, url: str) -> bool:
    if not public_origin or _same_origin(public_origin, url):
        return True
    allowed_origin = headers.get("Access-Control-Allow-Origin", "")
    allowed_origin = allowed_origin.strip()
    return allowed_origin == "*" or allowed_origin == public_origin


def _operational_layers(spec: dict[str, Any]) -> list[dict[str, Any]]:
    layers: list[dict[str, Any]] = []
    for theme_index, theme in enumerate(spec.get("themes", [])):
        for layer_index, layer in enumerate(theme.get("layers", [])):
            layers.append(
                {
                    "path": f"themes[{theme_index}].layers[{layer_index}]",
                    "data": layer,
                }
            )
        for group_index, group in enumerate(theme.get("groups", [])):
            for layer_index, layer in enumerate(group.get("layers", [])):
                layers.append(
                    {
                        "path": (
                            f"themes[{theme_index}].groups[{group_index}]"
                            f".layers[{layer_index}]"
                        ),
                        "data": layer,
                    }
                )
    return layers


def _wms_capabilities_url(url: str) -> str:
    return _with_query(
        url,
        {
            "SERVICE": "WMS",
            "REQUEST": "GetCapabilities",
            "VERSION": "1.3.0",
        },
    )


def _wms_getmap_url(layer: Mapping[str, Any]) -> str:
    layer_id = str(layer.get("id", ""))
    url = str(layer.get("url", ""))
    if not layer_id or not url or str(layer.get("type", "wms")).lower() != "wms":
        return ""
    west, south, east, north = _layer_lonlat_bbox(layer)
    return _with_query(
        url,
        {
            "SERVICE": "WMS",
            "REQUEST": "GetMap",
            "VERSION": "1.1.1",
            "LAYERS": layer_id,
            "STYLES": str(layer.get("style", "")),
            "FORMAT": str(layer.get("format", "image/png")),
            "TRANSPARENT": "TRUE",
            "SRS": "EPSG:4326",
            "BBOX": f"{west},{south},{east},{north}",
            "WIDTH": "2",
            "HEIGHT": "2",
        },
    )


def _layer_lonlat_bbox(layer: Mapping[str, Any]) -> tuple[str, str, str, str]:
    bbox = layer.get("bbox")
    if isinstance(bbox, Mapping):
        west = bbox.get("west")
        south = bbox.get("south")
        east = bbox.get("east")
        north = bbox.get("north")
        if all(value not in {None, ""} for value in (west, south, east, north)):
            return (str(west), str(south), str(east), str(north))
    return ("-180", "-90", "180", "90")


def _proxied_url(proxy_url: str, target_url: str) -> str:
    if not proxy_url:
        return ""
    absolute_proxy = _absolute_proxy_url(proxy_url)
    return f"{absolute_proxy}{quote(target_url, safe='')}"


def _absolute_proxy_url(proxy_url: str) -> str:
    parsed = urlparse(proxy_url)
    if parsed.scheme and parsed.netloc:
        return proxy_url
    settings = current_settings()
    base_url = (
        settings.mviewerstudio_base_url or "http://localhost/mviewerstudio"
    ).rstrip("/") + "/"
    return urljoin(base_url, proxy_url.lstrip("/"))


def _default_public_origin() -> str:
    settings = current_settings()
    if settings.mviewer_public_origin:
        return settings.mviewer_public_origin.rstrip("/")
    fqdn = _origin_from_fqdn(settings.mviewer_fqdn)
    if fqdn:
        return fqdn
    for value in (settings.mviewer_base_url, settings.mviewerstudio_base_url):
        origin = _origin(value)
        if origin:
            return origin
    return "http://localhost"


def _origin(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme}://{parsed.netloc}"


def _origin_from_fqdn(value: str) -> str:
    normalized = value.strip().rstrip("/")
    if not normalized:
        return ""
    if "://" not in normalized:
        normalized = f"https://{normalized}"
    return _origin(normalized)


def _same_origin(origin: str, url: str) -> bool:
    return bool(origin) and _origin(url) == origin.rstrip("/")


def _is_mixed_content(public_origin: str, url: str) -> bool:
    return urlparse(public_origin).scheme == "https" and urlparse(url).scheme == "http"


def _with_query(url: str, params: dict[str, str]) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(params)
    return urlunparse(parsed._replace(query=urlencode(query)))


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).lower() in {"1", "true", "yes", "on"}
