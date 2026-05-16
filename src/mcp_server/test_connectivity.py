"""Regression tests for generated map connectivity validation."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from .connectivity import (
    _default_public_origin,
    fix_app_connectivity,
    validate_app_connectivity,
)


class _Response:
    def __init__(self, status_code: int = 200, headers: dict[str, str] | None = None):
        self.status_code = status_code
        self.headers = headers or {}


def _spec(url: str = "https://ows.example.org/wms") -> dict[str, object]:
    return {
        "title": "Carte test",
        "proxy_url": "http://localhost/mviewerstudio/proxy/?url=",
        "themes": [
            {
                "id": "donnees",
                "name": "Donnees",
                "layers": [
                    {
                        "id": "test:layer",
                        "name": "Couche test",
                        "type": "wms",
                        "url": url,
                    }
                ],
            }
        ],
    }


class TestConnectivity(unittest.TestCase):
    def test_mviewer_fqdn_is_used_as_default_public_origin(self) -> None:
        with patch.dict(os.environ, {"MVIEWER_FQDN": "cartes.example.org"}, clear=True):
            self.assertEqual(
                _default_public_origin(),
                "https://cartes.example.org",
            )

    def test_cors_enabled_layer_does_not_require_proxy(self) -> None:
        def fake_get(url: str, **_: object) -> _Response:
            self.assertIn("ows.example.org", url)
            return _Response(
                headers={"Access-Control-Allow-Origin": "https://maps.example.org"}
            )

        with patch.dict(
            os.environ,
            {"MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "ows.example.org"},
        ), patch("src.mcp_server.connectivity.requests.get", side_effect=fake_get):
            report = validate_app_connectivity(
                _spec(),
                public_origin="https://maps.example.org",
            )

        self.assertTrue(report["ok"])
        self.assertEqual(report["proxy_required_count"], 0)
        self.assertTrue(report["layers"][0]["direct"]["cors_ok"])

    def test_missing_cors_is_fixed_with_useproxy_when_proxy_works(self) -> None:
        def fake_get(url: str, **_: object) -> _Response:
            if "localhost/mviewerstudio/proxy/" in url:
                return _Response()
            return _Response(headers={})

        with patch.dict(
            os.environ,
            {"MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "ows.example.org"},
        ), patch("src.mcp_server.connectivity.requests.get", side_effect=fake_get):
            result = fix_app_connectivity(
                _spec(),
                public_origin="https://maps.example.org",
            )

        layer = result["spec"]["themes"][0]["layers"][0]
        self.assertTrue(layer["useproxy"])
        self.assertEqual(result["connectivity"]["proxy_required_count"], 1)
        self.assertEqual(result["connectivity"]["proxy_fixable_count"], 1)
        self.assertEqual(result["changed_layers"][0]["reason"], "cors_missing")

    def test_https_viewer_with_http_layer_requires_proxy(self) -> None:
        def fake_get(url: str, **_: object) -> _Response:
            if "localhost/mviewerstudio/proxy/" in url:
                return _Response()
            return _Response(headers={"Access-Control-Allow-Origin": "*"})

        with patch.dict(
            os.environ,
            {"MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "ows.example.org"},
        ), patch("src.mcp_server.connectivity.requests.get", side_effect=fake_get):
            result = fix_app_connectivity(
                _spec(url="http://ows.example.org/wms"),
                public_origin="https://maps.example.org",
            )

        self.assertTrue(result["spec"]["themes"][0]["layers"][0]["useproxy"])
        self.assertIn(
            "mixed_content",
            result["connectivity"]["layers"][0]["proxy_reasons"],
        )

    def test_group_layers_are_validated(self) -> None:
        spec = _spec()
        layer = spec["themes"][0].pop("layers")[0]
        spec["themes"][0]["groups"] = [
            {"id": "groupe", "name": "Groupe", "layers": [layer]}
        ]

        with patch.dict(
            os.environ,
            {"MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "ows.example.org"},
        ), patch(
            "src.mcp_server.connectivity.requests.get",
            return_value=_Response(headers={"Access-Control-Allow-Origin": "*"}),
        ):
            report = validate_app_connectivity(
                spec,
                public_origin="https://maps.example.org",
            )

        self.assertEqual(report["layer_count"], 1)
        self.assertEqual(report["layers"][0]["path"], "themes[0].groups[0].layers[0]")


if __name__ == "__main__":
    unittest.main()
