"""Business-oriented mviewer tool recommendations for MCP workflows."""

from __future__ import annotations

from typing import Any
import copy
import re


STANDARD_TOOL_CATALOG: dict[str, dict[str, Any]] = {
    "zoomtools": {
        "label": "Zoom + / -",
        "xml_attribute": "zoomtools",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Affiche les boutons de zoom dans la carte.",
    },
    "initialextenttool": {
        "label": "Retour a l'emprise initiale",
        "xml_attribute": "initialextenttool",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Permet de revenir au cadrage initial de la carte.",
    },
    "geoloc": {
        "label": "Se geolocaliser",
        "xml_attribute": "geoloc",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Ajoute le bouton de geolocalisation utilisateur.",
    },
    "measuretools": {
        "label": "Mesurer distance et surface",
        "xml_attribute": "measuretools",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Active les mesures lineaires et surfaciques.",
    },
    "mapprint": {
        "label": "Imprimer la vue courante",
        "xml_attribute": "mapprint",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Affiche le bouton d'impression navigateur.",
    },
    "exportpng": {
        "label": "Exporter en image",
        "xml_attribute": "exportpng",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Permet d'exporter une capture PNG de la carte.",
    },
    "coordinates": {
        "label": "Coordonnees au clic",
        "xml_attribute": "coordinates",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Affiche les coordonnees d'un point clique sur la carte.",
    },
    "mouseposition": {
        "label": "Coordonnees de la souris",
        "xml_attribute": "mouseposition",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Affiche en continu les coordonnees du pointeur.",
    },
    "togglealllayersfromtheme": {
        "label": "Afficher ou masquer un theme",
        "xml_attribute": "togglealllayersfromtheme",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Ajoute une commande globale par theme de couches.",
    },
    "addlayerstools": {
        "label": "Ajouter des couches WMS",
        "xml_attribute": "addlayerstools",
        "status": "standard",
        "available_in_mviewerstudio": True,
        "description": "Permet aux utilisateurs d'ajouter eux-memes des couches WMS.",
    },
}


ADVANCED_TOOL_CATALOG: dict[str, dict[str, Any]] = {
    "draw": {
        "label": "Dessiner / annoter",
        "status": "advanced_or_extension",
        "available_in_mviewerstudio": False,
        "description": (
            "mviewer embarque du code de dessin, mais mviewerstudio ne l'expose "
            "pas comme option applicative simple dans l'interface actuelle."
        ),
    },
}


PRESETS: dict[str, dict[str, bool]] = {
    "consultation_publique": {
        "zoomtools": True,
        "initialextenttool": True,
        "geoloc": True,
        "measuretools": False,
        "mapprint": True,
        "exportpng": True,
        "coordinates": False,
        "mouseposition": False,
        "togglealllayersfromtheme": True,
        "addlayerstools": False,
    },
    "terrain": {
        "zoomtools": True,
        "initialextenttool": True,
        "geoloc": True,
        "measuretools": True,
        "mapprint": False,
        "exportpng": True,
        "coordinates": True,
        "mouseposition": False,
        "togglealllayersfromtheme": True,
        "addlayerstools": False,
    },
    "communication": {
        "zoomtools": True,
        "initialextenttool": True,
        "geoloc": False,
        "measuretools": False,
        "mapprint": True,
        "exportpng": True,
        "coordinates": False,
        "mouseposition": False,
        "togglealllayersfromtheme": False,
        "addlayerstools": False,
    },
    "analyse_simple": {
        "zoomtools": True,
        "initialextenttool": True,
        "geoloc": True,
        "measuretools": True,
        "mapprint": True,
        "exportpng": True,
        "coordinates": True,
        "mouseposition": False,
        "togglealllayersfromtheme": True,
        "addlayerstools": False,
    },
    "expert": {
        "zoomtools": True,
        "initialextenttool": True,
        "geoloc": True,
        "measuretools": True,
        "mapprint": True,
        "exportpng": True,
        "coordinates": True,
        "mouseposition": True,
        "togglealllayersfromtheme": True,
        "addlayerstools": True,
    },
}


def available_mviewer_tools() -> dict[str, Any]:
    """Return tools that MCP can recommend or configure."""
    return {
        "standard_tools": copy.deepcopy(STANDARD_TOOL_CATALOG),
        "advanced_or_extension_tools": copy.deepcopy(ADVANCED_TOOL_CATALOG),
        "presets": sorted(PRESETS),
    }


