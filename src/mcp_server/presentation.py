"""Presentation helpers for LLM-generated mviewer vector layers."""

from __future__ import annotations

from html import escape
from typing import Any
import json
import re


MVIEWER_GEOJSON_STYLES = {
    "elsStyle": "Style vectoriel turquoise generique pour points, lignes et polygones.",
    "highlight": "Trait rouge epais adapte aux lignes et contours.",
    "circle1": "Point rouge cerne de noir.",
    "crossStyle": "Croix rouge pour points.",
    "sensorPoint": "Point capteur avec rendu dynamique.",
    "sensorPolygon": "Polygone capteur avec rendu dynamique.",
}

STYLE_PROPERTY_KEYS = {
    "_style",
    "color",
    "dasharray",
    "dash_array",
    "fill",
    "fillcolor",
    "fill-color",
    "fillopacity",
    "fill-opacity",
    "icon",
    "linecolor",
    "line-color",
    "linewidth",
    "line-width",
    "marker-color",
    "marker-size",
    "marker-symbol",
    "opacity",
    "pointradius",
    "point-radius",
    "radius",
    "stroke",
    "strokecolor",
    "stroke-color",
    "strokeopacity",
    "stroke-opacity",
    "strokeweight",
    "stroke-weight",
    "stroke_width",
    "stroke-width",
    "style",
    "weight",
    "width",
}

TOURISM_TEMPLATE_FIELDS = [
    ("name", "Nom"),
    ("description", "Description"),
    ("category", "Categorie"),
    ("stage", "Etape"),
    ("distance", "Distance"),
    ("date", "Date"),
    ("website", "Site web"),
]


def build_public_feature_template(
    title_field: str = "name",
    description_field: str = "description",
    fields: list[str] | None = None,
    preset: str = "tourism",
) -> dict[str, Any]:
    """Return a Mustache template suitable for public/tourism feature info."""
    normalized_fields = _template_fields(fields, title_field, description_field, preset)
    rows = "\n".join(
        [
            f'  {{{{#{field}}}}}<dt>{label}</dt><dd>{{{{{field}}}}}</dd>{{{{/{field}}}}}'
            for field, label in normalized_fields
            if field not in {title_field, description_field}
        ]
    )
    template = f"""<li class="item">
  {{{{#{title_field}}}}}<h4>{{{{{title_field}}}}}</h4>{{{{/{title_field}}}}}
  {{{{#{description_field}}}}}<p>{{{{{description_field}}}}}</p>{{{{/{description_field}}}}}
  <dl>
{rows}
  </dl>
</li>"""
    return {
        "template": template,
        "extension": ".mst",
        "recommended_layer_attributes": {
            "queryable": True,
            "infoformat": "text/html",
        },
        "usage": (
            "Stocker ce contenu avec store_layer_template, puis utiliser le "
            "template_url retourne dans la couche mviewer."
        ),
    }


def build_public_help_page(
    title: str,
    introduction: str = "",
    sections: list[dict[str, Any]] | None = None,
    audience: str = "grand_public",
) -> dict[str, Any]:
    """Return a simple static HTML help/home page for a mviewer modal."""
    titlehelp = title or "A propos de la carte"
    safe_title = escape(titlehelp)
    intro = escape(introduction or "")
    section_blocks = "\n".join(_help_section(section) for section in sections or [])
    if not section_blocks and intro:
        section_blocks = f"<section><p>{intro}</p></section>"
    html = f"""<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>{safe_title}</title>
  </head>
  <body>
    <main class="mviewer-help-page">
      <h1>{safe_title}</h1>
      {f"<p>{intro}</p>" if intro else ""}
      {section_blocks}
    </main>
  </body>
</html>"""
    return {
        "html": html,
        "filename": "help.html",
        "application_patch": {
            "options": {
                "showhelp": True,
                "titlehelp": titlehelp,
                "iconhelp": "fas fa-home",
            }
        },
        "audience": audience,
        "usage": (
            "Stocker ce contenu avec upload_mviewer_help_page_to_app, puis "
            "appliquer application_patch.help et application_patch.options au "
            "ApplicationSpec."
        ),
    }


def recommend_mviewer_geojson_style(
    geometry_type: str = "",
    audience: str = "grand_public",
) -> dict[str, Any]:
    """Return mviewer-compatible style guidance for GeoJSON/KML layers."""
    style = _recommended_style(geometry_type)
    return {
        "style": style,
        "layer_patch": {"style": style},
        "available_builtin_styles": MVIEWER_GEOJSON_STYLES,
        "warning": (
            "mviewer n'applique pas la symbologie placee dans les proprietes "
            "GeoJSON. Pour une couche GeoJSON, utiliser l'attribut XML "
            "style avec un nom present dans mviewer.featureStyles."
        ),
        "audience": audience,
        "custom_style_note": (
            "Un style vraiment sur mesure necessite d'ajouter une fonction "
            "mviewer.featureStyles cote mviewer, ou une custom layer."
        ),
    }


