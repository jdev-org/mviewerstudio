"""Regression tests for the MCP-side mviewer XML builder.

These tests protect the backend contract used by agents: a structured
ApplicationSpec must produce XML that the existing MviewerStudio backend can
store, preview and publish.
"""

from __future__ import annotations

import unittest
import xml.etree.ElementTree as ET

from .schemas import ApplicationSpec, example_application_spec
from .xml_builder import build_mviewer_xml


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

    def test_application_spec_can_be_wrapped_like_inspector_payload(self) -> None:
        """MCP inspector payload wrappers should not break parsing."""
        spec = ApplicationSpec.from_dict({"spec": example_application_spec()})
        self.assertEqual(spec.title, "Demo MCP mviewer")


if __name__ == "__main__":
    unittest.main()
