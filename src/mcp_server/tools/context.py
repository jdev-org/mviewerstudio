"""Read-only context and assistant convenience tools."""

from __future__ import annotations

from typing import Any
import json

from mcp.server.fastmcp import Context, FastMCP

from ..capabilities import find_baselayer, load_capabilities
from ..client import MviewerStudioClient
from ..geo_tools import geocode_location
from ..map_tools import (
    apply_mviewer_tool_recommendation,
    available_mviewer_tools,
    suggest_mviewer_tools_for_intent,
)
from ..runtime import (
    allow_tool_identity_override,
    trust_request_identity_headers,
    trusted_request_identity_headers,
)
from ..schemas import example_application_spec


def register_context_tools(mcp: FastMCP) -> None:
    """Register resources and non-mutating helper tools."""

    @mcp.resource(
        "mviewerstudio://capabilities",
        name="MviewerStudio capabilities",
        mime_type="application/json",
    )
    def capabilities_resource() -> str:
        """Return frontend configuration: versions, basemaps and data providers."""
        return json.dumps(load_capabilities(), ensure_ascii=False, indent=2)

    @mcp.resource(
        "mviewerstudio://application-spec/example",
        name="Example ApplicationSpec",
        mime_type="application/json",
    )
    def example_spec_resource() -> str:
        """Return a minimal ApplicationSpec accepted by create_or_update_mviewer_app."""
        return json.dumps(example_application_spec(), ensure_ascii=False, indent=2)

    @mcp.tool()
    def get_mviewerstudio_capabilities() -> dict[str, Any]:
        """Get configured mviewer versions, baselayers and OGC data providers."""
        return load_capabilities()

    @mcp.tool()
    def get_application_spec_example() -> dict[str, Any]:
        """Get a minimal JSON payload for create_or_update_mviewer_app."""
        return example_application_spec()

    @mcp.tool()
    def list_available_mviewer_tools() -> dict[str, Any]:
        """List standard and advanced cartographic tools known by this MCP server."""
        return available_mviewer_tools()

    @mcp.tool()
    def suggest_mviewer_tools(
        intent: str,
        audience: str = "grand_public",
        preset: str = "",
    ) -> dict[str, Any]:
        """Recommend mviewer tools for a business need and target audience."""
        return suggest_mviewer_tools_for_intent(
            intent=intent,
            audience=audience,
            preset=preset,
        )

    @mcp.tool()
    def apply_mviewer_tools_to_app_spec(
        spec: dict[str, Any],
        intent: str = "",
        audience: str = "grand_public",
        preset: str = "",
    ) -> dict[str, Any]:
        """Apply recommended mviewer tool options to an ApplicationSpec copy."""
        return apply_mviewer_tool_recommendation(
            spec=spec,
            intent=intent,
            audience=audience,
            preset=preset,
        )

    @mcp.tool()
    def get_mcp_effective_identity(ctx: Context) -> dict[str, Any]:
        """Return the trusted identity that MCP will forward to MviewerStudio."""
        trusted_headers = trusted_request_identity_headers(ctx)
        client = MviewerStudioClient(identity_headers=trusted_headers)
        return {
            "source": (
                "trusted_request_headers"
                if trusted_headers
                else "server_environment_defaults"
            ),
            "identity": client.active_identity(),
            "trust_request_headers": trust_request_identity_headers(),
            "allow_tool_identity_override": allow_tool_identity_override(),
        }

    @mcp.tool()
    def geocode_map_location(query: str, limit: int = 5) -> list[dict[str, Any]]:
        """Geocode a French city/address/zone and return mviewer EPSG:3857 centers."""
        return geocode_location(query, limit=limit)

    @mcp.tool()
    def get_baselayer_from_config(
        query: str = "ortho",
        visible: bool = True,
    ) -> dict[str, Any]:
        """Find a configured baselayer, for example 'ortho', and return ApplicationSpec JSON."""
        return find_baselayer(query=query, visible=visible)

    @mcp.tool()
    def prepare_centered_mviewer_app_spec(
        title: str,
        location: str,
        baselayer_query: str = "ortho",
        zoom: float = 13,
    ) -> dict[str, Any]:
        """Prepare an ApplicationSpec centered on a geocoded place with a configured basemap."""
        matches = geocode_location(location, limit=1)
        if not matches:
            raise ValueError(f"Location not found: {location}")
        place = matches[0]
        return {
            "title": title,
            "description": f"Application centree sur {place['label']}",
            "center": place["center"],
            "zoom": zoom,
            "projection": place["projection"],
            "baselayers": [find_baselayer(query=baselayer_query, visible=True)],
            "themes": [],
            "geocoded_location": place,
        }