def suggest_mviewer_tools_for_intent(
    intent: str,
    audience: str = "grand_public",
    preset: str = "",
) -> dict[str, Any]:
    """Recommend mviewer application tools from a business need."""
    selected_preset = preset or _preset_from_intent(intent, audience=audience)
    if selected_preset not in PRESETS:
        raise ValueError(f"Unknown tool preset: {selected_preset}")

    recommended = dict(PRESETS[selected_preset])
    reasons = _preset_reasons(selected_preset)
    warnings: list[str] = []
    advanced: list[dict[str, Any]] = []
    lowered = intent.lower()

    if _mentions_any(lowered, {"dessin", "dessiner", "annoter", "croquis"}):
        advanced.append(
            {
                "tool": "draw",
                "label": ADVANCED_TOOL_CATALOG["draw"]["label"],
                "status": ADVANCED_TOOL_CATALOG["draw"]["status"],
                "reason": (
                    "Le besoin parle de dessin ou d'annotation, mais cet outil "
                    "n'est pas activable comme simple option mviewerstudio."
                ),
            }
        )
        warnings.append(
            "Le dessin est signale comme piste avancee, pas comme option standard activee."
        )

    if audience in {"grand_public", "non_specialiste", "non_specialistes"}:
        if recommended.get("addlayerstools"):
            recommended["addlayerstools"] = False
            reasons.append(
                "L'ajout libre de couches est desactive pour garder une interface simple."
            )
        if recommended.get("mouseposition"):
            recommended["mouseposition"] = False
            reasons.append(
                "Les coordonnees de souris sont masquees pour eviter un affichage technique."
            )

    return {
        "preset": selected_preset,
        "audience": audience,
        "recommended": recommended,
        "reasons": reasons,
        "advanced_or_extension": advanced,
        "warnings": warnings,
    }


def apply_mviewer_tool_recommendation(
    spec: dict[str, Any],
    intent: str = "",
    audience: str = "grand_public",
    preset: str = "",
) -> dict[str, Any]:
    """Return a copied ApplicationSpec with recommended tool options applied."""
    updated_spec = copy.deepcopy(spec)
    recommendation = suggest_mviewer_tools_for_intent(
        intent=intent or str(spec.get("title", "")),
        audience=audience,
        preset=preset,
    )
    options = dict(updated_spec.get("options", {}))
    options.update(recommendation["recommended"])
    updated_spec["options"] = options
    return {"spec": updated_spec, "tool_recommendation": recommendation}


def _preset_from_intent(intent: str, audience: str = "grand_public") -> str:
    lowered = intent.lower()
    if _mentions_any(lowered, {"expert", "administrateur", "wms", "ogc", "sig"}):
        return "expert" if audience not in {"grand_public", "non_specialiste"} else "analyse_simple"
    if _mentions_any(lowered, {"terrain", "visite", "chantier", "releve", "relevé"}):
        return "terrain"
    if _mentions_any(
        lowered,
        {"concertation", "consultation", "reunion", "réunion", "publique", "habitants"},
    ):
        return "consultation_publique"
    if _mentions_any(
        lowered,
        {"communiquer", "communication", "rapport", "presentation", "présentation"},
    ):
        return "communication"
    if _mentions_any(lowered, {"analyse", "comparer", "mesurer", "distance", "surface"}):
        return "analyse_simple"
    return "consultation_publique" if audience == "grand_public" else "analyse_simple"


def _preset_reasons(preset: str) -> list[str]:
    reasons = {
        "consultation_publique": [
            "L'impression et l'export image facilitent le partage en reunion.",
            "La geolocalisation et le retour a l'emprise initiale aident les utilisateurs non specialistes.",
        ],
        "terrain": [
            "La geolocalisation et les coordonnees sont utiles sur site.",
            "La mesure est activee pour estimer distances et surfaces pendant la visite.",
        ],
        "communication": [
            "L'interface reste epuree pour une carte de communication.",
            "L'export image et l'impression sont actives pour reutiliser la carte dans des supports.",
        ],
        "analyse_simple": [
            "Les outils de mesure et de coordonnees aident a analyser sans ouvrir l'ajout libre de couches.",
            "Les commandes de theme facilitent la lecture lorsque plusieurs couches sont presentes.",
        ],
        "expert": [
            "Les outils techniques sont actives pour un utilisateur capable d'ajouter et comparer des couches.",
            "Les coordonnees de souris et l'ajout WMS sont reserves aux usages avances.",
        ],
    }
    return list(reasons[preset])


def _mentions_any(value: str, terms: set[str]) -> bool:
    return any(re.search(rf"\b{re.escape(term)}\b", value) for term in terms)
