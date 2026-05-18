"""Parse existing mviewer XML configs into MCP ApplicationSpec dictionaries."""

from __future__ import annotations

from typing import Any
import xml.etree.ElementTree as ET


RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
DC_NS = "http://purl.org/dc/elements/1.1/"


def mviewer_xml_to_spec(xml: str) -> dict[str, Any]:
    """Convert a stored mviewer XML config to an ApplicationSpec-compatible dict."""
    root = ET.fromstring(xml)
    metadata = _metadata(root)
    application = root.find("./application")
    mapoptions = root.find("./mapoptions")
    proxy = root.find("./proxy")
    search = root.find("./searchparameters")
    baselayers = root.find("./baselayers")
    themes = root.find("./themes")
    extensions = root.find("./extensions")

    spec: dict[str, Any] = {
        "id": metadata.get("identifier", ""),
        "title": metadata.get("title") or _attr(application, "title"),
        "description": metadata.get("description", ""),
        "keywords": metadata.get("keywords", ""),
        "creator": metadata.get("creator", ""),
        "publisher": metadata.get("publisher", ""),
        "date": metadata.get("date", ""),
        "relation": metadata.get("relation", ""),
        "mviewer_version": root.get("mviewerversion", "4.1"),
        "mviewerstudio_version": root.get("mviewerstudioversion", "4.3"),
        "logo": _attr(application, "logo"),
        "favicon": _attr(application, "favicon"),
        "help": _attr(application, "help"),
        "style": _attr(application, "style", "css/themes/default.css"),
        "projection": _attr(mapoptions, "projection", "EPSG:3857"),
        "center": _center(_attr(mapoptions, "center")),
        "zoom": _number(_attr(mapoptions, "zoom"), 7),
        "maxzoom": _number(_attr(mapoptions, "maxzoom"), 20),
        "baselayers_style": _attr(baselayers, "style", "default"),
        "proxy_url": _attr(proxy, "url", "proxy/?url="),
        "themes_mini": _bool(_attr(themes, "mini")),
        "options": _extra_attrs(
            application,
            {"title", "logo", "favicon", "help", "style", "studio"},
        ),
        "search": _attrs(search),
        "baselayers": [_baselayer(layer) for layer in _children(baselayers, "baselayer")],
        "themes": [_theme(theme) for theme in _children(themes, "theme")],
        "extensions": [
            _extension(extension)
            for extension in _children(extensions, "extension")
        ],
    }
    return spec


def _metadata(root: ET.Element) -> dict[str, str]:
    description = root.find(f".//{{{RDF_NS}}}Description")
    if description is None:
        return {}
    values: dict[str, str] = {}
    for child in list(description):
        values[_local_name(child.tag)] = child.text or ""
    return values


def _theme(node: ET.Element) -> dict[str, Any]:
    known = {"id", "name", "collapsed", "icon"}
    theme = {
        "id": node.get("id", ""),
        "name": node.get("name", ""),
        "collapsed": _bool(node.get("collapsed", "false")),
        "icon": node.get("icon", "fas fa-angle-right"),
        **_extra_attrs(node, known),
    }
    layers = []
    groups = []
    for child in list(node):
        if _local_name(child.tag) == "layer":
            layers.append(_layer(child))
        if _local_name(child.tag) == "group":
            groups.append(_group(child))
    theme["layers"] = layers
    theme["groups"] = groups
    return theme


def _group(node: ET.Element) -> dict[str, Any]:
    return {
        "id": node.get("id", ""),
        "name": node.get("name", ""),
        "layers": [_layer(layer) for layer in _children(node, "layer")],
    }


def _layer(node: ET.Element) -> dict[str, Any]:
    known = {"id", "name", "type", "url"}
    layer = {
        "id": node.get("id", ""),
        "name": node.get("name", ""),
        "type": node.get("type", "wms"),
        "url": node.get("url", ""),
        **_extra_attrs(node, known),
    }
    template = _first_child(node, "template")
    if template is not None:
        if template.get("url"):
            layer["template_url"] = template.get("url", "")
        elif template.text:
            layer["template"] = template.text
    return layer


def _baselayer(node: ET.Element) -> dict[str, Any]:
    known = {"id", "label", "title", "type", "url", "visible", "thumbgallery", "attribution"}
    return {
        "id": node.get("id", ""),
        "label": node.get("label", ""),
        "title": node.get("title", ""),
        "type": node.get("type", ""),
        "url": node.get("url", ""),
        "visible": _bool(node.get("visible", "false")),
        "thumbgallery": node.get("thumbgallery", ""),
        "attribution": node.get("attribution", ""),
        **_extra_attrs(node, known),
    }


def _extension(node: ET.Element) -> dict[str, Any]:
    known = {"type", "id", "path", "src"}
    return {
        "type": node.get("type", ""),
        "id": node.get("id", ""),
        "path": node.get("path", ""),
        "src": node.get("src", ""),
        **_extra_attrs(node, known),
    }


def _extra_attrs(node: ET.Element | None, known: set[str]) -> dict[str, str]:
    return {key: value for key, value in _attrs(node).items() if key not in known}


def _attrs(node: ET.Element | None) -> dict[str, str]:
    return dict(node.attrib) if node is not None else {}


def _children(node: ET.Element | None, name: str) -> list[ET.Element]:
    if node is None:
        return []
    return [child for child in list(node) if _local_name(child.tag) == name]


def _first_child(node: ET.Element | None, name: str) -> ET.Element | None:
    children = _children(node, name)
    return children[0] if children else None


def _attr(node: ET.Element | None, name: str, default: str = "") -> str:
    return node.get(name, default) if node is not None else default


def _center(value: str) -> list[float]:
    if not value:
        return [-307903.74898791354, 6141345.088741366]
    parts = value.split(",")
    if len(parts) != 2:
        return [-307903.74898791354, 6141345.088741366]
    return [float(parts[0]), float(parts[1])]


def _number(value: str, default: float) -> float:
    return float(value) if value not in {"", None} else default


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).lower() in {"1", "true", "yes", "on"}


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]
