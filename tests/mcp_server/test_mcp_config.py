"""Regression tests for MCP server configuration loading."""

from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from src.mcp_server.mcp_config import (
    _BACKEND_CONFIG_CACHE,
    McpSettings,
    fetch_backend_mcp_config,
    load_mcp_config,
    parse_mcp_config,
)


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

    def test_settings_from_env_casts_typed_values(self) -> None:
        settings = McpSettings.from_env(
            {
                "FASTMCP_PORT": "8040",
                "MVIEWERSTUDIO_MCP_STATELESS_HTTP": "false",
                "MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS": "yes",
                "MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS": "1",
                "MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES": "2048",
                "MVIEWERSTUDIO_MCP_XML_MAX_BYTES": "4096",
                "MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES": "8192",
            }
        )

        self.assertEqual(settings.fastmcp_port, 8040)
        self.assertFalse(settings.stateless_http)
        self.assertTrue(settings.trust_request_headers)
        self.assertTrue(settings.allow_unconfigured_hosts)
        self.assertEqual(settings.inline_data_max_bytes, 2048)
        self.assertEqual(settings.xml_max_bytes, 4096)
        self.assertEqual(settings.spatial_file_max_bytes, 8192)

    def test_settings_reuse_backend_defaults_when_env_is_absent(self) -> None:
        settings = McpSettings.from_env(
            {
                "FASTMCP_PORT": "8030",
            },
            backend_config={
                "mviewer": {
                    "conf_path": "apps/backend-store",
                    "public_path": "apps/backend-public",
                },
                "limits": {
                    "xml_max_bytes": 1234,
                    "spatial_file_max_bytes": 5678,
                },
            },
        )

        self.assertEqual(settings.mviewer_conf_path, "apps/backend-store")
        self.assertEqual(settings.mviewer_public_path, "apps/backend-public")
        self.assertEqual(settings.xml_max_bytes, 1234)
        self.assertEqual(settings.spatial_file_max_bytes, 5678)

    def test_settings_env_keeps_priority_over_backend_defaults(self) -> None:
        settings = McpSettings.from_env(
            {
                "MVIEWER_CONF_PATH": "apps/env-store",
                "MVIEWERSTUDIO_MCP_XML_MAX_BYTES": "999",
            },
            backend_config={
                "mviewer": {"conf_path": "apps/backend-store"},
                "limits": {"xml_max_bytes": 1234},
            },
        )

        self.assertEqual(settings.mviewer_conf_path, "apps/env-store")
        self.assertEqual(settings.xml_max_bytes, 999)

    def test_fetch_backend_mcp_config_uses_backend_endpoint(self) -> None:
        _BACKEND_CONFIG_CACHE.clear()
        response = Mock()
        response.json.return_value = {"success": True, "limits": {"xml_max_bytes": 1}}
        response.raise_for_status.return_value = None

        with patch.dict(
            os.environ,
            {"MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG": "true"},
        ), patch(
            "src.mcp_server.mcp_config.requests.get",
            return_value=response,
        ) as get:
            payload = fetch_backend_mcp_config("http://studio", timeout=0.1)

        self.assertEqual(payload["limits"]["xml_max_bytes"], 1)
        get.assert_called_once_with(
            "http://studio/api/config/mcp",
            timeout=0.1,
        )
        _BACKEND_CONFIG_CACHE.clear()


if __name__ == "__main__":
    unittest.main()
