"""Regression tests for mviewer tool recommendations."""

from __future__ import annotations

import unittest

from src.mcp_server.map_tools import (
    apply_mviewer_tool_recommendation,
    available_mviewer_tools,
    suggest_mviewer_tools_for_intent,
)


class TestMapTools(unittest.TestCase):
    def test_available_tools_lists_standard_and_advanced_tools(self) -> None:
        tools = available_mviewer_tools()

        self.assertIn("mapprint", tools["standard_tools"])
        self.assertIn("exportpng", tools["standard_tools"])
        self.assertIn("draw", tools["advanced_or_extension_tools"])

    def test_public_consultation_recommends_simple_sharing_tools(self) -> None:
        recommendation = suggest_mviewer_tools_for_intent(
            "Carte pour une reunion publique avec les habitants"
        )

        self.assertEqual(recommendation["preset"], "consultation_publique")
        self.assertTrue(recommendation["recommended"]["mapprint"])
        self.assertTrue(recommendation["recommended"]["exportpng"])
        self.assertFalse(recommendation["recommended"]["addlayerstools"])

    def test_draw_is_returned_as_advanced_not_standard_option(self) -> None:
        recommendation = suggest_mviewer_tools_for_intent(
            "Je veux dessiner des annotations pendant la reunion"
        )

        self.assertFalse(recommendation["recommended"].get("draw", False))
        self.assertEqual(recommendation["advanced_or_extension"][0]["tool"], "draw")
        self.assertTrue(recommendation["warnings"])

    def test_apply_recommendation_preserves_spec_and_updates_options(self) -> None:
        spec = {"title": "Carte terrain", "options": {"mapprint": False}}

        result = apply_mviewer_tool_recommendation(
            spec,
            intent="Releve terrain avec mesure de distance",
        )

        self.assertFalse(spec["options"]["mapprint"])
        self.assertTrue(result["spec"]["options"]["measuretools"])
        self.assertEqual(result["tool_recommendation"]["preset"], "terrain")


if __name__ == "__main__":
    unittest.main()
