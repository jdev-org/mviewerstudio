"""MCP tools for resource discovery and app-local assets."""

from __future__ import annotations

import logging
from typing import Any

from mcp.server.fastmcp import Context, FastMCP

from ..analytics import layer_usage
from ..ogc_tools import inspect_wms_layer, search_csw_records, search_wms_layers
from ..presentation import (
    build_public_feature_template,
    build_public_help_page,
    recommend_mviewer_geojson_style,
    safe_help_page_response,
    sanitize_geojson_for_mviewer,
    validate_static_help_html,
)
from ..runtime import mviewer_client
from ..spatial_files import decode_spatial_file_content, spatial_file_response


logger = logging.getLogger(__name__)


def register_resource_tools(mcp: FastMCP) -> None:
    """Register tools that discover or store non-application resources."""

    def _upload_help_page(
        app_id: str,
        filename: str,
        ctx: Context,
        html: str,
        html_base64: str,
        title: str,
        show_on_startup: bool,
    ) -> dict[str, Any]:
        content = validate_static_help_html(
            decode_spatial_file_content(
                content=html,
                content_base64=html_base64,
            )
        )
        logger.info(
            "MCP uploading help page app=%s filename=%s bytes=%s",
            app_id,
            filename,
            len(content),
        )
        stored_file = mviewer_client(ctx).store_help_page(
            app_id,
            filename,
            content,
        )
        return safe_help_page_response(
            stored_file,
            title=title,
            show_on_startup=show_on_startup,
        )

    @mcp.tool()
    def analyze_mviewer_layer_usage(
        scope: str = "all",
        limit: int = 20,
        include_previews: bool = False,
    ) -> dict[str, Any]:
        """Find the most frequently used operational layers in stored/public XML configs."""
        logger.debug(
            "Analyzing mviewer layer usage scope=%s limit=%s include_previews=%s",
            scope,
            limit,
            include_previews,
        )
        return layer_usage(scope=scope, limit=limit, include_previews=include_previews)

    @mcp.tool()
    def store_layer_template(
        app_id: str,
        layer_id: str,
        template: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Store a Mustache template file for one existing app layer."""
        logger.info("MCP storing layer template app=%s layer=%s", app_id, layer_id)
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
        logger.info("MCP storing SLD style bytes=%s", len(sld.encode("utf-8")))
        return mviewer_client(ctx).store_sld(sld)

    @mcp.tool()
    def build_public_mviewer_template(
        title_field: str = "name",
        description_field: str = "description",
        fields: list[str] | None = None,
        preset: str = "tourism",
    ) -> dict[str, Any]:
        """Build a public/tourism Mustache template for feature info."""
        return build_public_feature_template(
            title_field=title_field,
            description_field=description_field,
            fields=fields,
            preset=preset,
        )

    @mcp.tool()
    def build_mviewer_help_page(
        title: str,
        introduction: str = "",
        sections: list[dict[str, Any]] | None = None,
        audience: str = "grand_public",
    ) -> dict[str, Any]:
        """Build a static HTML help/home page for a public mviewer map."""
        return build_public_help_page(
            title=title,
            introduction=introduction,
            sections=sections,
            audience=audience,
        )

    @mcp.tool()
    def recommend_mviewer_vector_style(
        geometry_type: str = "",
        audience: str = "grand_public",
    ) -> dict[str, Any]:
        """Recommend a mviewer-compatible style for GeoJSON/KML vector layers."""
        return recommend_mviewer_geojson_style(
            geometry_type=geometry_type,
            audience=audience,
        )

    @mcp.tool()
    def sanitize_geojson_properties_for_mviewer(
        content: str = "",
        content_base64: str = "",
    ) -> dict[str, Any]:
        """Remove styling-only GeoJSON properties that mviewer will not render."""
        file_content = decode_spatial_file_content(
            content=content,
            content_base64=content_base64,
        )
        return sanitize_geojson_for_mviewer(file_content)

    @mcp.tool()
    def copy_mviewer_extension_to_app(
        app_id: str,
        extension_id: str,
        ctx: Context,
        config_override: dict[str, Any] | None = None,
        overwrite: bool = True,
        copy_shared_libs: bool = True,
    ) -> dict[str, Any]:
        """Copy an installed mviewer addon into an app-local extensions directory."""
        logger.info("MCP copying extension %s into app %s", extension_id, app_id)
        return mviewer_client(ctx).store_extension(
            app_id=app_id,
            extension_id=extension_id,
            config_override=config_override,
            overwrite=overwrite,
            copy_shared_libs=copy_shared_libs,
        )

    @mcp.tool()
    def install_mviewer_extensions_to_app_spec(
        app_id: str,
        extension_ids: list[str],
        spec: dict[str, Any],
        ctx: Context,
        config_overrides: dict[str, dict[str, Any]] | None = None,
        overwrite: bool = True,
        copy_shared_libs: bool = True,
    ) -> dict[str, Any]:
        """Copy addons into the app workspace and add their local extension specs."""
        logger.info(
            "MCP installing extensions into app %s extension_ids=%s",
            app_id,
            extension_ids,
        )
        client = mviewer_client(ctx)
        updated_spec = dict(spec)
        extensions = list(updated_spec.get("extensions", []))
        existing = {
            (
                extension.get("type", "component"),
                extension.get("id", ""),
                extension.get("path", ""),
            )
            for extension in extensions
            if isinstance(extension, dict)
        }
        installed: list[dict[str, Any]] = []
        for extension_id in extension_ids:
            response = client.store_extension(
                app_id=app_id,
                extension_id=extension_id,
                config_override=(config_overrides or {}).get(extension_id, {}),
                overwrite=overwrite,
                copy_shared_libs=copy_shared_libs,
            )
            extension_spec = response.get("extension_spec", {})
            key = (
                extension_spec.get("type", "component"),
                extension_spec.get("id", ""),
                extension_spec.get("path", ""),
            )
            if key not in existing:
                extensions.append(extension_spec)
                existing.add(key)
            installed.append(response)
        updated_spec["extensions"] = extensions
        return {
            "spec": updated_spec,
            "installed_extensions": installed,
            "maintainability": (
                "Chaque addon est copie dans le repertoire de la carte sous "
                "extensions/<id>. Son config.json devient modifiable pour cette "
                "carte sans impacter les autres applications."
            ),
        }

    @mcp.tool()
    def upload_mviewer_help_page_to_app(
        app_id: str,
        filename: str,
        ctx: Context,
        html: str = "",
        html_base64: str = "",
        title: str = "",
        show_on_startup: bool = True,
    ) -> dict[str, Any]:
        """Store an HTML help/home page in an app workspace."""
        return _upload_help_page(
            app_id=app_id,
            filename=filename,
            ctx=ctx,
            html=html,
            html_base64=html_base64,
            title=title,
            show_on_startup=show_on_startup,
        )

    @mcp.tool()
    def install_mviewer_help_page_to_app_spec(
        app_id: str,
        spec: dict[str, Any],
        ctx: Context,
        filename: str = "help.html",
        html: str = "",
        html_base64: str = "",
        title: str = "",
        show_on_startup: bool = True,
    ) -> dict[str, Any]:
        """Store an HTML help page and patch ApplicationSpec.help/options."""
        response = _upload_help_page(
            app_id=app_id,
            filename=filename,
            ctx=ctx,
            html=html,
            html_base64=html_base64,
            title=title,
            show_on_startup=show_on_startup,
        )
        updated_spec = dict(spec)
        patch = response["application_patch"]
        updated_spec["help"] = patch["help"]
        options = dict(updated_spec.get("options", {}))
        options.update(patch.get("options", {}))
        updated_spec["options"] = options
        return {
            "spec": updated_spec,
            "stored_file": response["stored_file"],
            "application_patch": patch,
        }

    @mcp.tool()
    def upload_spatial_file_to_mviewer_app(
        app_id: str,
        filename: str,
        ctx: Context,
        content: str = "",
        content_base64: str = "",
        layer_name: str = "",
        layer_id: str = "",
        sanitize_properties: bool = False,
    ) -> dict[str, Any]:
        """Store a GeoJSON/KML/CSV/Shapefile resource in an app workspace."""
        file_content = decode_spatial_file_content(
            content=content,
            content_base64=content_base64,
        )
        logger.info(
            "MCP uploading spatial file app=%s filename=%s bytes=%s",
            app_id,
            filename,
            len(file_content),
        )
        sanitization: dict[str, Any] = {}
        if sanitize_properties and filename.lower().endswith((".geojson", ".json")):
            sanitization = sanitize_geojson_for_mviewer(file_content)
            file_content = str(sanitization["content"]).encode("utf-8")
        stored_file = mviewer_client(ctx).store_spatial_file(
            app_id,
            filename,
            file_content,
        )
        response = spatial_file_response(
            stored_file,
            layer_name=layer_name,
            layer_id=layer_id,
        )
        if sanitization:
            response["sanitization"] = sanitization
        return response

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
