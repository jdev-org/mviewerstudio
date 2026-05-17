"""Regression tests for plain-language MCP map creation helpers."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from src.mcp_server.intent_tools import app_spec_from_intent


class TestIntentTools(unittest.TestCase):
    def test_app_spec_from_intent_creates_public_friendly_layer(self) -> None:
        layer = {
            "id": "rb:lycee",
            "title": "LYCEE_PUBLIC",
            "url": "https://ows.example.org/wms",
            "type": "wms",
            "queryable": True,
            "metadata": "https://example.org/metadata/lycee",
        }
        with patch(
            "src.mcp_server.intent_tools.search_wms_layers",
            return_value=[layer],
        ), patch(
            "src.mcp_server.intent_tools.geocode_location",
            return_value=[
                {
                    "label": "Rennes",
                    "center": [-187000, 6120000],
                    "projection": "EPSG:3857",
                }
            ],
        ):
            spec, choices = app_spec_from_intent(
                "Je veux voir les lycees autour de rennes",
                baselayer_query="osm",
                max_layers=1,
            )

        self.assertEqual(spec["title"], "Voir les lycees autour de rennes")
        self.assertEqual(choices["location"], "rennes")
        self.assertEqual(spec["themes"][0]["name"], "Donnees utiles")
        self.assertEqual(spec["themes"][0]["layers"][0]["name"], "LYCEE PUBLIC")
        self.assertTrue(spec["themes"][0]["layers"][0]["visible"])
        self.assertTrue(spec["options"]["geoloc"])
        self.assertTrue(spec["options"]["mapprint"])
        self.assertEqual(
            choices["tool_recommendation"]["preset"],
            "consultation_publique",
        )
        self.assertEqual(choices["selected_layers"][0]["id"], "rb:lycee")

    def test_app_spec_from_intent_warns_when_no_layer_is_found(self) -> None:
        with patch("src.mcp_server.intent_tools.search_wms_layers", return_value=[]):
            spec, choices = app_spec_from_intent("Carte des arbres remarquables")

        self.assertEqual(spec["themes"], [])
        self.assertTrue(choices["warnings"])


if __name__ == "__main__":
    unittest.main()
