"""Regression tests for the MCP-side mviewer XML builder.

These tests protect the backend contract used by agents: a structured
ApplicationSpec must produce XML that the existing MviewerStudio backend can
store, preview and publish.
"""

from __future__ import annotations

import os
import unittest
import xml.etree.ElementTree as ET
from unittest.mock import patch

from src.mcp_server.schemas import ApplicationSpec, example_application_spec
from src.mcp_server.xml_builder import build_mviewer_xml


class TestXmlBuilder(unittest.TestCase):
    def test_build_minimal_application_xml(self) -> None:
        """The example spec should generate the expected core XML nodes."""
        spec = ApplicationSpec.from_dict(example_application_spec())
        xml = build_mviewer_xml(spec)
        root = ET.fromstring(xml)
        self.assertEqual(root.tag, "config")
        self.assertEqual(root.find("./application").get("title"), "Demo MCP mviewer")
        self.assertEqual(root.find("./baselayers/baselayer").get("visible"), "true")
        layer = root.find("./themes/theme/layer")
        self.assertEqual(layer.get("id"), "sample_layer")
        self.assertEqual(layer.get("type"), "wms")

    def test_template_url_is_serialized(self) -> None:
        """External template URLs must stay attached to their layer."""
        data = example_application_spec()
        data["themes"][0]["layers"][0]["template_url"] = "apps/store/demo/template.mst"
        spec = ApplicationSpec.from_dict(data)
        root = ET.fromstring(build_mviewer_xml(spec))
        template = root.find("./themes/theme/layer/template")
        self.assertEqual(template.get("url"), "apps/store/demo/template.mst")

    def test_help_page_attributes_are_serialized(self) -> None:
        data = example_application_spec()
        data["help"] = "apps/store/org/app/help/help.html"
        data["options"] = {
            "showhelp": True,
            "titlehelp": "Bienvenue",
            "iconhelp": "fas fa-home",
        }
        spec = ApplicationSpec.from_dict(data)
        application = ET.fromstring(build_mviewer_xml(spec)).find("./application")

        self.assertEqual(application.get("help"), "apps/store/org/app/help/help.html")
        self.assertEqual(application.get("showhelp"), "true")
        self.assertEqual(application.get("titlehelp"), "Bienvenue")
        self.assertEqual(application.get("iconhelp"), "fas fa-home")

    def test_application_spec_can_be_wrapped_like_inspector_payload(self) -> None:
        """MCP inspector payload wrappers should not break parsing."""
        spec = ApplicationSpec.from_dict({"spec": example_application_spec()})
        self.assertEqual(spec.title, "Demo MCP mviewer")

    def test_wmts_baselayer_extra_attributes_are_serialized(self) -> None:
        """Configured IGN orthophoto baselayers should keep WMTS-specific fields."""
        data = example_application_spec()
        data["baselayers"] = [
            {
                "id": "ortho_ign",
                "label": "Photographies aeriennes",
                "title": "IGN",
                "type": "WMTS",
                "url": "https://data.geopf.fr/wmts",
                "visible": True,
                "layers": "ORTHOIMAGERY.ORTHOPHOTOS",
                "format": "image/jpeg",
                "fromcapacity": "false",
                "style": "normal",
                "matrixset": "PM",
            }
        ]
        spec = ApplicationSpec.from_dict(data)
        root = ET.fromstring(build_mviewer_xml(spec))
        baselayer = root.find("./baselayers/baselayer")
        self.assertEqual(baselayer.get("id"), "ortho_ign")
        self.assertEqual(baselayer.get("layers"), "ORTHOIMAGERY.ORTHOPHOTOS")
        self.assertEqual(baselayer.get("matrixset"), "PM")

    def test_extensions_are_serialized(self) -> None:
        """Mviewer component extensions should be emitted in a dedicated XML block."""
        data = example_application_spec()
        data["extensions"] = [
            {"type": "component", "id": "fullscreen", "path": "addons"}
        ]
        spec = ApplicationSpec.from_dict(data)
        root = ET.fromstring(build_mviewer_xml(spec))
        extension = root.find("./extensions/extension")

        self.assertEqual(extension.get("type"), "component")
        self.assertEqual(extension.get("id"), "fullscreen")
        self.assertEqual(extension.get("path"), "addons")

    def test_large_inline_data_uri_is_rejected(self) -> None:
        """Generated spatial files should be uploaded once they exceed policy."""
        data = example_application_spec()
        data["themes"][0]["layers"][0].update(
            {
                "type": "geojson",
                "url": "data:application/geo+json;charset=utf-8,%7B%22payload%22%3A%22abcdef%22%7D",
            }
        )
        spec = ApplicationSpec.from_dict(data)

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES": "8",
            },
        ):
            with self.assertRaisesRegex(ValueError, "upload_spatial_file_to_mviewer_app"):
                build_mviewer_xml(spec)

    def test_small_inline_data_uri_is_allowed(self) -> None:
        data = example_application_spec()
        data["themes"][0]["layers"][0].update(
            {
                "type": "geojson",
                "url": "data:application/geo+json;charset=utf-8,%7B%7D",
            }
        )
        spec = ApplicationSpec.from_dict(data)

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES": "8",
            },
        ):
            root = ET.fromstring(build_mviewer_xml(spec))

        self.assertTrue(root.find("./themes/theme/layer").get("url").startswith("data:"))

    def test_xml_above_mcp_limit_is_rejected_by_builder(self) -> None:
        spec = ApplicationSpec.from_dict(example_application_spec())

        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_MCP_CONFIG": "/tmp/missing-mcp.conf",
                "MVIEWERSTUDIO_MCP_XML_MAX_BYTES": "8",
            },
        ):
            with self.assertRaisesRegex(ValueError, "mviewer XML is too large"):
                build_mviewer_xml(spec)


if __name__ == "__main__":
    unittest.main()
