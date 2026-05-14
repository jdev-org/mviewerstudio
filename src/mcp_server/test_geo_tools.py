"""Regression tests for MCP geocoding helpers."""

from __future__ import annotations

import unittest

from .geo_tools import lonlat_to_web_mercator, web_mercator_to_lonlat


class TestGeoTools(unittest.TestCase):
    def test_paris_coordinates_convert_to_mviewer_center(self) -> None:
        """Paris WGS84 coordinates should become EPSG:3857 map center values."""
        x, y = lonlat_to_web_mercator(2.3522, 48.8566)
        self.assertAlmostEqual(x, 261845.7, places=1)
        self.assertAlmostEqual(y, 6250564.3, places=1)

    def test_web_mercator_round_trip(self) -> None:
        """Coordinate conversion should remain stable enough for map creation."""
        lon, lat = web_mercator_to_lonlat(*lonlat_to_web_mercator(2.3522, 48.8566))
        self.assertAlmostEqual(lon, 2.3522, places=6)
        self.assertAlmostEqual(lat, 48.8566, places=6)


if __name__ == "__main__":
    unittest.main()
