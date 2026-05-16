"""Regression tests for publishing app-local resource URLs."""

from __future__ import annotations

import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from src.utils.config_utils import replace_resource_url_prefix
except ModuleNotFoundError as error:
    replace_resource_url_prefix = None
    IMPORT_ERROR = error
else:
    IMPORT_ERROR = None


class TestResourceUrlRewrite(unittest.TestCase):
    @unittest.skipIf(IMPORT_ERROR is not None, "backend dependencies are unavailable")
    def test_replace_layer_resource_url_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            xml_path = Path(directory) / "app.xml"
            xml_path.write_text(
                """
                <config>
                  <themes>
                    <theme id="t" name="Theme">
                      <layer id="l" name="Layer" type="geojson"
                        url="apps/store/org/app/map/data/points.geojson" />
                    </theme>
                  </themes>
                </config>
                """,
                encoding="utf-8",
            )

            replace_resource_url_prefix(
                xml_path,
                "apps/store/org/app/map/data",
                "apps/public/org/public-map/data",
            )

            root = ET.parse(xml_path).getroot()

        self.assertEqual(
            root.find(".//layer").get("url"),
            "apps/public/org/public-map/data/points.geojson",
        )


if __name__ == "__main__":
    unittest.main()
