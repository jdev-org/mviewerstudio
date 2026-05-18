"""Regression tests for mviewer extension catalog helpers."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from src.mcp_server.extensions import (
    apply_mviewer_extensions,
    list_mviewer_extensions,
    suggest_mviewer_extensions,
)


class TestExtensions(unittest.TestCase):
    def test_installed_extensions_are_listed_from_addons_path(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            addons = Path(directory)
            fullscreen = addons / "fullscreen"
            fullscreen.mkdir()
            (fullscreen / "config.json").write_text(
                json.dumps(
                    {
                        "js": ["fullscreen.js"],
                        "css": "",
                        "html": "fullscreen.html",
                        "target": "toolstoolbar",
                    }
                ),
                encoding="utf-8",
            )

            with patch.dict(
                os.environ,
                {
                    "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                    "MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG": "false",
                    "MVIEWER_ADDONS_PATH": str(addons),
                },
            ):
                result = list_mviewer_extensions()

        self.assertEqual(result["extension_count"], 1)
        self.assertEqual(result["extensions"][0]["id"], "fullscreen")
        self.assertEqual(result["extensions"][0]["target"], "toolstoolbar")

    def test_suggest_extensions_uses_business_intent(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            addons = Path(directory)
            for extension_id in ("print", "fullscreen"):
                path = addons / extension_id
                path.mkdir()
                (path / "config.json").write_text(
                    json.dumps({"js": [], "html": f"{extension_id}.html", "target": "map"}),
                    encoding="utf-8",
                )

            with patch.dict(
                os.environ,
                {
                    "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                    "MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG": "false",
                    "MVIEWER_ADDONS_PATH": str(addons),
                },
            ):
                result = suggest_mviewer_extensions(
                    "Je veux imprimer la carte dans un rapport public",
                    audience="grand_public",
                )

        self.assertEqual(result["recommendations"][0]["id"], "print")
        self.assertEqual(
            result["recommendations"][0]["extension_spec"],
            {"type": "component", "id": "print", "path": "addons"},
        )

    def test_apply_extensions_adds_deduplicated_application_spec_entries(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            addons = Path(directory)
            path = addons / "fullscreen"
            path.mkdir()
            (path / "config.json").write_text(
                json.dumps({"js": [], "html": "fullscreen.html", "target": "map"}),
                encoding="utf-8",
            )
            spec = {
                "title": "Carte",
                "extensions": [
                    {"type": "component", "id": "fullscreen", "path": "addons"}
                ],
            }

            with patch.dict(
                os.environ,
                {
                    "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                    "MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG": "false",
                    "MVIEWER_ADDONS_PATH": str(addons),
                },
            ):
                result = apply_mviewer_extensions(spec, ["fullscreen"])

        self.assertEqual(len(result["spec"]["extensions"]), 1)
        self.assertEqual(result["added_extensions"], [])


if __name__ == "__main__":
    unittest.main()
