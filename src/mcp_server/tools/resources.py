"""MCP tools for resource discovery and app-local assets."""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import Context, FastMCP

from ..analytics import layer_usage
from ..ogc_tools import inspect_wms_layer, search_csw_records, search_wms_layers
from ..runtime import mviewer_client
from ..spatial_files import decode_spatial_file_content, spatial_file_response


def register_resource_tools(mcp: FastMCP) -> None:
    """Register tools that discover or store non-application resources."""

    @mcp.tool()
    def analyze_mviewer_layer_usage(
        scope: str = "all",
        limit: int = 20,
        include_previews: bool = False,
    ) -> dict[str, Any]:
        """Find the most frequently used operational layers in stored/public XML configs."""
        return layer_usage(scope=scope, limit=limit, include_previews=include_previews)

    @mcp.tool()
    def store_layer_template(
        app_id: str,
        layer_id: str,
        template: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Store a Mustache template file for one existing app layer."""
        return mviewer_client(ctx).store_template(
            app_id,
            layer_id,
            template,
        )

    @mcp.tool()
    def store_sld_style(
        sld: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Store an SLD style and return the mviewer-accessible style path."""
        return mviewer_client(ctx).store_sld(sld)

    @mcp.tool()
    def upload_spatial_file_to_mviewer_app(
        app_id: str,
        filename: str,
        ctx: Context,
        content: str = "",
        content_base64: str = "",
        layer_name: str = "",
        layer_id: str = "",
    ) -> dict[str, Any]:
        """Store a GeoJSON/KML/CSV/Shapefile resource in an app workspace."""
        file_content = decode_spatial_file_content(
            content=content,
            content_base64=content_base64,
        )
        stored_file = mviewer_client(ctx).store_spatial_file(
            app_id,
            filename,
            file_content,
        )
        return spatial_file_response(
            stored_file,
            layer_name=layer_name,
            layer_id=layer_id,
        )

    @mcp.tool()
    def search_wms(
        url: str,
        keyword: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search named layers in a WMS GetCapabilities document."""
        return search_wms_layers(url, keyword=keyword, limit=limit)

    @mcp.tool()
    def search_csw(
        url: str,
        keyword: str = "",
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Search metadata records in a CSW catalog and return layer-ready WMS resources."""
        return search_csw_records(url, keyword=keyword, limit=limit)

    @mcp.tool()
    def inspect_wms(
        url: str,
        layer_id: str,
    ) -> dict[str, Any]:
        """Inspect one WMS layer: title, styles, metadata and bounding box."""
        return inspect_wms_layer(url, layer_id)
