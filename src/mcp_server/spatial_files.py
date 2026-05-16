"""Helpers for MCP-managed spatial resources stored with mviewer apps."""

from __future__ import annotations

from pathlib import Path
from typing import Any
import base64
import re
import unicodedata


DIRECT_MVIEWER_LAYER_TYPES = {
    "geojson": "geojson",
    "json": "geojson",
    "kml": "kml",
}


def decode_spatial_file_content(
    content: str = "",
    content_base64: str = "",
) -> bytes:
    """Decode either plain text content or base64 file content."""
    if content_base64:
        try:
            return base64.b64decode(content_base64, validate=True)
        except ValueError as error:
            raise ValueError("content_base64 is not valid base64") from error
    if content:
        return content.encode("utf-8")
    raise ValueError("content or content_base64 is required")


def spatial_file_response(
    stored_file: dict[str, Any],
    layer_name: str = "",
    layer_id: str = "",
) -> dict[str, Any]:
    """Return stored file metadata and an optional mviewer LayerSpec."""
    filename = str(stored_file.get("filename", ""))
    extension = str(stored_file.get("extension", "")).lower()
    result = {
        "stored_file": stored_file,
        "mviewer_supported_as_layer": extension in DIRECT_MVIEWER_LAYER_TYPES,
        "layer_spec": {},
        "warnings": [],
    }
    if extension not in DIRECT_MVIEWER_LAYER_TYPES:
        result["warnings"].append(
            "Le fichier est stocke avec la carte, mais mviewer ne le charge pas "
            "directement comme couche standard. Convertir en GeoJSON/KML ou "
            "utiliser une custom layer."
        )
        return result

    title = layer_name or Path(filename).stem.replace("_", " ").replace("-", " ")
    layer = {
        "id": layer_id or _slug(Path(filename).stem, "uploaded_layer"),
        "name": title,
        "type": DIRECT_MVIEWER_LAYER_TYPES[extension],
        "url": stored_file.get("filepath", ""),
        "visible": True,
        "queryable": True,
        "showintoc": True,
        "tiled": False,
    }
    result["layer_spec"] = layer
    return result


def _slug(value: str, fallback: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or fallback)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", ascii_value).strip("_").lower()
    return slug or fallback

