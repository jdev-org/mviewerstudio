"""Catalog and helpers for mviewer addons exposed through MCP."""

from __future__ import annotations

from pathlib import Path
from typing import Any
import copy
import json
import re

from .mcp_config import current_settings


CURATED_EXTENSION_METADATA: dict[str, dict[str, Any]] = {
    "fullscreen": {
        "label": "Plein ecran",
        "description": "Ajoute un bouton plein ecran simple.",
        "use_cases": ["consultation", "presentation", "grand public"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "simple",
    },
    "layerfilter": {
        "label": "Recherche dans les couches",
        "description": "Filtre les themes, groupes et couches visibles dans le panneau.",
        "use_cases": ["nombreuses couches", "consultation", "navigation"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "simple",
    },
    "print": {
        "label": "Impression avancee",
        "description": "Ajoute un gestionnaire d'impression avec mise en page.",
        "use_cases": ["rapport", "partage", "communication", "terrain"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "intermediaire",
        "configuration_notes": [
            "Verifier addons/print/config.json pour le logo, les informations proprietaire et les layouts."
        ],
    },
    "fileimport": {
        "label": "Import de fichiers",
        "description": "Permet d'importer des fichiers locaux cote navigateur.",
        "use_cases": ["ajout de donnees", "atelier", "expert"],
        "audiences": ["expert"],
        "complexity": "intermediaire",
        "warnings": [
            "A eviter pour une carte grand public si l'objectif est une interface tres simple."
        ],
    },
    "panoramax": {
        "label": "Photos Panoramax",
        "description": "Affiche les photos Panoramax proches de la carte.",
        "use_cases": ["terrain", "tourisme", "voirie", "patrimoine"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "intermediaire",
    },
    "trackview": {
        "label": "Parcours GPX",
        "description": "Visualise des parcours GPX avec profil et informations de trace.",
        "use_cases": ["randonnee", "course", "nautique", "tourisme", "parcours"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "avance",
        "configuration_notes": [
            "Necessite une configuration parcours dans addons/trackview/config.json."
        ],
    },
    "filter": {
        "label": "Filtres attributaires avances",
        "description": "Ajoute un panneau de filtres configurables par couche.",
        "use_cases": ["analyse", "recherche", "filtrer"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "avance",
        "configuration_notes": [
            "Necessite de renseigner les layerId et champs filtrables dans config.json."
        ],
    },
    "stats": {
        "label": "Statistiques",
        "description": "Affiche des indicateurs calcules sur des couches.",
        "use_cases": ["indicateurs", "tableau de bord", "analyse"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "avance",
        "configuration_notes": [
            "Necessite de renseigner les layerId, champs et operateurs dans config.json."
        ],
    },
    "label": {
        "label": "Etiquettes",
        "description": "Configure des labels sur des couches vectorielles.",
        "use_cases": ["nommer", "etiquette", "presentation"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "intermediaire",
        "configuration_notes": [
            "Necessite une correspondance layerId/champ dans config.json."
        ],
    },
    "zoomToArea": {
        "label": "Zoom vers un territoire",
        "description": "Ajoute une liste de territoires et zoome sur la zone choisie.",
        "use_cases": ["territoire", "commune", "selection", "navigation"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "intermediaire",
        "configuration_notes": [
            "Necessite une source GeoJSON/WFS de zones dans config.json."
        ],
    },
    "streetview": {
        "label": "Street View",
        "description": "Ouvre une vue immersive externe depuis les coordonnees carte.",
        "use_cases": ["terrain", "voirie", "inspection"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "intermediaire",
    },
    "isochroneAddon": {
        "label": "Isochrone",
        "description": "Calcule des zones accessibles selon un temps ou une distance.",
        "use_cases": ["accessibilite", "mobilite", "temps de parcours"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "avance",
    },
    "MapFeatureSelector": {
        "label": "Selection d'entites",
        "description": "Aide a selectionner des entites depuis une source de dallage.",
        "use_cases": ["selection", "atelier", "analyse"],
        "audiences": ["expert"],
        "complexity": "avance",
    },
    "logo": {
        "label": "Logo",
        "description": "Affiche un logo ou bloc visuel sur la carte.",
        "use_cases": ["marque", "communication"],
        "audiences": ["grand_public", "non_specialiste", "expert"],
        "complexity": "simple",
    },
    "graph3d": {
        "label": "Graphique 3D",
        "description": "Affiche un composant graphique 3D.",
        "use_cases": ["visualisation", "analyse"],
        "audiences": ["expert"],
        "complexity": "avance",
    },
    "seasons-selector": {
        "label": "Selection de saison",
        "description": "Pilote des couches temporelles par saison.",
        "use_cases": ["temps", "saison", "littoral", "satellite"],
        "audiences": ["non_specialiste", "expert"],
        "complexity": "avance",
    },
}


def list_mviewer_extensions(
    query: str = "",
    include_advanced: bool = True,
) -> dict[str, Any]:
    """Return locally installed mviewer addons that MCP can declare in XML."""
    catalog = _extension_catalog()
    filtered = []
    lowered = query.lower().strip()
    for extension in catalog:
        if not include_advanced and extension.get("complexity") == "avance":
            continue
        haystack = " ".join(
            [
                extension.get("id", ""),
                extension.get("label", ""),
                extension.get("description", ""),
                " ".join(extension.get("use_cases", [])),
            ]
        ).lower()
        if lowered and lowered not in haystack:
            continue
        filtered.append(extension)
    return {
        "addons_path": str(_addons_path()),
        "extension_count": len(filtered),
        "extensions": filtered,
        "xml_shape": {
            "component": '<extension type="component" id="fullscreen" path="addons"/>',
            "javascript": '<extension type="javascript" src="path/to/script.js"/>',
        },
        "best_practices": [
            "Copier l'extension dans le repertoire de la carte avant de modifier son config.json.",
            "Declarer ensuite le chemin local retourne par copy_mviewer_extension_to_app.",
            "Garder les addons sources dans le repertoire mviewer addons ou dans un repertoire versionne dedie.",
        ],
    }


def suggest_mviewer_extensions(
    intent: str,
    audience: str = "grand_public",
) -> dict[str, Any]:
    """Recommend installed mviewer addons from a business-oriented intent."""
    catalog = _extension_catalog()
    lowered = intent.lower()
    recommendations: list[dict[str, Any]] = []
    for extension in catalog:
        score = _score_extension(extension, lowered, audience)
        if score <= 0:
            continue
        item = copy.deepcopy(extension)
        item["score"] = score
        item["extension_spec"] = extension_spec(item["id"])
        recommendations.append(item)
    recommendations.sort(key=lambda item: (-item["score"], item["id"]))
    return {
        "audience": audience,
        "recommendations": recommendations[:5],
        "warnings": _extension_warnings(recommendations[:5], audience),
    }


def apply_mviewer_extensions(
    spec: dict[str, Any],
    extension_ids: list[str],
    path: str = "addons",
) -> dict[str, Any]:
    """Return a copied ApplicationSpec with selected component extensions added."""
    catalog_by_id = {extension["id"]: extension for extension in _extension_catalog()}
    updated = copy.deepcopy(spec)
    extensions = list(updated.get("extensions", []))
    existing = {
        (
            extension.get("type", "component"),
            extension.get("id", ""),
            extension.get("path", ""),
            extension.get("src", ""),
        )
        for extension in extensions
        if isinstance(extension, dict)
    }
    added: list[dict[str, Any]] = []
    warnings: list[str] = []
    for extension_id in extension_ids:
        if extension_id not in catalog_by_id:
            raise ValueError(f"Unknown or unavailable mviewer extension: {extension_id}")
        extension = extension_spec(extension_id, path=path)
        key = (
            extension.get("type", "component"),
            extension.get("id", ""),
            extension.get("path", ""),
            extension.get("src", ""),
        )
        if key in existing:
            continue
        extensions.append(extension)
        existing.add(key)
        added.append(extension)
        metadata = catalog_by_id[extension_id]
        warnings.extend(metadata.get("warnings", []))
        warnings.extend(metadata.get("configuration_notes", []))
    updated["extensions"] = extensions
    return {
        "spec": updated,
        "added_extensions": added,
        "warnings": warnings,
        "maintainability": (
            "Les extensions sont referencees dans l'ApplicationSpec, tandis que "
            "leur code et leur config.json restent dans le repertoire addons "
            "versionne avec mviewer."
        ),
    }


def extension_spec(extension_id: str, path: str = "addons") -> dict[str, str]:
    """Return the XML-ready ApplicationSpec fragment for one component addon."""
    return {"type": "component", "id": extension_id, "path": path}


def _extension_catalog() -> list[dict[str, Any]]:
    addons_path = _addons_path()
    installed_ids = _installed_addon_ids(addons_path)
    catalog: list[dict[str, Any]] = []
    for extension_id in installed_ids:
        config = _read_json(addons_path / extension_id / "config.json")
        metadata = copy.deepcopy(CURATED_EXTENSION_METADATA.get(extension_id, {}))
        entry: dict[str, Any] = {
            "id": extension_id,
            "type": "component",
            "path": "addons",
            "installed": True,
            "config_path": str(addons_path / extension_id / "config.json"),
            "target": config.get("target", ""),
            "js": config.get("js", []),
            "css": config.get("css", ""),
            "html": config.get("html", ""),
            "has_options": bool(config.get("options")),
            "config_options_keys": _option_keys(config.get("options")),
            "label": _label(extension_id),
            "description": "Extension mviewer installee localement.",
            "use_cases": [],
            "audiences": ["expert"],
            "complexity": "intermediaire",
            "warnings": [],
            "configuration_notes": [],
        }
        entry.update(metadata)
        entry["readme_summary"] = _readme_summary(addons_path / extension_id)
        catalog.append(entry)
    return sorted(catalog, key=lambda item: item["id"].lower())


def _addons_path() -> Path:
    configured = current_settings().mviewer_addons_path
    if configured:
        return Path(configured)
    current = Path(__file__).resolve()
    candidates = [
        current.parents[3] / "mviewer" / "addons",
        current.parents[2].parent / "mviewer" / "addons",
        Path.cwd().parent / "mviewer" / "addons",
        Path("/usr/share/nginx/html/mviewer/addons"),
        Path("/var/www/mviewer/addons"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return candidates[0]


def _installed_addon_ids(addons_path: Path) -> list[str]:
    if not addons_path.exists():
        return []
    return sorted(
        child.name
        for child in addons_path.iterdir()
        if child.is_dir() and (child / "config.json").exists()
    )


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open(encoding="utf-8") as config_file:
            payload = json.load(config_file)
    except (OSError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _readme_summary(addon_path: Path) -> str:
    for name in ("README.md", "readme.md"):
        path = addon_path / name
        if not path.exists():
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        for line in content.splitlines():
            cleaned = line.strip(" #\t")
            if cleaned:
                return cleaned[:240]
    return ""


def _option_keys(options: Any) -> list[str]:
    if not isinstance(options, dict):
        return []
    return sorted(str(key) for key in options)


def _label(extension_id: str) -> str:
    return re.sub(r"[-_]+", " ", extension_id).strip().title()


def _score_extension(
    extension: dict[str, Any],
    lowered_intent: str,
    audience: str,
) -> int:
    score = 0
    for value in extension.get("use_cases", []):
        if value.lower() in lowered_intent:
            score += 3
    for value in (extension.get("label", ""), extension.get("description", "")):
        if value and value.lower() in lowered_intent:
            score += 2
    keyword_map = {
        "fullscreen": {"plein ecran", "présentation", "presentation", "grand public"},
        "layerfilter": {"chercher", "rechercher", "filtrer les couches", "beaucoup de couches"},
        "print": {"imprimer", "impression", "pdf", "rapport"},
        "fileimport": {"import", "uploader", "fichier", "shp", "shape", "geojson"},
        "panoramax": {"panoramax", "photo", "terrain", "tourisme", "rue"},
        "trackview": {"gpx", "trace", "parcours", "itineraire", "itinéraire", "randonnee", "nautique"},
        "filter": {"filtre", "attribut", "recherche multicritere", "critere"},
        "stats": {"stat", "indicateur", "tableau de bord", "chiffre"},
        "label": {"label", "etiquette", "étiquette", "nom afficher"},
        "zoomToArea": {"zoom", "territoire", "commune", "selectionner une zone"},
        "streetview": {"streetview", "street view", "rue", "immersion"},
        "isochroneAddon": {"isochrone", "accessibilite", "accessibilité", "temps de parcours"},
    }
    for keyword in keyword_map.get(extension.get("id", ""), set()):
        if keyword in lowered_intent:
            score += 4
    if audience in extension.get("audiences", []):
        score += 1
    if audience == "grand_public" and extension.get("complexity") == "avance":
        score -= 2
    return score


def _extension_warnings(
    recommendations: list[dict[str, Any]],
    audience: str,
) -> list[str]:
    warnings: list[str] = []
    for extension in recommendations:
        if audience == "grand_public" and extension.get("complexity") == "avance":
            warnings.append(
                f"{extension['id']} est avancee : verifier que son interface reste simple."
            )
        warnings.extend(extension.get("warnings", []))
        warnings.extend(extension.get("configuration_notes", []))
    return warnings
