"""Plain-language helpers for creating simple mviewer applications."""

from __future__ import annotations

from pathlib import Path
from typing import Any
import json
import os
import re

from .geo_tools import geocode_location
from .map_tools import suggest_mviewer_tools_for_intent
from .mcp_config import load_mcp_config
from .ogc_tools import search_wms_layers


load_mcp_config()


def app_spec_from_intent(
    intent: str,
    title: str = "",
    location: str = "",
    baselayer_query: str = "plan",
    max_layers: int = 3,
    audience: str = "grand_public",
    tool_preset: str = "",
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Build a conservative ApplicationSpec from a non-technical user request."""
    if not intent.strip():
        raise ValueError("intent is required")

    warnings: list[str] = []
    effective_title = title.strip() or _title_from_intent(intent)
    effective_location = location.strip() or _location_from_intent(intent)
    tool_recommendation = suggest_mviewer_tools_for_intent(
        intent=intent,
        audience=audience,
        preset=tool_preset,
    )
    spec: dict[str, Any] = {
        "title": effective_title,
        "description": f"Carte creee depuis la demande : {intent.strip()}",
        "keywords": _keywords_from_intent(intent),
        "baselayers": [_find_baselayer(query=baselayer_query, visible=True)],
        "themes": [],
        "options": tool_recommendation["recommended"],
        "search": {
            "localities": True,
            "bbox": True,
            "inputlabel": "Rechercher une adresse ou une commune",
        },
    }

    geocoded_location = None
    if effective_location:
        matches = geocode_location(effective_location, limit=1)
        if matches:
            geocoded_location = matches[0]
            spec["center"] = geocoded_location["center"]
            spec["projection"] = geocoded_location["projection"]
            spec["zoom"] = 13
        else:
            warnings.append(f"Lieu non trouve : {effective_location}")

    layers = discover_layers_for_intent(intent, max_layers=max_layers)
    if layers:
        spec["themes"] = [
            {
                "id": "donnees",
                "name": "Donnees utiles",
                "collapsed": False,
                "layers": [
                    public_layer(layer, visible=index == 0)
                    for index, layer in enumerate(layers)
                ],
            }
        ]
    else:
        warnings.append(
            "Aucune couche WMS pertinente n'a ete trouvee dans les fournisseurs configures."
        )

    choices = {
        "intent": intent,
        "location": effective_location,
        "geocoded_location": geocoded_location,
        "baselayer_query": baselayer_query,
        "selected_layers": layers,
        "tool_recommendation": tool_recommendation,
        "warnings": warnings,
    }
    return spec, choices


def discover_layers_for_intent(intent: str, max_layers: int = 3) -> list[dict[str, Any]]:
    """Search configured WMS providers with simple intent-derived keywords."""
    providers = _load_capabilities().get("data_providers", {}).get("wms", [])
    keywords = _search_terms_from_intent(intent)
    selected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for keyword in keywords:
        for provider in providers:
            url = provider.get("url") if isinstance(provider, dict) else ""
            if not url:
                continue
            try:
                candidates = search_wms_layers(url, keyword=keyword, limit=max_layers)
            except Exception:
                continue
            for layer in candidates:
                key = f"{layer.get('url')}#{layer.get('id')}"
                if key in seen:
                    continue
                seen.add(key)
                selected.append(layer)
                if len(selected) >= max(1, max_layers):
                    return selected
    return selected


def public_layer(layer: dict[str, Any], visible: bool = True) -> dict[str, Any]:
    """Convert a discovered technical layer into a readable default layer config."""
    title = layer.get("title") or layer.get("name") or layer.get("id")
    result = {
        "id": layer.get("id"),
        "name": _human_label(str(title)),
        "title": _human_label(str(title)),
        "type": layer.get("type", "wms"),
        "url": layer.get("url"),
        "visible": visible,
        "queryable": bool(layer.get("queryable", True)),
        "tiled": True,
        "showintoc": True,
        "infoformat": "text/html",
    }
    for key in (
        "metadata",
        "metadata_csw",
        "attribution",
        "bbox",
        "styles",
        "extended_title",
    ):
        value = layer.get(key)
        if value:
            result[key] = value
    return result


def _load_capabilities() -> dict[str, Any]:
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
        "baselayers": app_conf.get("baselayers", {}),
        "data_providers": app_conf.get("data_providers", {}),
    }


def _find_baselayer(query: str = "ortho", visible: bool = True) -> dict[str, Any]:
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


def _title_from_intent(intent: str) -> str:
    """Produce a short user-facing title from a plain-language request."""
    cleaned = re.sub(r"\s+", " ", intent.strip())
    cleaned = re.sub(
        r"^(je veux|j'aimerais|cr[eé]e?r?|faire|montre[rz]?)\s+",
        "",
        cleaned,
        flags=re.I,
    )
    if len(cleaned) > 80:
        cleaned = cleaned[:77].rstrip() + "..."
    return cleaned[:1].upper() + cleaned[1:] if cleaned else "Carte mviewer"


def _location_from_intent(intent: str) -> str:
    """Extract a likely French location from common natural-language patterns."""
    pattern = r"(?:autour de|près de|pres de|proche de|sur|à|a)\s+([\wÀ-ÿ' -]{2,60})"
    match = re.search(pattern, intent, flags=re.I)
    if not match:
        return ""
    value = re.split(
        r"\s+(?:avec|pour|montr|affich|sur le theme|sur la thématique)\b",
        match.group(1),
        maxsplit=1,
        flags=re.I,
    )[0]
    return value.strip(" .,;")


def _keywords_from_intent(intent: str) -> str:
    return ",".join(_search_terms_from_intent(intent)[:6])


def _search_terms_from_intent(intent: str) -> list[str]:
    """Return broad search terms, keeping the original intent as a last resort."""
    stopwords = {
        "avec",
        "autour",
        "carte",
        "dans",
        "des",
        "donnees",
        "données",
        "faire",
        "afficher",
        "creer",
        "créer",
        "pour",
        "les",
        "une",
        "des",
        "montrer",
        "pres",
        "près",
        "sur",
        "souhaite",
        "veux",
        "voir",
    }
    words = [
        word.strip("' ")
        for word in re.findall(r"[\wÀ-ÿ']+", intent.lower())
        if len(word.strip("' ")) > 2 and word.strip("' ") not in stopwords
    ]
    terms: list[str] = []
    for word in words:
        if word not in terms:
            terms.append(word)
    if intent.strip() and intent.strip() not in terms:
        terms.append(intent.strip())
    return terms or [intent.strip()]


def _human_label(value: str) -> str:
    value = value.replace("_", " ").replace(":", " - ")
    value = re.sub(r"\s+", " ", value).strip()
    return value[:1].upper() + value[1:] if value else value
