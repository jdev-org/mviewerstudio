"""Regression tests for MCP client application management calls."""

from __future__ import annotations

import os
import unittest
from unittest.mock import Mock, patch

from src.mcp_server.client import MviewerStudioClient


class _Response:
    ok = True
    content = b"{}"

    def json(self) -> dict:
        return {}


class TestClientAppManagement(unittest.TestCase):
    def test_delete_app_uses_backend_delete_route(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.delete_app("app-1")

        client.session.request.assert_called_once()
        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "DELETE")
        self.assertEqual(url, "http://studio/api/app/app-1")

    def test_unpublish_app_uses_publish_delete_route(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.unpublish_app("app-1", "public-name")

        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "DELETE")
        self.assertEqual(url, "http://studio/api/app/app-1/publish/public-name")

    def test_restore_version_sends_as_new_flag(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.restore_app_version("app-1", "v1", as_new=True)

        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "PUT")
        self.assertEqual(url, "http://studio/api/app/app-1/version/v1")
        self.assertEqual(client.session.request.call_args.kwargs["json"], {"as_new": True})

    def test_store_spatial_file_uses_backend_file_route(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.store_spatial_file("app-1", "points.geojson", b"{}")

        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "POST")
        self.assertEqual(url, "http://studio/api/app/app-1/file/points.geojson")
        self.assertEqual(client.session.request.call_args.kwargs["data"], b"{}")

    def test_store_extension_uses_backend_extension_route(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.store_extension(
            "app-1",
            "trackview",
            config_override={"options": {"mviewer": {"parcours": []}}},
        )

        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "POST")
        self.assertEqual(url, "http://studio/api/app/app-1/extension/trackview")
        self.assertEqual(
            client.session.request.call_args.kwargs["json"]["config_override"],
            {"options": {"mviewer": {"parcours": []}}},
        )

    def test_store_help_page_uses_backend_help_route(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        client.store_help_page("app-1", "help.html", b"<h1>Info</h1>")

        method, url = client.session.request.call_args.args[:2]
        self.assertEqual(method, "POST")
        self.assertEqual(url, "http://studio/api/app/app-1/help/help.html")
        self.assertEqual(
            client.session.request.call_args.kwargs["data"],
            b"<h1>Info</h1>",
        )

    def test_store_spatial_file_rejects_payload_above_mcp_limit(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES": "2",
            },
        ):
            with self.assertRaisesRegex(ValueError, "spatial file is too large"):
                client.store_spatial_file("app-1", "points.geojson", b"{}{}")

        client.session.request.assert_not_called()

    def test_store_help_page_rejects_payload_above_mcp_limit(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_HELP_FILE_MAX_BYTES": "8",
            },
        ):
            with self.assertRaisesRegex(ValueError, "help page is too large"):
                client.store_help_page("app-1", "help.html", b"<h1>Info</h1>")

        client.session.request.assert_not_called()

    def test_preview_app_rejects_xml_above_mcp_limit(self) -> None:
        client = MviewerStudioClient(base_url="http://studio")
        client.session.request = Mock(return_value=_Response())

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_XML_MAX_BYTES": "8",
            },
        ):
            with self.assertRaisesRegex(ValueError, "mviewer XML is too large"):
                client.preview_app("app-1", "<config></config>")

        client.session.request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
