"""Regression tests for mviewer presentation helpers."""

from __future__ import annotations

import json
import unittest

from src.mcp_server.presentation import (
    build_public_feature_template,
    build_public_help_page,
    recommend_mviewer_geojson_style,
    safe_help_page_response,
    sanitize_geojson_for_mviewer,
    validate_static_help_html,
)


class TestPresentation(unittest.TestCase):
    def test_public_template_uses_mustache_sections(self) -> None:
        result = build_public_feature_template(
            title_field="name",
            description_field="description",
            fields=["harbor", "website"],
        )

        self.assertIn("{{#name}}", result["template"])
        self.assertIn("{{description}}", result["template"])
        self.assertIn("{{#harbor}}", result["template"])
        self.assertEqual(result["extension"], ".mst")

    def test_route_style_recommendation_uses_builtin_feature_style(self) -> None:
        result = recommend_mviewer_geojson_style(geometry_type="LineString route")

        self.assertEqual(result["layer_patch"], {"style": "highlight"})
        self.assertIn("mviewer.featureStyles", result["warning"])

    def test_public_help_page_returns_application_patch(self) -> None:
        result = build_public_help_page(
            "Carte touristique",
            introduction="Decouvrir le territoire",
            sections=[{"title": "Mode d'emploi", "items": ["Cliquer sur un point"]}],
        )

        self.assertIn("<h1>Carte touristique</h1>", result["html"])
        self.assertEqual(result["filename"], "help.html")
        self.assertTrue(result["application_patch"]["options"]["showhelp"])

    def test_help_page_response_points_application_help_to_stored_file(self) -> None:
        result = safe_help_page_response(
            {"filepath": "apps/store/org/app/help/help.html"},
            title="Bienvenue",
        )

        self.assertEqual(
            result["application_patch"]["help"],
            "apps/store/org/app/help/help.html",
        )
        self.assertEqual(result["application_patch"]["options"]["titlehelp"], "Bienvenue")

    def test_help_html_validator_rejects_active_html(self) -> None:
        with self.assertRaisesRegex(ValueError, "forbidden active HTML"):
            validate_static_help_html("<script>alert(1)</script>")

        with self.assertRaisesRegex(ValueError, "event attributes"):
            validate_static_help_html('<a href="#" onclick="alert(1)">Lien</a>')

    def test_geojson_sanitizer_removes_style_properties(self) -> None:
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Depart",
                        "stroke": "#0057ff",
                        "stroke-width": 4,
                        "style_note": "ignored",
                    },
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                }
            ],
        }

        result = sanitize_geojson_for_mviewer(json.dumps(geojson))
        data = json.loads(result["content"])
        properties = data["features"][0]["properties"]

        self.assertEqual(properties, {"name": "Depart"})
        self.assertTrue(result["changed"])
        self.assertEqual(result["removed_style_properties"]["stroke"], 1)
        self.assertEqual(result["removed_style_properties"]["stroke-width"], 1)
        self.assertEqual(result["removed_style_properties"]["style_note"], 1)


if __name__ == "__main__":
    unittest.main()
