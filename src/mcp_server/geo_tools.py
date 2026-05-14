"""Geocoding helpers for MCP map creation workflows."""

from __future__ import annotations

from math import atan, exp, log, pi, tan
from typing import Any
import requests


BAN_SEARCH_URL = "https://api-adresse.data.gouv.fr/search/"
WEB_MERCATOR_LIMIT = 20037508.342789244


def geocode_location(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """Resolve a French place/address to lon-lat and mviewer EPSG:3857 center."""
    if not query.strip():
        raise ValueError("query is required")
    response = requests.get(
        BAN_SEARCH_URL,
        params={"q": query, "limit": max(1, min(limit, 20))},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    results: list[dict[str, Any]] = []
    for feature in payload.get("features", []):
        coordinates = feature.get("geometry", {}).get("coordinates", [])
        if len(coordinates) < 2:
            continue
        lon = float(coordinates[0])
        lat = float(coordinates[1])
        x, y = lonlat_to_web_mercator(lon, lat)
        properties = feature.get("properties", {})
        bbox = feature.get("bbox") or []
        results.append(
            {
                "label": properties.get("label") or properties.get("name") or query,
                "name": properties.get("name", ""),
                "postcode": properties.get("postcode", ""),
                "city": properties.get("city", ""),
                "context": properties.get("context", ""),
                "type": properties.get("type", ""),
                "score": properties.get("score"),
                "lon": lon,
                "lat": lat,
                "center": [x, y],
                "projection": "EPSG:3857",
                "bbox_lonlat": bbox,
                "bbox": bbox_to_web_mercator(bbox) if len(bbox) == 4 else [],
            }
        )
    return results


def lonlat_to_web_mercator(lon: float, lat: float) -> tuple[float, float]:
    """Convert WGS84 coordinates to EPSG:3857."""
    clipped_lat = max(min(lat, 85.05112878), -85.05112878)
    x = lon * WEB_MERCATOR_LIMIT / 180.0
    y = log(tan((90.0 + clipped_lat) * pi / 360.0)) * WEB_MERCATOR_LIMIT / pi
    return (x, y)


def web_mercator_to_lonlat(x: float, y: float) -> tuple[float, float]:
    """Convert EPSG:3857 coordinates to WGS84."""
    lon = x / WEB_MERCATOR_LIMIT * 180.0
    lat = 180.0 / pi * (2.0 * atan(exp(y / WEB_MERCATOR_LIMIT * pi)) - pi / 2.0)
    return (lon, lat)


def bbox_to_web_mercator(bbox: list[float]) -> list[float]:
    """Convert a [west, south, east, north] bbox to EPSG:3857."""
    west, south, east, north = (float(value) for value in bbox)
    minx, miny = lonlat_to_web_mercator(west, south)
    maxx, maxy = lonlat_to_web_mercator(east, north)
    return [minx, miny, maxx, maxy]