def sanitize_geojson_for_mviewer(content: str | bytes) -> dict[str, Any]:
    """Remove styling-only properties from a GeoJSON FeatureCollection."""
    text = content.decode("utf-8") if isinstance(content, bytes) else content
    data = json.loads(text)
    removed: dict[str, int] = {}
    feature_count = 0
    for feature in _iter_features(data):
        feature_count += 1
        properties = feature.get("properties")
        if not isinstance(properties, dict):
            continue
        for key in list(properties):
            if _is_style_property(key):
                properties.pop(key)
                removed[key] = removed.get(key, 0) + 1
    sanitized = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    return {
        "content": sanitized,
        "removed_style_properties": removed,
        "feature_count": feature_count,
        "changed": bool(removed),
        "warning": (
            "Les proprietes de style GeoJSON ont ete retirees pour eviter "
            "qu'elles apparaissent dans les templates mviewer. Declarer le "
            "style avec l'attribut de couche 'style'."
        )
        if removed
        else "",
    }


def safe_help_page_response(
    stored_file: dict[str, Any],
    title: str = "",
    show_on_startup: bool = True,
) -> dict[str, Any]:
    """Return stored help metadata and the ApplicationSpec patch to apply."""
    titlehelp = title or "Informations"
    return {
        "stored_file": stored_file,
        "application_patch": {
            "help": stored_file.get("filepath", ""),
            "options": {
                "showhelp": show_on_startup,
                "titlehelp": titlehelp,
                "iconhelp": "fas fa-home",
            },
        },
        "usage": (
            "Fusionner application_patch dans l'ApplicationSpec avant "
            "preview_mviewer_app ou publish_mviewer_app. Le fichier est stocke "
            "dans help/ avec la carte et sera copie lors de la publication."
        ),
    }


def validate_static_help_html(content: str | bytes) -> bytes:
    """Reject active HTML before uploading a help page through the MCP."""
    data = content if isinstance(content, bytes) else content.encode("utf-8")
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ValueError("Help page must be UTF-8 encoded") from error
    lowered = text.lower()
    forbidden = (
        "<script",
        "<iframe",
        "<object",
        "<embed",
        "<form",
        "<base",
        "http-equiv",
        "javascript:",
    )
    if any(value in lowered for value in forbidden):
        raise ValueError("Help page contains forbidden active HTML")
    if re.search(r"\son[a-z0-9_-]+\s*=", lowered):
        raise ValueError("Help page contains forbidden event attributes")
    return data


def _template_fields(
    fields: list[str] | None,
    title_field: str,
    description_field: str,
    preset: str,
) -> list[tuple[str, str]]:
    values: list[tuple[str, str]] = []
    seen: set[str] = set()
    defaults = TOURISM_TEMPLATE_FIELDS if preset == "tourism" else []
    for field, label in [(title_field, "Titre"), (description_field, "Description")]:
        if field and field not in seen:
            values.append((field, label))
            seen.add(field)
    for field, label in defaults:
        if field and field not in seen:
            values.append((field, label))
            seen.add(field)
    for field in fields or []:
        if field and field not in seen:
            values.append((field, field.replace("_", " ").title()))
            seen.add(field)
    return values


def _help_section(section: dict[str, Any]) -> str:
    title = escape(str(section.get("title") or ""))
    body = escape(str(section.get("body") or section.get("content") or ""))
    items = section.get("items") or []
    item_nodes = "".join(f"<li>{escape(str(item))}</li>" for item in items)
    list_node = f"<ul>{item_nodes}</ul>" if item_nodes else ""
    return f"""<section>
        {f"<h2>{title}</h2>" if title else ""}
        {f"<p>{body}</p>" if body else ""}
        {list_node}
      </section>"""


def _recommended_style(geometry_type: str) -> str:
    normalized = geometry_type.lower()
    if "point" in normalized:
        return "circle1"
    if "line" in normalized or "route" in normalized or "parcours" in normalized:
        return "highlight"
    return "elsStyle"


def _iter_features(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, dict):
        return []
    if data.get("type") == "FeatureCollection" and isinstance(data.get("features"), list):
        return [feature for feature in data["features"] if isinstance(feature, dict)]
    if data.get("type") == "Feature":
        return [data]
    return []


def _is_style_property(key: str) -> bool:
    normalized = key.strip().lower()
    return normalized in STYLE_PROPERTY_KEYS or normalized.startswith("style_")
