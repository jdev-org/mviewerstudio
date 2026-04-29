"""FastMCP entrypoint exposing MviewerStudio capabilities as agent tools.

This module is deliberately thin: it defines the MCP protocol surface, then
delegates backend calls to `MviewerStudioClient`, OGC discovery to `ogc_tools`,
input validation to `schemas`, and XML generation to `xml_builder`.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any
import argparse
import json
import os

from mcp.server.fastmcp import FastMCP

from .client import MviewerStudioClient
from .ogc_tools import (
    allowed_ogc_hosts,
    inspect_wms_layer,
    search_csw_records,
    search_wms_layers,
)
from .schemas import ApplicationSpec, example_application_spec
from .xml_builder import build_mviewer_xml


def create_mcp_server(host: str = "127.0.0.1", port: int = 8030) -> FastMCP:
    """Create a configured FastMCP server without starting its transport."""
    mcp = FastMCP(
        "MviewerStudio",
        instructions=(
            "Create, preview and publish mviewer applications through "
            "MviewerStudio. Prefer the structured ApplicationSpec JSON tools "
            "instead of generating raw XML by hand."
        ),
        host=host,
        port=port,
        json_response=True,
    )

    # Resources are read-only context documents. They help an agent understand
    # the local MviewerStudio instance before it starts calling mutating tools.
    @mcp.resource(
        "mviewerstudio://capabilities",
        name="MviewerStudio capabilities",
        mime_type="application/json",
    )
    def capabilities_resource() -> str:
        """Return frontend configuration: versions, basemaps and data providers."""
        return json.dumps(_load_capabilities(), ensure_ascii=False, indent=2)

    @mcp.resource(
        "mviewerstudio://application-spec/example",
        name="Example ApplicationSpec",
        mime_type="application/json",
    )
    def example_spec_resource() -> str:
        """Return a minimal ApplicationSpec accepted by create_or_update_mviewer_app."""
        return json.dumps(example_application_spec(), ensure_ascii=False, indent=2)

    # Tool naming stays explicit on purpose. Agents tend to choose better actions
    # when build, save, preview and publish are separate capabilities.
    @mcp.tool()
    def get_mviewerstudio_capabilities() -> dict[str, Any]:
        """Get configured mviewer versions, baselayers and OGC data providers."""
        return _load_capabilities()

    @mcp.tool()
    def get_application_spec_example() -> dict[str, Any]:
        """Get a minimal JSON payload for create_or_update_mviewer_app."""
        return example_application_spec()

    @mcp.tool()
    def build_mviewer_config_xml(spec: dict[str, Any]) -> dict[str, str]:
        """Build and validate mviewer XML from an ApplicationSpec without saving it."""
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        return {"app_id": app_spec.id, "xml": xml}

    @mcp.tool()
    def create_or_update_mviewer_app(
        spec: dict[str, Any],
        username: str = "",
        organisation: str = "",
    ) -> dict[str, Any]:
        """Create or update a MviewerStudio draft application from ApplicationSpec."""
        # ApplicationSpec is the backend contract: callers provide structured
        # intent, while Python owns XML serialization and MviewerStudio API calls.
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        client = MviewerStudioClient()
        response = client.create_or_update_app(
            app_spec.id,
            xml,
            username=username or None,
            organisation=organisation or None,
        )
        filepath = response.get("filepath") or response.get("config", {}).get("url")
        return {
            "app_id": app_spec.id,
            "draft_file": filepath,
            "preview_url": client.draft_url(filepath) if filepath else "",
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def preview_mviewer_app(
        spec: dict[str, Any],
        username: str = "",
        organisation: str = "",
    ) -> dict[str, Any]:
        """Save the draft and create a temporary preview URL for this ApplicationSpec."""
        # Preview in MviewerStudio expects the draft workspace to exist, so this
        # first saves the XML through the normal create/update endpoint.
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        client = MviewerStudioClient()
        save_response = client.create_or_update_app(
            app_spec.id,
            xml,
            username=username or None,
            organisation=organisation or None,
        )
        preview_response = client.preview_app(
            app_spec.id,
            xml,
            username=username or None,
            organisation=organisation or None,
        )
        preview_file = preview_response.get("file", "")
        return {
            "app_id": app_spec.id,
            "draft_file": save_response.get("filepath")
            or save_response.get("config", {}).get("url"),
            "preview_file": preview_file,
            "preview_url": client.preview_url(preview_file) if preview_file else "",
        }

    @mcp.tool()
    def publish_mviewer_app(
        spec: dict[str, Any],
        publish_name: str = "",
        username: str = "",
        organisation: str = "",
    ) -> dict[str, Any]:
        """Save then publish a mviewer application and return share/iframe URLs."""
        # Publishing receives the same XML as saving to keep draft and public
        # content aligned when an agent performs both operations in one step.
        app_spec = ApplicationSpec.from_dict(spec)
        xml = build_mviewer_xml(app_spec)
        client = MviewerStudioClient()
        client.create_or_update_app(
            app_spec.id,
            xml,
            username=username or None,
            organisation=organisation or None,
        )
        name = publish_name or _publish_name(app_spec.title)
        response = client.publish_app(
            app_spec.id,
            name,
            xml,
            username=username or None,
            organisation=organisation or None,
        )
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
            "mviewerstudio_response": response,
        }

    @mcp.tool()
    def list_mviewer_apps(
        search: str = "",
        username: str = "",
        organisation: str = "",
    ) -> list[dict[str, Any]]:
        """List draft applications visible to the provided user/organisation."""
        return MviewerStudioClient().list_apps(
            search=search or None,
            username=username or None,
            organisation=organisation or None,
        )

    @mcp.tool()
    def store_layer_template(
        app_id: str,
        layer_id: str,
        template: str,
        username: str = "",
        organisation: str = "",
    ) -> dict[str, Any]:
        """Store a Mustache template file for one existing app layer."""
        return MviewerStudioClient().store_template(
            app_id,
            layer_id,
            template,
            username=username or None,
            organisation=organisation or None,
        )

    @mcp.tool()
    def store_sld_style(
        sld: str,
        username: str = "",
        organisation: str = "",
    ) -> dict[str, Any]:
        """Store an SLD style and return the mviewer-accessible style path."""
        return MviewerStudioClient().store_sld(
            sld,
            username=username or None,
            organisation=organisation or None,
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

    @mcp.prompt(title="Tester la creation d'application mviewer")
    def test_mviewer_creation_prompt(topic: str = "mobilite") -> str:
        """Prompt in French to test this MCP server end to end."""
        return test_prompt(topic)

    return mcp


def test_prompt(topic: str = "mobilite") -> str:
    """Return a human-readable prompt that exercises the main MCP workflow."""
    return f"""
