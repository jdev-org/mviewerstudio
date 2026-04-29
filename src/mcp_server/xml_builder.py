"""Serialize `ApplicationSpec` objects into mviewer XML configuration files.

This module is the main backend replacement for frontend XML assembly: callers
provide validated Python objects and this builder owns the exact XML shape that
mviewer and MviewerStudio expect.
"""

from __future__ import annotations

from typing import Any
import xml.etree.ElementTree as ET

from .schemas import ApplicationSpec, BaseLayerSpec, GroupSpec, LayerSpec, ThemeSpec


RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
DC_NS = "http://purl.org/dc/elements/1.1/"

ET.register_namespace("rdf", RDF_NS)
ET.register_namespace("dc", DC_NS)


def _bool(value: Any) -> str:
    """Serialize Python values using mviewer-compatible boolean strings."""
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value) if value is not None else ""


def _clean_attrs(attrs: dict[str, Any]) -> dict[str, str]:
    """Drop empty XML attributes and convert every value to text."""
    clean: dict[str, str] = {}
    for key, value in attrs.items():
        if value is None or value == "":
            continue
        clean[key] = _bool(value)
    return clean


def build_mviewer_xml(spec: ApplicationSpec) -> str:
    """Build a full mviewer XML document from an ApplicationSpec."""
    root = ET.Element(
        "config",
        {
            "mviewerversion": spec.mviewer_version,
            "mviewerstudioversion": spec.mviewerstudio_version,
        },
    )
    _append_metadata(root, spec)
    _append_application(root, spec)
    _append_mapoptions(root, spec)
    ET.SubElement(root, "proxy", _clean_attrs({"url": spec.proxy_url}))
    ET.SubElement(root, "searchparameters", _search_attrs(spec))
    _append_baselayers(root, spec)
    _append_themes(root, spec)
    xml = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    return xml.decode("utf-8")


def _append_metadata(root: ET.Element, spec: ApplicationSpec) -> None:
    """Append Dublin Core metadata used by MviewerStudio registration."""
    metadata = ET.SubElement(root, "metadata")
    rdf = ET.SubElement(metadata, f"{{{RDF_NS}}}RDF")
    description = ET.SubElement(
        rdf,
        f"{{{RDF_NS}}}Description",
        {f"{{{RDF_NS}}}about": "https://mviewer.github.io/mviewerstudio/"},
    )
    values = {
        "title": spec.title,
        "creator": spec.creator,
        "identifier": spec.id,
        "keywords": spec.keywords,
        "publisher": spec.publisher,
        "description": spec.description,
        "date": spec.date,
        "relation": spec.relation,
    }
    for key, value in values.items():
        node = ET.SubElement(description, f"{{{DC_NS}}}{key}")
        node.text = value
    for theme in spec.themes:
        subject = ET.SubElement(description, f"{{{DC_NS}}}subject")
        subject.text = theme.name


def _append_application(root: ET.Element, spec: ApplicationSpec) -> None:
    """Append global application options with conservative defaults."""
    defaults = {
        "exportpng": False,
        "showhelp": False,
        "coordinates": False,
        "measuretools": True,
        "mouseposition": False,
        "geoloc": False,
        "zoomtools": True,
        "initialextenttool": True,
        "togglealllayersfromtheme": False,
        "mapprint": False,
        "addlayerstools": False,
    }
    defaults.update(spec.options)
    attrs: dict[str, Any] = {
        "title": spec.title,
        "logo": spec.logo,
        "favicon": spec.favicon,
        "help": spec.help,
        "style": spec.style,
        "studio": "",
        **defaults,
    }
    ET.SubElement(root, "application", _clean_attrs(attrs))


def _append_mapoptions(root: ET.Element, spec: ApplicationSpec) -> None:
    """Append projection, center and zoom configuration."""
    center = f"{spec.center[0]},{spec.center[1]}"
    attrs = {
        "projection": spec.projection,
        "center": center,
        "zoom": spec.zoom,
        "maxzoom": spec.maxzoom,
    }
    ET.SubElement(root, "mapoptions", _clean_attrs(attrs))


def _search_attrs(spec: ApplicationSpec) -> dict[str, str]:
    """Merge default search behavior with caller-provided search options."""
    defaults: dict[str, Any] = {
        "bbox": False,
        "localities": False,
        "features": False,
        "static": False,
        "querymaponclick": False,
        "closeafterclick": False,
        "inputlabel": "",
    }
    defaults.update(spec.search)
    return _clean_attrs(defaults)


def _append_baselayers(root: ET.Element, spec: ApplicationSpec) -> None:
    """Append the configured mviewer basemap gallery."""
    baselayers = ET.SubElement(root, "baselayers", {"style": spec.baselayers_style})
    for layer in spec.baselayers:
        ET.SubElement(baselayers, "baselayer", _baselayer_attrs(layer))


def _baselayer_attrs(layer: BaseLayerSpec) -> dict[str, str]:
    """Convert a BaseLayerSpec into XML attributes."""
    attrs: dict[str, Any] = {
        "visible": layer.visible,
        "id": layer.id,
        "thumbgallery": layer.thumbgallery,
        "title": layer.title,
        "label": layer.label,
        "type": layer.type,
        "url": layer.url,
        "attribution": layer.attribution,
        **layer.extra,
    }
    return _clean_attrs(attrs)


def _append_themes(root: ET.Element, spec: ApplicationSpec) -> None:
    """Append themes, preserving the mviewer theme/group/layer hierarchy."""
    themes = ET.SubElement(root, "themes", {"mini": _bool(spec.themes_mini)})
    for theme in spec.themes:
        theme_node = ET.SubElement(themes, "theme", _theme_attrs(theme))
        for group in theme.groups:
            group_node = ET.SubElement(theme_node, "group", _group_attrs(group))
            for layer in group.layers:
                _append_layer(group_node, layer)
        for layer in theme.layers:
            _append_layer(theme_node, layer)


def _theme_attrs(theme: ThemeSpec) -> dict[str, str]:
    """Convert a ThemeSpec into XML attributes."""
    attrs: dict[str, Any] = {
        "id": theme.id,
        "name": theme.name,
        "collapsed": theme.collapsed,
        "icon": theme.icon,
        **theme.extra,
    }
    return _clean_attrs(attrs)


def _group_attrs(group: GroupSpec) -> dict[str, str]:
    """Convert a GroupSpec into XML attributes."""
    return _clean_attrs({"id": group.id, "name": group.name})


def _append_layer(parent: ET.Element, layer: LayerSpec) -> None:
    """Append one layer and its optional inline or external template."""
    layer_node = ET.SubElement(parent, "layer", _layer_attrs(layer))
    if layer.template_url:
        ET.SubElement(layer_node, "template", {"url": layer.template_url})
    elif layer.template:
        template = ET.SubElement(layer_node, "template")
        template.text = layer.template


def _layer_attrs(layer: LayerSpec) -> dict[str, str]:
    """Convert a LayerSpec into XML attributes."""
    attrs: dict[str, Any] = {
        "id": layer.id,
        "name": layer.name,
        "type": layer.type,
        "url": layer.url,
        **layer.extra,
    }
    return _clean_attrs(attrs)
