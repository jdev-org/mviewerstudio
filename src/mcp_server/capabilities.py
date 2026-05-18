"""Helpers for reading MviewerStudio frontend capabilities."""

from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .mcp_config import current_settings
from .network_policy import allowed_ogc_hosts
from .extensions import list_mviewer_extensions


def load_capabilities() -> dict[str, Any]:
    """Read the frontend configuration and expose agent-relevant sections."""
    settings = current_settings()
    data = _load_frontend_config()
    app_conf = data.get("app_conf", {})
    return {
        "studio_title": app_conf.get("studio_title"),
        "mviewer_version": app_conf.get("mviewer_version"),
        "mviewerstudio_version": app_conf.get("mviewerstudio_version"),
        "baselayers": app_conf.get("baselayers", {}),
        "data_providers": app_conf.get("data_providers", {}),
        "default_layer_params": app_conf.get("default_params", {}).get("layer", {}),
        "extensions": list_mviewer_extensions(include_advanced=True),
        "mcp_allowed_ogc_hosts": allowed_ogc_hosts(),
        "inline_data_policy": {
            "max_bytes": settings.inline_data_max_bytes,
            "recommendation": (
                "Use upload_spatial_file_to_mviewer_app for generated GeoJSON/KML "
                "larger than this limit, then insert the returned layer_spec."
            ),
        },
        "upload_size_policy": {
            "xml_max_bytes": settings.xml_max_bytes,
            "spatial_file_max_bytes": settings.spatial_file_max_bytes,
            "help_file_max_bytes": settings.help_file_max_bytes,
        },
    }


def load_map_catalog() -> dict[str, Any]:
    """Read only the catalog sections used to build maps from intent."""
    data = _load_frontend_config()
    app_conf = data.get("app_conf", {})
    return {
        "baselayers": app_conf.get("baselayers", {}),
        "data_providers": app_conf.get("data_providers", {}),
    }


def find_baselayer(query: str = "ortho", visible: bool = True) -> dict[str, Any]:
    """Return one configured baselayer as a BaseLayerSpec-compatible dict."""
    baselayers = load_map_catalog().get("baselayers", {})
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


def _load_frontend_config() -> dict[str, Any]:
    settings = current_settings()
    config_path = Path(
        settings.mviewerstudio_config_path
        or Path(__file__).resolve().parents[1] / "static" / "config.json"
    )
    with config_path.open(encoding="utf-8") as config_file:
        return json.load(config_file)