Tu as acces au MCP MviewerStudio. Cree une application mviewer de demonstration sur le theme "{topic}".

Procedure attendue :
1. Lis `mviewerstudio://capabilities` ou appelle `get_mviewerstudio_capabilities`.
2. Cherche une couche WMS pertinente avec `search_wms` dans un fournisseur disponible, par exemple `https://ows.region-bretagne.fr/geoserver/rb/wms`.
3. Construis un `ApplicationSpec` JSON avec un titre explicite, un fond de plan visible, un theme et au moins une couche WMS.
4. Appelle `preview_mviewer_app` pour sauvegarder le brouillon et obtenir une URL de previsualisation.
5. Donne-moi l'URL de previsualisation et resume les couches ajoutees.

Ne genere pas de XML a la main sauf pour diagnostiquer avec `build_mviewer_config_xml`.
""".strip()


def _load_capabilities() -> dict[str, Any]:
    """Read the frontend configuration and expose only agent-relevant sections."""
    config_path = Path(
        os.getenv(
            "MVIEWERSTUDIO_CONFIG_PATH",
            Path(__file__).resolve().parents[1] / "static" / "config.json",
        )
    )
    with config_path.open(encoding="utf-8") as config_file:
        data = json.load(config_file)
    app_conf = data.get("app_conf", {})
    return {
        "studio_title": app_conf.get("studio_title"),
        "mviewer_version": app_conf.get("mviewer_version"),
        "mviewerstudio_version": app_conf.get("mviewerstudio_version"),
        "baselayers": app_conf.get("baselayers", {}),
        "data_providers": app_conf.get("data_providers", {}),
        "default_layer_params": app_conf.get("default_params", {}).get("layer", {}),
        "mcp_allowed_ogc_hosts": allowed_ogc_hosts(),
    }


def _publish_name(title: str) -> str:
    """Convert a title into a conservative public filename accepted by mviewer."""
    value = title.lower()
    replacements = {
        "à": "a",
        "á": "a",
        "â": "a",
        "ä": "a",
        "ç": "c",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ë": "e",
        "î": "i",
        "ï": "i",
        "ô": "o",
        "ö": "o",
        "ù": "u",
        "û": "u",
        "ü": "u",
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    value = "".join(char if char.isalnum() or char == "_" else "_" for char in value)
    return value.strip("_")[:20] or "mviewer_app"


def main() -> None:
    """CLI entrypoint used by Docker Compose and local stdio launches."""
    parser = argparse.ArgumentParser(description="Run the MviewerStudio MCP server.")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=os.getenv("MCP_TRANSPORT", "stdio"),
    )
    parser.add_argument("--host", default=os.getenv("FASTMCP_HOST", "127.0.0.1"))
    parser.add_argument(
        "--port", type=int, default=int(os.getenv("FASTMCP_PORT", "8030"))
    )
    args = parser.parse_args()
    create_mcp_server(host=args.host, port=args.port).run(transport=args.transport)


if __name__ == "__main__":
    main()
