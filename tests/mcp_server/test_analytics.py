"""Regression tests for MCP layer usage analytics."""

from __future__ import annotations

from pathlib import Path
import tempfile
import unittest

from src.mcp_server.analytics import layer_usage


class TestAnalytics(unittest.TestCase):
    def test_layer_usage_counts_repeated_layers_across_configs(self) -> None:
        """The same id and URL should be counted across stored applications."""
        with tempfile.TemporaryDirectory() as directory:
            store = Path(directory) / "store" / "org"
            store.mkdir(parents=True)
            (store / "one.xml").write_text(
                _config_xml("One", "schools", "Schools", "https://example.org/wms"),
                encoding="utf-8",
            )
            (store / "two.xml").write_text(
                _config_xml("Two", "schools", "Schools", "https://example.org/wms"),
                encoding="utf-8",
            )
            (store / "three.xml").write_text(
                _config_xml("Three", "roads", "Roads", "https://example.org/wms"),
                encoding="utf-8",
            )

            result = layer_usage(root_dir=directory, scope="store", limit=2)

        self.assertEqual(result["xml_files_parsed"], 3)
        self.assertEqual(result["layers"][0]["id"], "schools")
        self.assertEqual(result["layers"][0]["usage_count"], 2)
        self.assertEqual(result["layers"][1]["id"], "roads")


def _config_xml(title: str, layer_id: str, name: str, url: str) -> str:
    return f"""<?xml version="1.0" encoding="utf-8"?>
<config>
  <application title="{title}" />
  <themes>
    <theme id="data" name="Data">
      <layer id="{layer_id}" name="{name}" type="wms" url="{url}" />
    </theme>
  </themes>
</config>"""


if __name__ == "__main__":
    unittest.main()
