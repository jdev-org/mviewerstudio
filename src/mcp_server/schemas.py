"""Structured payloads accepted by the MviewerStudio MCP tools.

Agents should describe the desired map as an `ApplicationSpec` dictionary. The
backend then validates defaults, normalizes common loose inputs, and preserves
unknown mviewer XML attributes through `extra` dictionaries.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4
import re
import unicodedata


def _slug(value: str, fallback: str) -> str:
    """Create a stable ASCII identifier from user-facing text."""
    normalized = unicodedata.normalize("NFKD", value or fallback)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9_]+", "_", ascii_value).strip("_").lower()
    return slug or fallback


def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, list):
        return ",".join(str(item) for item in value if item is not None)
    return str(value)


def _bool(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _float(value: Any, default: float) -> float:
    if value is None or value == "":
        return default
    return float(value)


def _center(value: Any) -> tuple[float, float]:
    if value is None:
        return (-307903.74898791354, 6141345.088741366)
    if isinstance(value, str):
        parts = value.split(",")
    else:
        parts = list(value)
    if len(parts) != 2:
        raise ValueError("center must contain exactly two coordinates")
    return (float(parts[0]), float(parts[1]))


def _application_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Accept common wrapper shapes emitted by MCP clients and inspectors."""
    for key in ("spec", "application_spec", "application", "structuredContent"):
        nested = data.get(key)
        if isinstance(nested, dict) and (nested.get("title") or nested.get("spec")):
            return _application_payload(nested)
    return data


@dataclass
class BaseLayerSpec:
    """Configuration for one mviewer baselayer."""

    id: str
    label: str
    title: str
    type: str
    url: str
    visible: bool = False
    thumbgallery: str = ""
    attribution: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BaseLayerSpec":
        if not data.get("id"):
            raise ValueError("baselayer.id is required")
        if not data.get("url"):
            raise ValueError(f"baselayer.url is required for {data['id']}")
        known = {
            "id",
            "label",
            "title",
            "type",
            "url",
            "visible",
            "thumbgallery",
            "attribution",
        }
        # Keep provider-specific mviewer attributes instead of rejecting them.
        extra = {k: v for k, v in data.items() if k not in known and v is not None}
        return cls(
            id=_text(data["id"]),
            label=_text(data.get("label"), _text(data["id"])),
            title=_text(data.get("title"), _text(data.get("label"), data["id"])),
            type=_text(data.get("type"), "OSM"),
            url=_text(data["url"]),
            visible=_bool(data.get("visible")),
            thumbgallery=_text(data.get("thumbgallery")),
            attribution=_text(data.get("attribution")),
            extra=extra,
        )


@dataclass
class LayerSpec:
    """Configuration for one operational mviewer layer."""

    id: str
    name: str
    type: str
    url: str
    template: str = ""
    template_url: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "LayerSpec":
        if not data.get("id"):
            raise ValueError("layer.id is required")
        if not data.get("url"):
            raise ValueError(f"layer.url is required for {data['id']}")
        layer_name = _text(data.get("name") or data.get("title"), _text(data["id"]))
        known = {
            "id",
            "name",
            "title",
            "type",
            "url",
            "template",
            "template_url",
            "extended_title",
            "bbox",
            "styles",
        }
        extra: dict[str, Any] = {}
        for key, value in data.items():
            if key in known or value is None:
                continue
            # Python identifiers cannot contain hyphens, but mviewer XML can.
            xml_key = "metadata-csw" if key == "metadata_csw" else key
            extra[xml_key] = _text(value) if isinstance(value, list) else value
        # Defaults mirror the frontend's usual WMS behavior so agents can send
        # concise layer descriptions without knowing every mviewer XML flag.
        extra.setdefault("visible", True)
        extra.setdefault("tiled", True)
        extra.setdefault("queryable", True)
        extra.setdefault("showintoc", True)
        if data.get("infoformat") is None:
            extra.setdefault("infoformat", "text/html")
        return cls(
            id=_text(data["id"]),
            name=layer_name,
            type=_text(data.get("type"), "wms"),
            url=_text(data["url"]),
            template=_text(data.get("template")),
            template_url=_text(data.get("template_url")),
            extra=extra,
        )


@dataclass
class GroupSpec:
    """A mviewer group containing layers inside a theme."""

    id: str
    name: str
    layers: list[LayerSpec] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "GroupSpec":
        name = _text(data.get("name") or data.get("title"), "Groupe")
        group_id = _text(data.get("id"), f"group_{_slug(name, 'group')}")
        return cls(
            id=group_id,
            name=name,
            layers=[LayerSpec.from_dict(layer) for layer in data.get("layers", [])],
        )


@dataclass
class ThemeSpec:
    """A mviewer theme with either direct layers or nested groups."""

    id: str
    name: str
    collapsed: bool = False
    icon: str = "fas fa-angle-right"
    layers: list[LayerSpec] = field(default_factory=list)
    groups: list[GroupSpec] = field(default_factory=list)
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ThemeSpec":
        name = _text(data.get("name") or data.get("title"), "Theme")
        theme_id = _text(data.get("id"), _slug(name, "theme"))
        known = {"id", "name", "title", "collapsed", "icon", "layers", "groups"}
        extra = {k: v for k, v in data.items() if k not in known and v is not None}
        return cls(
            id=theme_id,
            name=name,
            collapsed=_bool(data.get("collapsed")),
            icon=_text(data.get("icon"), "fas fa-angle-right"),
            layers=[LayerSpec.from_dict(layer) for layer in data.get("layers", [])],
            groups=[GroupSpec.from_dict(group) for group in data.get("groups", [])],
            extra=extra,
        )


