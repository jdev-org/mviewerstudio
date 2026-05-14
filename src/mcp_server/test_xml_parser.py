"""Regression tests for parsing stored mviewer XML into ApplicationSpec."""

from __future__ import annotations

import unittest

from .schemas import ApplicationSpec, example_application_spec
from .xml_builder import build_mviewer_xml
from .xml_parser import mviewer_xml_to_spec


class TestXmlParser(unittest.TestCase):
    def test_generated_xml_can_be_loaded_as_editable_spec(self) -> None:
        """A stored config should round-trip to a structured editable spec."""
        original = example_application_spec()
        original["id"] = "existing_app"
        original["baselayers"][0]["visible"] = True
        xml = build_mviewer_xml(ApplicationSpec.from_dict(original))

        parsed = mviewer_xml_to_spec(xml)

        self.assertEqual(parsed["id"], "existing_app")
        self.assertEqual(parsed["title"], "Demo MCP mviewer")
        self.assertEqual(parsed["center"], original["center"])
        self.assertEqual(parsed["baselayers"][0]["id"], "osm")
        self.assertEqual(parsed["themes"][0]["layers"][0]["id"], "sample_layer")


if __name__ == "__main__":
    unittest.main()
