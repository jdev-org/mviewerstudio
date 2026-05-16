"""FastMCP entrypoint exposing MviewerStudio capabilities as agent tools.

This module is deliberately thin: it defines the MCP protocol surface, then
delegates backend calls to `MviewerStudioClient`, OGC discovery to `ogc_tools`,
input validation to `schemas`, and XML generation to `xml_builder`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
import argparse
import json
import os

from mcp.server.fastmcp import Context, FastMCP

from .analytics import layer_usage
from .client import MviewerStudioClient
from .connectivity import fix_app_connectivity, validate_app_connectivity
from .geo_tools import geocode_location
from .intent_tools import app_spec_from_intent
from .map_tools import (
    apply_mviewer_tool_recommendation,
    available_mviewer_tools,
    suggest_mviewer_tools_for_intent,
)
from .mcp_config import load_mcp_config
from .ogc_tools import (
    allowed_ogc_hosts,
    inspect_wms_layer,
    search_csw_records,
    search_wms_layers,
)
from .schemas import ApplicationSpec, example_application_spec
from .spatial_files import decode_spatial_file_content, spatial_file_response
from .xml_builder import build_mviewer_xml
from .xml_parser import mviewer_xml_to_spec


load_mcp_config()


def create_mcp_server(host: str = "127.0.0.1", port: int = 8030) -> FastMCP:
    """Create a configured FastMCP server without starting its transport."""
    mcp = FastMCP(
        "MviewerStudio",
        instructions=(
            "Create, preview and publish mviewer applications through "
            "MviewerStudio. Prefer the structured ApplicationSpec JSON tools "
            "instead of generating raw XML by hand."
        ),
        host=host,
        port=port,
        json_response=True,
        # MviewerStudio MCP tools do not keep per-client state. Stateless HTTP
        # keeps streamable-http compatible with clients that do not persist the
        # mcp-session-id header between requests.
        stateless_http=_stateless_http_enabled(),
    )

    # Resources are read-only context documents. They help an agent understand
    # the local MviewerStudio instance before it starts calling mutating tools.
    @mcp.resource(
        "mviewerstudio://capabilities",
        name="MviewerStudio capabilities",
        mime_type="application/json",
    )
    def capabilities_resource() -> str:
        """Return frontend configuration: versions, basemaps and data providers."""
        return json.dumps(_load_capabilities(), ensure_ascii=False, indent=2)

    @mcp.resource(
        "mviewerstudio://application-spec/example",
        name="Example ApplicationSpec",
        mime_type="application/json",
    )
    def example_spec_resource() -> str:
        """Return a minimal ApplicationSpec accepted by create_or_update_mviewer_app."""
        return json.dumps(example_application_spec(), ensure_ascii=False, indent=2)

    # Tool naming stays explicit on purpose. Agents tend to choose better actions
    # when build, save, preview and publish are separate capabilities.
    @mcp.tool()
    def get_mviewerstudio_capabilities() -> dict[str, Any]:
        """Get configured mviewer versions, baselayers and OGC data providers."""
        return _load_capabilities()

    @mcp.tool()
    def get_application_spec_example() -> dict[str, Any]:
        """Get a minimal JSON payload for create_or_update_mviewer_app."""
        return example_application_spec()

    @mcp.tool()
    def list_available_mviewer_tools() -> dict[str, Any]:
        """List standard and advanced cartographic tools known by this MCP server."""
        return available_mviewer_tools()

    @mcp.tool()
    def suggest_mviewer_tools(
        intent: str,
        audience: str = "grand_public",
        preset: str = "",
    ) -> dict[str, Any]:
        """Recommend mviewer tools for a business need and target audience."""
        return suggest_mviewer_tools_for_intent(
            intent=intent,
            audience=audience,
            preset=preset,
        )

    @mcp.tool()
    def apply_mviewer_tools_to_app_spec(
        spec: dict[str, Any],
        intent: str = "",
        audience: str = "grand_public",
        preset: str = "",
    ) -> dict[str, Any]:
        """Apply recommended mviewer tool options to an ApplicationSpec copy."""
        return apply_mviewer_tool_recommendation(
            spec=spec,
            intent=intent,
            audience=audience,
            preset=preset,
        )

    @mcp.tool()
    def get_mcp_effective_identity(ctx: Context) -> dict[str, Any]:
        """Return the trusted identity that MCP will forward to MviewerStudio."""
        trusted_headers = _trusted_request_identity_headers(ctx)
        client = MviewerStudioClient(identity_headers=trusted_headers)
        return {
            "source": (
                "trusted_request_headers"
                if trusted_headers
                else "server_environment_defaults"
            ),
            "identity": client.active_identity(),
            "trust_request_headers": _trust_request_identity_headers(),
            "allow_tool_identity_override": _allow_tool_identity_override(),
        }

    @mcp.tool()
    def geocode_map_location(query: str, limit: int = 5) -> list[dict[str, Any]]:
        """Geocode a French city/address/zone and return mviewer EPSG:3857 centers."""
        return geocode_location(query, limit=limit)

    @mcp.tool()
    def get_baselayer_from_config(
        query: str = "ortho",
        visible: bool = True,
    ) -> dict[str, Any]:
        """Find a configured baselayer, for example 'ortho', and return ApplicationSpec JSON."""
        return _find_baselayer(query=query, visible=visible)

    @mcp.tool()
    def prepare_centered_mviewer_app_spec(
        title: str,
        location: str,
        baselayer_query: str = "ortho",
        zoom: float = 13,
    ) -> dict[str, Any]:
        """Prepare an ApplicationSpec centered on a geocoded place with a configured basemap."""
        matches = geocode_location(location, limit=1)
        if not matches:
            raise ValueError(f"Location not found: {location}")
        place = matches[0]
        return {
            "title": title,
            "description": f"Application centree sur {place['label']}",
            "center": place["center"],
            "zoom": zoom,
            "projection": place["projection"],
            "baselayers": [_find_baselayer(query=baselayer_query, visible=True)],
            "themes": [],
            "geocoded_location": place,
        }

    @mcp.tool()
    def build_mviewer_config_xml(spec: dict[str, Any]) -> dict[str, str]:
        """Build and validate mviewer XML from an ApplicationSpec without saving it."""
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        return {"app_id": app_spec.id, "xml": xml}

    @mcp.tool()
    def validate_mviewer_app_connectivity(
        spec: dict[str, Any],
        ctx: Context,
        public_origin: str = "",
        timeout: float = 10,
    ) -> dict[str, Any]:
        """Check layer availability, browser CORS risk and proxy fallback."""
        client = _mviewer_client(ctx)
        return validate_app_connectivity(
            spec,
            public_origin=public_origin,
            timeout=timeout,
            backend_headers=client.user_headers(),
        )

    @mcp.tool()
    def fix_mviewer_app_connectivity(
        spec: dict[str, Any],
        ctx: Context,
        public_origin: str = "",
        timeout: float = 10,
    ) -> dict[str, Any]:
        """Return an ApplicationSpec copy with useproxy enabled only where required."""
        client = _mviewer_client(ctx)
        return fix_app_connectivity(
            spec,
            public_origin=public_origin,
            timeout=timeout,
            backend_headers=client.user_headers(),
        )

    @mcp.tool()
    def create_or_update_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Create or update a MviewerStudio draft application from ApplicationSpec."""
        # ApplicationSpec is the backend contract: callers provide structured
        # intent, while Python owns XML serialization and MviewerStudio API calls.
        client = _mviewer_client(ctx)
        spec, connectivity = _maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        response = client.create_or_update_app(
            app_spec.id,
            xml,
        )
        filepath = response.get("filepath") or response.get("config", {}).get("url")
        return {
            "app_id": app_spec.id,
            "draft_file": filepath,
            "preview_url": client.draft_url(filepath) if filepath else "",
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def preview_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Save the draft and create a temporary preview URL for this ApplicationSpec."""
        # Preview in MviewerStudio expects the draft workspace to exist, so this
        # first saves the XML through the normal create/update endpoint.
        client = _mviewer_client(ctx)
        spec, connectivity = _maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        save_response = client.create_or_update_app(
            app_spec.id,
            xml,
        )
        preview_response = client.preview_app(
            app_spec.id,
            xml,
        )
        preview_file = preview_response.get("file", "")
        return {
            "app_id": app_spec.id,
            "draft_file": save_response.get("filepath")
            or save_response.get("config", {}).get("url"),
            "preview_file": preview_file,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
            "connectivity": connectivity,
        }

    @mcp.tool()
    def publish_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        publish_name: str = "",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Save then publish a mviewer application and return share/iframe URLs."""
        # Publishing receives the same XML as saving to keep draft and public
        # content aligned when an agent performs both operations in one step.
        client = _mviewer_client(ctx)
        spec, connectivity = _maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        client.create_or_update_app(
            app_spec.id,
            xml,
        )
        name = publish_name or _publish_name(app_spec.title)
        response = client.publish_app(
            app_spec.id,
            name,
            xml,
        )
        online_file = response.get("online_file", "")
        share_url = client.public_url(online_file) if online_file else ""
        return {
            "app_id": app_spec.id,
            "publish_name": name,
            "online_file": online_file,
            "share_url": share_url,
            "iframe": (
                f'<iframe allowFullScreen style="border: none;" '
                f'height="600" width="800" src="{share_url}"></iframe>'
                if share_url
                else ""
            ),
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def list_mviewer_apps(
        ctx: Context,
        search: str = "",
    ) -> list[dict[str, Any]]:
        """List draft applications visible to the effective MCP identity."""
        return _mviewer_client(ctx).list_apps(
            search=search or None,
        )

    @mcp.tool()
    def get_existing_mviewer_app_spec(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Load an existing visible mviewer app as an editable ApplicationSpec."""
        client = _mviewer_client(ctx)
        response = client.get_app(
            app_id,
        )
        spec = mviewer_xml_to_spec(response["xml"])
        return {
            "app_id": app_id,
            "config": response.get("config", {}),
            "spec": spec,
            "xml": response["xml"],
        }

    @mcp.tool()
    def update_existing_mviewer_app(
        app_id: str,
        spec: dict[str, Any],
        ctx: Context,
        message: str = "MCP update",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Update an existing draft through MviewerStudio PUT, preserving UI rules."""
        payload = dict(spec)
        payload["id"] = app_id
        client = _mviewer_client(ctx)
        payload, connectivity = _maybe_fix_app_connectivity(
            payload,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(payload)
        if app_spec.id != app_id:
            raise ValueError("ApplicationSpec id must match app_id")
        xml = build_mviewer_xml(app_spec)
        response = client.update_existing_app(
            app_id,
            xml,
            message=message or "MCP update",
        )
        filepath = response.get("filepath") or response.get("config", {}).get("url")
        return {
            "app_id": app_id,
            "draft_file": filepath,
            "preview_url": client.draft_url(filepath) if filepath else "",
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def delete_mviewer_app(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Delete an existing draft application visible to the effective identity."""
        return _mviewer_client(ctx).delete_app(app_id)

    @mcp.tool()
    def unpublish_mviewer_app(
        app_id: str,
        publish_name: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Remove a published application while keeping the draft workspace."""
        return _mviewer_client(ctx).unpublish_app(app_id, publish_name)

    @mcp.tool()
    def list_mviewer_app_versions(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """List saved git versions for one existing application."""
        return _mviewer_client(ctx).list_app_versions(app_id)

    @mcp.tool()
    def preview_mviewer_app_version(
        app_id: str,
        version: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Create a preview URL for a specific saved application version."""
        client = _mviewer_client(ctx)
        response = client.preview_app_version(app_id, version)
        preview_file = response.get("file", "")
        return {
            **response,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
        }

    @mcp.tool()
    def restore_mviewer_app_version(
        app_id: str,
        version: str,
        ctx: Context,
        as_new: bool = False,
    ) -> dict[str, Any]:
        """Restore a saved version. Use as_new=true to detach it as a new working state."""
        return _mviewer_client(ctx).restore_app_version(
            app_id,
            version,
            as_new=as_new,
        )

    @mcp.tool()
    def create_mviewer_app_version(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Create a named backend version from the current draft state."""
        return _mviewer_client(ctx).create_app_version(app_id)

    @mcp.tool()
    def delete_mviewer_app_versions(
        app_id: str,
        versions: list[str],
        ctx: Context,
    ) -> dict[str, Any]:
        """Delete saved application versions except the main working branch."""
        return _mviewer_client(ctx).delete_app_versions(app_id, versions)

    @mcp.tool()
    def analyze_mviewer_layer_usage(
        scope: str = "all",
        limit: int = 20,
        include_previews: bool = False,
    ) -> dict[str, Any]:
        """Find the most frequently used operational layers in stored/public XML configs."""
        return layer_usage(scope=scope, limit=limit, include_previews=include_previews)

    @mcp.tool()
    def store_layer_template(
        app_id: str,
        layer_id: str,
        template: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Store a Mustache template file for one existing app layer."""
        return _mviewer_client(ctx).store_template(
            app_id,
            layer_id,
            template,
        )

    @mcp.tool()
    def store_sld_style(
        sld: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Store an SLD style and return the mviewer-accessible style path."""
        return _mviewer_client(ctx).store_sld(
            sld,
        )

    @mcp.tool()
    def upload_spatial_file_to_mviewer_app(
        app_id: str,
        filename: str,
        ctx: Context,
        content: str = "",
        content_base64: str = "",
        layer_name: str = "",
        layer_id: str = "",
    ) -> dict[str, Any]:
        """Store a GeoJSON/KML/CSV/Shapefile resource in an app workspace."""
        file_content = decode_spatial_file_content(
            content=content,
            content_base64=content_base64,
        )
        stored_file = _mviewer_client(ctx).store_spatial_file(
            app_id,
            filename,
            file_content,
        )
        return spatial_file_response(
            stored_file,
            layer_name=layer_name,
            layer_id=layer_id,
        )

    @mcp.tool()
    def search_wms(
        url: str,
        keyword: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search named layers in a WMS GetCapabilities document."""
        return search_wms_layers(url, keyword=keyword, limit=limit)

    @mcp.tool()
    def search_csw(
        url: str,
        keyword: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search metadata records in a CSW catalog and return layer-ready WMS resources."""
        return search_csw_records(url, keyword=keyword, limit=limit)

    @mcp.tool()
    def inspect_wms(
        url: str,
        layer_id: str,
    ) -> dict[str, Any]:
        """Inspect one WMS layer: title, styles, metadata and bounding box."""
        return inspect_wms_layer(url, layer_id)

    @mcp.tool()
    def create_mviewer_app_from_intent(
        intent: str,
        ctx: Context,
        title: str = "",
        location: str = "",
        baselayer_query: str = "plan",
        max_layers: int = 3,
        audience: str = "grand_public",
        tool_preset: str = "",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
        publish: bool = False,
        publish_name: str = "",
    ) -> dict[str, Any]:
        """Create and preview a simple public-friendly map from a plain-language need."""
        client = _mviewer_client(ctx)
        spec, choices = app_spec_from_intent(
            intent=intent,
            title=title,
            location=location,
            baselayer_query=baselayer_query,
            max_layers=max_layers,
            audience=audience,
            tool_preset=tool_preset,
        )
        connectivity: dict[str, Any] = {}
        if validate_connectivity:
            spec, connectivity = _maybe_fix_app_connectivity(
                spec,
                client,
                validate_connectivity=True,
                public_origin=public_origin,
                timeout=connectivity_timeout,
            )
            choices["connectivity"] = {
                "ok": connectivity.get("ok", False),
                "proxy_required_count": connectivity.get("proxy_required_count", 0),
                "proxy_fixable_count": connectivity.get("proxy_fixable_count", 0),
                "changed_layers": connectivity.get("changed_layers", []),
            }
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        save_response = client.create_or_update_app(app_spec.id, xml)
        preview_response = client.preview_app(app_spec.id, xml)
        preview_file = preview_response.get("file", "")
        result: dict[str, Any] = {
            "app_id": app_spec.id,
            "title": app_spec.title,
            "spec": spec,
            "choices": choices,
            "draft_file": save_response.get("filepath")
            or save_response.get("config", {}).get("url"),
            "preview_file": preview_file,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
        }
        if publish:
            name = publish_name or _publish_name(app_spec.title)
            publish_response = client.publish_app(app_spec.id, name, xml)
            online_file = publish_response.get("online_file", "")
            result["publication"] = {
                "publish_name": name,
                "online_file": online_file,
                "share_url": client.public_url(online_file) if online_file else "",
                "mviewerstudio_response": publish_response,
            }
        return result

    @mcp.prompt(title="Tester la creation d'application mviewer")
    def test_mviewer_creation_prompt(topic: str = "mobilite") -> str:
        """Prompt in French to test this MCP server end to end."""
        return test_prompt(topic)

    return mcp


def test_prompt(topic: str = "mobilite") -> str:
    """Return a human-readable prompt that exercises the main MCP workflow."""
    return f"""
Tu as acces au MCP MviewerStudio. Cree une application mviewer de demonstration sur le theme "{topic}".

Procedure attendue :
1. Lis `mviewerstudio://capabilities` ou appelle `get_mviewerstudio_capabilities`.
2. Cherche une couche WMS pertinente avec `search_wms` dans un fournisseur disponible, par exemple `https://ows.region-bretagne.fr/geoserver/rb/wms`.
3. Construis un `ApplicationSpec` JSON avec un titre explicite, un fond de plan visible, un theme et au moins une couche WMS.
4. Appelle `preview_mviewer_app` pour sauvegarder le brouillon et obtenir une URL de previsualisation.
5. Donne-moi l'URL de previsualisation et resume les couches ajoutees.

Ne genere pas de XML a la main sauf pour diagnostiquer avec `build_mviewer_config_xml`.
""".strip()


def _load_capabilities() -> dict[str, Any]:
    """Read the frontend configuration and expose only agent-relevant sections."""
    config_path = Path(
        os.getenv(
            "MVIEWERSTUDIO_CONFIG_PATH",
            Path(__file__).resolve().parents[1] / "static" / "config.json",
        )
    )
    with config_path.open(encoding="utf-8") as config_file:
        data = json.load(config_file)
    app_conf = data.get("app_conf", {})
    return {
        "studio_title": app_conf.get("studio_title"),
        "mviewer_version": app_conf.get("mviewer_version"),
        "mviewerstudio_version": app_conf.get("mviewerstudio_version"),
        "baselayers": app_conf.get("baselayers", {}),
        "data_providers": app_conf.get("data_providers", {}),
        "default_layer_params": app_conf.get("default_params", {}).get("layer", {}),
        "mcp_allowed_ogc_hosts": allowed_ogc_hosts(),
    }


def _find_baselayer(query: str = "ortho", visible: bool = True) -> dict[str, Any]:
    """Return one configured baselayer as a BaseLayerSpec-compatible dict."""
    baselayers = _load_capabilities().get("baselayers", {})
    if not isinstance(baselayers, dict) or not baselayers:
        raise ValueError("No baselayers configured")
    lowered = (query or "").lower()
    candidates = list(baselayers.values())
    selected = None
    for layer in candidates:
        haystack = " ".join(
            str(layer.get(key, ""))
            for key in ("id", "label", "title", "layers", "type")
        ).lower()
        if lowered and lowered in haystack:
            selected = layer
            break
    if selected is None:
        selected = candidates[0]
    result = dict(selected)
    result["visible"] = visible
    return result


def _mviewer_client(ctx: Context) -> MviewerStudioClient:
    """Create a backend client using only trusted MCP identity sources."""
    return MviewerStudioClient(identity_headers=_trusted_request_identity_headers(ctx))


def _maybe_fix_app_connectivity(
    spec: dict[str, Any],
    client: MviewerStudioClient,
    validate_connectivity: bool,
    public_origin: str,
    timeout: float,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Optionally validate layers and enable useproxy only where it is needed."""
    if not validate_connectivity:
        return spec, {"enabled": False}
    fixed = fix_app_connectivity(
        spec,
        public_origin=public_origin,
        timeout=timeout,
        backend_headers=client.user_headers(),
    )
    connectivity = dict(fixed["connectivity"])
    connectivity["enabled"] = True
    connectivity["changed_layers"] = fixed.get("changed_layers", [])
    return fixed["spec"], connectivity


def _trusted_request_identity_headers(ctx: Context) -> dict[str, str]:
    """Forward sec-* headers only when the MCP endpoint is behind a trusted gateway."""
    if not _trust_request_identity_headers():
        return {}
    try:
        request = ctx.request_context.request
    except ValueError:
        return {}
    headers = getattr(request, "headers", {}) if request is not None else {}
    trusted: dict[str, str] = {}
    for key in (
        "sec-username",
        "sec-firstname",
        "sec-lastname",
        "sec-org",
        "sec-roles",
    ):
        value = headers.get(key) if headers else None
        if value:
            trusted[key] = value
    return trusted


def _trust_request_identity_headers() -> bool:
    """Trust incoming sec-* headers only when explicitly enabled for gateway deployments."""
    return os.getenv("MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _allow_tool_identity_override() -> bool:
    """Return whether legacy username/organisation tool arguments are trusted."""
    return os.getenv("MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _publish_name(title: str) -> str:
    """Convert a title into a conservative public filename accepted by mviewer."""
    value = title.lower()
    replacements = {
        "à": "a",
        "á": "a",
        "â": "a",
        "ä": "a",
        "ç": "c",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ë": "e",
        "î": "i",
        "ï": "i",
        "ô": "o",
        "ö": "o",
        "ù": "u",
        "û": "u",
        "ü": "u",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    value = "".join(char if char.isalnum() or char == "_" else "_" for char in value)
    return value.strip("_")[:20] or "mviewer_app"


def _stateless_http_enabled() -> bool:
    """Return whether streamable-http should avoid server-side sessions."""
    value = os.getenv("MVIEWERSTUDIO_MCP_STATELESS_HTTP", "true").lower()
    return value in {"1", "true", "yes", "on"}


def main() -> None:
    """CLI entrypoint used by Docker Compose and local stdio launches."""
    parser = argparse.ArgumentParser(description="Run the MviewerStudio MCP server.")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=os.getenv("MCP_TRANSPORT", "stdio"),
    )
    parser.add_argument("--host", default=os.getenv("FASTMCP_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port", type=int, default=int(os.getenv("FASTMCP_PORT", "8030"))
    )
    args = parser.parse_args()
    create_mcp_server(host=args.host, port=args.port).run(transport=args.transport)


if __name__ == "__main__":
    main()
