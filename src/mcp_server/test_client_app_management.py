"""Regression tests for MCP client application management calls."""

from __future__ import annotations

import unittest
from unittest.mock import Mock

from .client import MviewerStudioClient


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


if __name__ == "__main__":
    unittest.main()
