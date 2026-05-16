"""Regression tests for MCP server configuration loading."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from .mcp_config import load_mcp_config, parse_mcp_config


class TestMcpConfig(unittest.TestCase):
    def test_parse_mcp_config_supports_comments_and_quotes(self) -> None:
        values = parse_mcp_config(
            """
            # Commentaire
            MCP_TRANSPORT=streamable-http
            MVIEWER_FQDN="https://cartes.example.org" # origine publique
            export FASTMCP_HOST=0.0.0.0
            """
        )

        self.assertEqual(values["MCP_TRANSPORT"], "streamable-http")
        self.assertEqual(values["MVIEWER_FQDN"], "https://cartes.example.org")
        self.assertEqual(values["FASTMCP_HOST"], "0.0.0.0")

    def test_load_mcp_config_keeps_existing_environment_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            config_path = Path(directory) / "mcp.conf"
            config_path.write_text(
                "MCP_DEFAULT_USERNAME=config-user\nMVIEWER_FQDN=cartes.example.org\n",
                encoding="utf-8",
            )
            environ = {"MCP_DEFAULT_USERNAME": "env-user"}

            loaded = load_mcp_config(config_path, environ=environ)

        self.assertEqual(loaded["MCP_DEFAULT_USERNAME"], "config-user")
        self.assertEqual(environ["MCP_DEFAULT_USERNAME"], "env-user")
        self.assertEqual(environ["MVIEWER_FQDN"], "cartes.example.org")


if __name__ == "__main__":
    unittest.main()