@dataclass
class ExtensionSpec:
    """Configuration for one mviewer extension declaration."""

    type: str
    id: str = ""
    path: str = ""
    src: str = ""
    extra: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ExtensionSpec":
        extension_type = _text(data.get("type"), "component")
        known = {"type", "id", "path", "src"}
        extra = {k: v for k, v in data.items() if k not in known and v is not None}
        if extension_type == "component":
            if not data.get("id"):
                raise ValueError("extension.id is required for component extensions")
            if not data.get("path"):
                raise ValueError(f"extension.path is required for {data['id']}")
        if extension_type == "javascript" and not data.get("src"):
            raise ValueError("extension.src is required for javascript extensions")
        return cls(
            type=extension_type,
            id=_text(data.get("id")),
            path=_text(data.get("path")),
            src=_text(data.get("src")),
            extra=extra,
        )


@dataclass
class ApplicationSpec:
    """Top-level contract for generating a complete mviewer XML config."""

    title: str
    id: str = field(default_factory=lambda: uuid4().hex)
    description: str = ""
    keywords: str = ""
    creator: str = "anonymous"
    publisher: str = "public"
    date: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    relation: str = ""
    mviewer_version: str = "4.1"
    mviewerstudio_version: str = "4.3"
    logo: str = ""
    favicon: str = ""
    help: str = ""
    style: str = "css/themes/default.css"
    projection: str = "EPSG:3857"
    center: tuple[float, float] = field(
        default_factory=lambda: (-307903.74898791354, 6141345.088741366)
    )
    zoom: float = 7
    maxzoom: float = 20
    baselayers_style: str = "default"
    proxy_url: str = "proxy/?url="
    themes_mini: bool = False
    options: dict[str, bool] = field(default_factory=dict)
    search: dict[str, Any] = field(default_factory=dict)
    baselayers: list[BaseLayerSpec] = field(default_factory=list)
    themes: list[ThemeSpec] = field(default_factory=list)
    extensions: list[ExtensionSpec] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ApplicationSpec":
        data = _application_payload(data)
        if not data.get("title"):
            raise ValueError("title is required")
        baselayers = [
            BaseLayerSpec.from_dict(layer) for layer in data.get("baselayers", [])
        ]
        if not baselayers:
            baselayers = [default_osm_baselayer()]
        if not any(layer.visible for layer in baselayers):
            # mviewer needs at least one visible baselayer for a useful preview.
            baselayers[0].visible = True
        return cls(
            id=_text(data.get("id"), uuid4().hex),
            title=_text(data["title"]),
            description=_text(data.get("description"), "Created from MCP"),
            keywords=_text(data.get("keywords")),
            creator=_text(data.get("creator"), "anonymous"),
            publisher=_text(data.get("publisher"), "public"),
            date=_text(data.get("date"), datetime.now(timezone.utc).isoformat()),
            relation=_text(data.get("relation")),
            mviewer_version=_text(data.get("mviewer_version"), "4.1"),
            mviewerstudio_version=_text(data.get("mviewerstudio_version"), "4.3"),
            logo=_text(data.get("logo")),
            favicon=_text(data.get("favicon")),
            help=_text(data.get("help")),
            style=_text(data.get("style"), "css/themes/default.css"),
            projection=_text(data.get("projection"), "EPSG:3857"),
            center=_center(data.get("center")),
            zoom=_float(data.get("zoom"), 7),
            maxzoom=_float(data.get("maxzoom"), 20),
            baselayers_style=_text(data.get("baselayers_style"), "default"),
            proxy_url=_text(data.get("proxy_url"), "proxy/?url="),
            themes_mini=_bool(data.get("themes_mini")),
            options=dict(data.get("options", {})),
            search=dict(data.get("search", {})),
            baselayers=baselayers,
            themes=[ThemeSpec.from_dict(theme) for theme in data.get("themes", [])],
            extensions=[
                ExtensionSpec.from_dict(extension)
                for extension in data.get("extensions", [])
            ],
        )


def default_osm_baselayer() -> BaseLayerSpec:
    """Fallback baselayer used when an agent omits baselayers."""
    return BaseLayerSpec(
        id="osm",
        label="OpenStreetMap",
        title="OSM",
        type="OSM",
        url="https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        visible=True,
        thumbgallery="img/basemap/osm.png",
        attribution="OpenStreetMap contributors",
    )


def example_application_spec() -> dict[str, Any]:
    """Return a compact example useful for MCP docs, prompts and tests."""
    return {
        "title": "Demo MCP mviewer",
        "description": "Application creee depuis le serveur MCP MviewerStudio",
        "keywords": ["mcp", "mviewer", "demo"],
        "center": [-307903.74898791354, 6141345.088741366],
        "zoom": 7,
        "baselayers": [
            {
                "id": "osm",
                "label": "OpenStreetMap",
                "title": "OSM",
                "type": "OSM",
                "url": "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                "visible": True,
                "thumbgallery": "img/basemap/osm.png",
            }
        ],
        "themes": [
            {
                "id": "donnees",
                "name": "Donnees",
                "layers": [
                    {
                        "id": "sample_layer",
                        "name": "Couche exemple",
                        "type": "wms",
                        "url": "https://ows.region-bretagne.fr/geoserver/rb/wms",
                        "visible": True,
                        "queryable": True,
                    }
                ],
            }
        ],
    }
