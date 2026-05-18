"""MCP tools that create, update, preview and publish mviewer applications."""

from __future__ import annotations

import logging
from typing import Any

from mcp.server.fastmcp import Context, FastMCP

from ..connectivity import fix_app_connectivity, validate_app_connectivity
from ..intent_tools import app_spec_from_intent
from ..runtime import maybe_fix_app_connectivity, mviewer_client, publish_name
from ..schemas import ApplicationSpec
from ..xml_builder import build_mviewer_xml
from ..xml_parser import mviewer_xml_to_spec


logger = logging.getLogger(__name__)


def register_app_tools(mcp: FastMCP) -> None:
    """Register mutating application lifecycle tools."""

    @mcp.tool()
    def build_mviewer_config_xml(spec: dict[str, Any]) -> dict[str, str]:
        """Build and validate mviewer XML from an ApplicationSpec without saving it."""
        app_spec = ApplicationSpec.from_dict(spec)
        logger.debug("Building mviewer XML for app %s", app_spec.id)
        xml = build_mviewer_xml(app_spec)
        return {"app_id": app_spec.id, "xml": xml}

    @mcp.tool()
    def validate_mviewer_app_connectivity(
        spec: dict[str, Any],
        ctx: Context,
        public_origin: str = "",
        timeout: float = 10,
    ) -> dict[str, Any]:
        """Check layer availability, browser CORS risk and proxy fallback."""
        client = mviewer_client(ctx)
        logger.info("Validating mviewer app connectivity")
        return validate_app_connectivity(
            spec,
            public_origin=public_origin,
            timeout=timeout,
            backend_headers=client.user_headers(),
        )

    @mcp.tool()
    def fix_mviewer_app_connectivity(
        spec: dict[str, Any],
        ctx: Context,
        public_origin: str = "",
        timeout: float = 10,
    ) -> dict[str, Any]:
        """Return an ApplicationSpec copy with useproxy enabled only where required."""
        client = mviewer_client(ctx)
        logger.info("Fixing mviewer app connectivity when needed")
        return fix_app_connectivity(
            spec,
            public_origin=public_origin,
            timeout=timeout,
            backend_headers=client.user_headers(),
        )

    @mcp.tool()
    def create_or_update_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Create or update a MviewerStudio draft application from ApplicationSpec."""
        client = mviewer_client(ctx)
        spec, connectivity = maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        logger.info("Creating/updating app %s through MCP", app_spec.id)
        response = client.create_or_update_app(app_spec.id, xml)
        filepath = response.get("filepath") or response.get("config", {}).get("url")
        return {
            "app_id": app_spec.id,
            "draft_file": filepath,
            "preview_url": client.draft_url(filepath) if filepath else "",
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def preview_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Save the draft and create a temporary preview URL for this ApplicationSpec."""
        client = mviewer_client(ctx)
        spec, connectivity = maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        logger.info("Creating preview for app %s through MCP", app_spec.id)
        save_response = client.create_or_update_app(app_spec.id, xml)
        preview_response = client.preview_app(app_spec.id, xml)
        preview_file = preview_response.get("file", "")
        return {
            "app_id": app_spec.id,
            "draft_file": save_response.get("filepath")
            or save_response.get("config", {}).get("url"),
            "preview_file": preview_file,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
            "connectivity": connectivity,
        }

    @mcp.tool()
    def publish_mviewer_app(
        spec: dict[str, Any],
        ctx: Context,
        publish_name: str = "",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Save then publish a mviewer application and return share/iframe URLs."""
        client = mviewer_client(ctx)
        spec, connectivity = maybe_fix_app_connectivity(
            spec,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        logger.info("Publishing app %s through MCP", app_spec.id)
        client.create_or_update_app(app_spec.id, xml)
        name = publish_name or publish_name_from_title(app_spec.title)
        response = client.publish_app(app_spec.id, name, xml)
        online_file = response.get("online_file", "")
        share_url = client.public_url(online_file) if online_file else ""
        return {
            "app_id": app_spec.id,
            "publish_name": name,
            "online_file": online_file,
            "share_url": share_url,
            "iframe": (
                f'<iframe allowFullScreen style="border: none;" '
                f'height="600" width="800" src="{share_url}"></iframe>'
                if share_url
                else ""
            ),
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def list_mviewer_apps(
        ctx: Context,
        search: str = "",
    ) -> list[dict[str, Any]]:
        """List draft applications visible to the effective MCP identity."""
        logger.debug("Listing mviewer apps search=%s", search)
        return mviewer_client(ctx).list_apps(search=search or None)

    @mcp.tool()
    def get_existing_mviewer_app_spec(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Load an existing visible mviewer app as an editable ApplicationSpec."""
        client = mviewer_client(ctx)
        logger.info("Loading existing mviewer app %s", app_id)
        response = client.get_app(app_id)
        spec = mviewer_xml_to_spec(response["xml"])
        return {
            "app_id": app_id,
            "config": response.get("config", {}),
            "spec": spec,
            "xml": response["xml"],
        }

    @mcp.tool()
    def update_existing_mviewer_app(
        app_id: str,
        spec: dict[str, Any],
        ctx: Context,
        message: str = "MCP update",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
    ) -> dict[str, Any]:
        """Update an existing draft through MviewerStudio PUT, preserving UI rules."""
        payload = dict(spec)
        payload["id"] = app_id
        client = mviewer_client(ctx)
        payload, connectivity = maybe_fix_app_connectivity(
            payload,
            client,
            validate_connectivity=validate_connectivity,
            public_origin=public_origin,
            timeout=connectivity_timeout,
        )
        app_spec = ApplicationSpec.from_dict(payload)
        if app_spec.id != app_id:
            raise ValueError("ApplicationSpec id must match app_id")
        xml = build_mviewer_xml(app_spec)
        logger.info("Updating existing app %s through MCP", app_id)
        response = client.update_existing_app(
            app_id,
            xml,
            message=message or "MCP update",
        )
        filepath = response.get("filepath") or response.get("config", {}).get("url")
        return {
            "app_id": app_id,
            "draft_file": filepath,
            "preview_url": client.draft_url(filepath) if filepath else "",
            "connectivity": connectivity,
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def delete_mviewer_app(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Delete an existing draft application visible to the effective identity."""
        logger.info("Deleting mviewer app %s through MCP", app_id)
        return mviewer_client(ctx).delete_app(app_id)

    @mcp.tool()
    def unpublish_mviewer_app(
        app_id: str,
        publish_name: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Remove a published application while keeping the draft workspace."""
        logger.info("Unpublishing mviewer app %s publication=%s", app_id, publish_name)
        return mviewer_client(ctx).unpublish_app(app_id, publish_name)

    @mcp.tool()
    def list_mviewer_app_versions(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """List saved git versions for one existing application."""
        return mviewer_client(ctx).list_app_versions(app_id)

    @mcp.tool()
    def preview_mviewer_app_version(
        app_id: str,
        version: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Create a preview URL for a specific saved application version."""
        client = mviewer_client(ctx)
        response = client.preview_app_version(app_id, version)
        preview_file = response.get("file", "")
        return {
            **response,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
        }

    @mcp.tool()
    def restore_mviewer_app_version(
        app_id: str,
        version: str,
        ctx: Context,
        as_new: bool = False,
    ) -> dict[str, Any]:
        """Restore a saved version. Use as_new=true to detach it as a new working state."""
        return mviewer_client(ctx).restore_app_version(app_id, version, as_new=as_new)

    @mcp.tool()
    def create_mviewer_app_version(
        app_id: str,
        ctx: Context,
    ) -> dict[str, Any]:
        """Create a named backend version from the current draft state."""
        return mviewer_client(ctx).create_app_version(app_id)

    @mcp.tool()
    def delete_mviewer_app_versions(
        app_id: str,
        versions: list[str],
        ctx: Context,
    ) -> dict[str, Any]:
        """Delete saved application versions except the main working branch."""
        return mviewer_client(ctx).delete_app_versions(app_id, versions)

    @mcp.tool()
    def create_mviewer_app_from_intent(
        intent: str,
        ctx: Context,
        title: str = "",
        location: str = "",
        baselayer_query: str = "plan",
        max_layers: int = 3,
        audience: str = "grand_public",
        tool_preset: str = "",
        validate_connectivity: bool = True,
        public_origin: str = "",
        connectivity_timeout: float = 10,
        publish: bool = False,
        publish_name: str = "",
    ) -> dict[str, Any]:
        """Create and preview a simple public-friendly map from a plain-language need."""
        client = mviewer_client(ctx)
        spec, choices = app_spec_from_intent(
            intent=intent,
            title=title,
            location=location,
            baselayer_query=baselayer_query,
            max_layers=max_layers,
            audience=audience,
            tool_preset=tool_preset,
        )
        connectivity: dict[str, Any] = {}
        if validate_connectivity:
            spec, connectivity = maybe_fix_app_connectivity(
                spec,
                client,
                validate_connectivity=True,
                public_origin=public_origin,
                timeout=connectivity_timeout,
            )
            choices["connectivity"] = {
                "ok": connectivity.get("ok", False),
                "proxy_required_count": connectivity.get("proxy_required_count", 0),
                "proxy_fixable_count": connectivity.get("proxy_fixable_count", 0),
                "changed_layers": connectivity.get("changed_layers", []),
            }
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        logger.info("Creating app from intent app=%s publish=%s", app_spec.id, publish)
        save_response = client.create_or_update_app(app_spec.id, xml)
        preview_response = client.preview_app(app_spec.id, xml)
        preview_file = preview_response.get("file", "")
        result: dict[str, Any] = {
            "app_id": app_spec.id,
            "title": app_spec.title,
            "spec": spec,
            "choices": choices,
            "draft_file": save_response.get("filepath")
            or save_response.get("config", {}).get("url"),
            "preview_file": preview_file,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
        }
        if publish:
            name = publish_name or publish_name_from_title(app_spec.title)
            publish_response = client.publish_app(app_spec.id, name, xml)
            online_file = publish_response.get("online_file", "")
            result["publication"] = {
                "publish_name": name,
                "online_file": online_file,
                "share_url": client.public_url(online_file) if online_file else "",
                "mviewerstudio_response": publish_response,
            }
        return result


def publish_name_from_title(title: str) -> str:
    """Avoid shadowing the publish_name tool argument in nested tool functions."""
    return publish_name(title)
