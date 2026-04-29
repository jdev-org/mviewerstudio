"""Regression tests for MCP OGC network allow-list behavior."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from unittest.mock import patch

from .ogc_tools import _assert_allowed_url, allowed_ogc_hosts, search_csw_records


class _Response:
    def __init__(self, content: bytes) -> None:
        self.content = content

    def raise_for_status(self) -> None:
        return None


class TestOgcTools(unittest.TestCase):
    def test_allowed_hosts_are_loaded_from_configured_providers(self) -> None:
        """WMS and CSW provider URLs should define the default allow-list."""
        config = {
            "app_conf": {
                "data_providers": {
                    "wms": [{"url": "https://ows.example.org/geoserver/wms"}],
                    "csw": [{"url": "https://catalog.example.org/csw"}],
                }
            }
        }
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as file:
            json.dump(config, file)
            config_path = file.name
        try:
            with patch.dict(
                os.environ,
                {
                    "MVIEWERSTUDIO_CONFIG_PATH": config_path,
                    "MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "",
                },
            ):
                self.assertEqual(
                    allowed_ogc_hosts(),
                    ["catalog.example.org", "ows.example.org"],
                )
                _assert_allowed_url("https://ows.example.org/geoserver/wms")
                with self.assertRaises(ValueError):
                    _assert_allowed_url("https://other.example.org/wms")
        finally:
            os.unlink(config_path)

    def test_missing_allow_list_rejects_by_default(self) -> None:
        """A missing config should not silently allow unrestricted OGC calls."""
        with patch.dict(
            os.environ,
            {
                "MVIEWERSTUDIO_CONFIG_PATH": "/tmp/missing-mviewerstudio-config.json",
                "MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "",
                "MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS": "",
            },
        ):
            with self.assertRaises(ValueError):
                _assert_allowed_url("https://ows.example.org/geoserver/wms")

    def test_search_csw_returns_layer_ready_wms_resources(self) -> None:
        """CSW ISO records should expose WMS resources as mviewer layer inputs."""
        config = {
            "app_conf": {
                "data_providers": {
                    "csw": [
                        {
                            "url": "https://catalog.example.org/csw",
                            "baseref": "https://catalog.example.org/metadata/",
                        }
                    ]
                }
            }
        }
        xml = b"""<?xml version="1.0" encoding="UTF-8"?>
<csw:GetRecordsResponse
    xmlns:csw="http://www.opengis.net/cat/csw/2.0.2"
    xmlns:gmd="http://www.isotc211.org/2005/gmd"
    xmlns:gco="http://www.isotc211.org/2005/gco">
  <csw:SearchResults>
    <gmd:MD_Metadata>
      <gmd:fileIdentifier><gco:CharacterString>record-1</gco:CharacterString></gmd:fileIdentifier>
      <gmd:identificationInfo>
        <gmd:MD_DataIdentification>
          <gmd:citation>
            <gmd:CI_Citation>
              <gmd:title><gco:CharacterString>Layer title</gco:CharacterString></gmd:title>
            </gmd:CI_Citation>
          </gmd:citation>
          <gmd:abstract><gco:CharacterString>Layer abstract</gco:CharacterString></gmd:abstract>
          <gmd:pointOfContact>
            <gmd:CI_ResponsibleParty>
              <gmd:organisationName><gco:CharacterString>Producer</gco:CharacterString></gmd:organisationName>
            </gmd:CI_ResponsibleParty>
          </gmd:pointOfContact>
        </gmd:MD_DataIdentification>
      </gmd:identificationInfo>
      <gmd:distributionInfo>
        <gmd:MD_Distribution>
          <gmd:transferOptions>
            <gmd:MD_DigitalTransferOptions>
              <gmd:onLine>
                <gmd:CI_OnlineResource>
                  <gmd:linkage><gmd:URL>https://ows.example.org/wms?SERVICE=WMS</gmd:URL></gmd:linkage>
                  <gmd:protocol><gco:CharacterString>OGC:WMS</gco:CharacterString></gmd:protocol>
                  <gmd:name><gco:CharacterString>workspace:layer</gco:CharacterString></gmd:name>
                </gmd:CI_OnlineResource>
              </gmd:onLine>
            </gmd:MD_DigitalTransferOptions>
          </gmd:transferOptions>
        </gmd:MD_Distribution>
      </gmd:distributionInfo>
    </gmd:MD_Metadata>
  </csw:SearchResults>
</csw:GetRecordsResponse>"""
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as file:
            json.dump(config, file)
            config_path = file.name
        try:
            with patch.dict(
                os.environ,
                {
                    "MVIEWERSTUDIO_CONFIG_PATH": config_path,
                    "MVIEWERSTUDIO_MCP_ALLOWED_HOSTS": "",
                },
            ), patch("src.mcp_server.ogc_tools.requests.post") as post:
                post.return_value = _Response(xml)
                results = search_csw_records("https://catalog.example.org/csw", "Layer")
        finally:
            os.unlink(config_path)

        self.assertEqual(results[0]["id"], "workspace:layer")
        self.assertEqual(results[0]["type"], "wms")
        self.assertEqual(results[0]["url"], "https://ows.example.org/wms")
        self.assertEqual(results[0]["metadata"], "https://catalog.example.org/metadata/record-1")


if __name__ == "__main__":
    unittest.main()
