"""Regression tests for extension URL rewriting in copied mviewer configs."""

from __future__ import annotations

import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

try:
    from src.utils.config_utils import (
        replace_extension_path_prefix,
        replace_help_url_prefix,
    )
except ModuleNotFoundError as error:
    replace_extension_path_prefix = None
    replace_help_url_prefix = None
    IMPORT_ERROR = error
else:
    IMPORT_ERROR = None


class TestConfigUtilsExtensions(unittest.TestCase):
    @unittest.skipIf(
        replace_extension_path_prefix is None,
        f"backend dependencies unavailable: {IMPORT_ERROR}",
    )
    def test_replace_extension_path_prefix_updates_extension_paths(self) -> None:
        xml = """<config>
  <extensions>
    <extension type="component" id="print" path="apps/store/org/app/map/extensions"/>
    <extension type="component" id="fullscreen" path="addons"/>
  </extensions>
</config>"""
        with tempfile.TemporaryDirectory() as directory:
            xml_path = Path(directory) / "map.xml"
            xml_path.write_text(xml, encoding="utf-8")

            replace_extension_path_prefix(
                str(xml_path),
                "apps/store/org/app/map/extensions",
                "apps/public/org/map/extensions",
            )

            root = ET.fromstring(xml_path.read_text(encoding="utf-8"))

        extensions = root.findall("./extensions/extension")
        self.assertEqual(
            extensions[0].get("path"),
            "apps/public/org/map/extensions",
        )
        self.assertEqual(extensions[1].get("path"), "addons")

    @unittest.skipIf(
        replace_help_url_prefix is None,
        f"backend dependencies unavailable: {IMPORT_ERROR}",
    )
    def test_replace_help_url_prefix_updates_application_help(self) -> None:
        xml = """<config>
  <application help="apps/store/org/app/map/help/help.html"/>
</config>"""
        with tempfile.TemporaryDirectory() as directory:
            xml_path = Path(directory) / "map.xml"
            xml_path.write_text(xml, encoding="utf-8")

            replace_help_url_prefix(
                str(xml_path),
                "apps/store/org/app/map/help",
                "apps/public/org/map/help",
            )

            root = ET.fromstring(xml_path.read_text(encoding="utf-8"))

        self.assertEqual(
            root.find("./application").get("help"),
            "apps/public/org/map/help/help.html",
        )


if __name__ == "__main__":
    unittest.main()
