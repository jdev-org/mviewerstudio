"""Regression tests for MCP spatial file helpers."""

from __future__ import annotations

import unittest

from src.mcp_server.spatial_files import (
    data_uri_payload_size,
    decode_spatial_file_content,
    is_data_uri,
    spatial_file_response,
)


class TestSpatialFiles(unittest.TestCase):
    def test_decode_plain_content(self) -> None:
        self.assertEqual(decode_spatial_file_content(content="{}"), b"{}")

    def test_decode_base64_content(self) -> None:
        self.assertEqual(decode_spatial_file_content(content_base64="e30="), b"{}")

    def test_data_uri_payload_size_decodes_url_encoded_content(self) -> None:
        uri = "data:application/geo+json;charset=utf-8,%7B%22type%22%3A%22Point%22%7D"

        self.assertTrue(is_data_uri(uri))
        self.assertEqual(data_uri_payload_size(uri), len(b'{"type":"Point"}'))

    def test_geojson_response_includes_ready_layer_spec(self) -> None:
        result = spatial_file_response(
            {
                "filename": "points.geojson",
                "extension": "geojson",
                "filepath": "apps/store/org/app/map/data/points.geojson",
            },
            layer_name="Points terrain",
        )

        self.assertTrue(result["mviewer_supported_as_layer"])
        self.assertEqual(result["layer_spec"]["type"], "geojson")
        self.assertEqual(result["layer_spec"]["name"], "Points terrain")
        self.assertEqual(
            result["layer_spec"]["url"],
            "apps/store/org/app/map/data/points.geojson",
        )

    def test_csv_response_warns_that_conversion_is_needed(self) -> None:
        result = spatial_file_response(
            {"filename": "points.csv", "extension": "csv", "filepath": "points.csv"}
        )

        self.assertFalse(result["mviewer_supported_as_layer"])
        self.assertTrue(result["warnings"])


if __name__ == "__main__":
    unittest.main()
