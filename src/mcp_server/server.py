"""FastMCP entrypoint exposing MviewerStudio capabilities as agent tools."""

from __future__ import annotations

import argparse
import logging

from mcp.server.fastmcp import FastMCP

from .logging_config import setup_mcp_logging
from .mcp_config import current_settings
from .runtime import stateless_http_enabled
from .tools import register_app_tools, register_context_tools, register_resource_tools


logger = logging.getLogger(__name__)


def create_mcp_server(host: str = "127.0.0.1", port: int = 8030) -> FastMCP:
    """Create a configured FastMCP server without starting its transport."""
    logger.info("Creating MviewerStudio MCP server on %s:%s", host, port)
    mcp = FastMCP(
        "MviewerStudio",
        instructions=(
            "Create, preview and publish mviewer applications through "
            "MviewerStudio. Prefer the structured ApplicationSpec JSON tools "
            "instead of generating raw XML by hand. When generated GeoJSON/KML "
            "exceeds the inline_data_policy limit from capabilities, store it "
            "with upload_spatial_file_to_mviewer_app instead of embedding a "
            "data: URL in XML. When the user asks for an explanation, welcome "
            "or information page, store a static HTML page with "
            "upload_mviewer_help_page_to_app or "
            "install_mviewer_help_page_to_app_spec and set ApplicationSpec.help."
        ),
        host=host,
        port=port,
        json_response=True,
        # MviewerStudio MCP tools do not keep per-client state. Stateless HTTP
        # keeps streamable-http compatible with clients that do not persist the
        # mcp-session-id header between requests.
        stateless_http=stateless_http_enabled(),
    )
    register_context_tools(mcp)
    register_app_tools(mcp)
    register_resource_tools(mcp)
    logger.debug("MviewerStudio MCP tools registered")

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


def main() -> None:
    """CLI entrypoint used by Docker Compose and local stdio launches."""
    settings = current_settings()
    setup_mcp_logging(settings)
    parser = argparse.ArgumentParser(description="Run the MviewerStudio MCP server.")
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse", "streamable-http"],
        default=settings.transport,
    )
    parser.add_argument("--host", default=settings.fastmcp_host)
    parser.add_argument("--port", type=int, default=settings.fastmcp_port)
    args = parser.parse_args()
    logger.info(
        "Starting MviewerStudio MCP server transport=%s host=%s port=%s "
        "base_url=%s mviewer_url=%s",
        args.transport,
        args.host,
        args.port,
        settings.mviewerstudio_base_url,
        settings.mviewer_base_url,
    )
    create_mcp_server(host=args.host, port=args.port).run(transport=args.transport)


if __name__ == "__main__":
    main()
