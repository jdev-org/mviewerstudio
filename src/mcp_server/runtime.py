"""Shared runtime helpers for MCP tool registration."""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import Context

from .client import MviewerStudioClient
from .connectivity import fix_app_connectivity
from .mcp_config import current_settings


def mviewer_client(ctx: Context) -> MviewerStudioClient:
    """Create a backend client using only trusted MCP identity sources."""
    return MviewerStudioClient(identity_headers=trusted_request_identity_headers(ctx))


def maybe_fix_app_connectivity(
    spec: dict[str, Any],
    client: MviewerStudioClient,
    validate_connectivity: bool,
    public_origin: str,
    timeout: float,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Optionally validate layers and enable useproxy only where it is needed."""
    if not validate_connectivity:
        return spec, {"enabled": False}
    fixed = fix_app_connectivity(
        spec,
        public_origin=public_origin,
        timeout=timeout,
        backend_headers=client.user_headers(),
    )
    connectivity = dict(fixed["connectivity"])
    connectivity["enabled"] = True
    connectivity["changed_layers"] = fixed.get("changed_layers", [])
    return fixed["spec"], connectivity


def trusted_request_identity_headers(ctx: Context) -> dict[str, str]:
    """Forward sec-* headers only when the MCP endpoint is behind a trusted gateway."""
    if not trust_request_identity_headers():
        return {}
    try:
        request = ctx.request_context.request
    except ValueError:
        return {}
    headers = getattr(request, "headers", {}) if request is not None else {}
    trusted: dict[str, str] = {}
    for key in (
        "sec-username",
        "sec-firstname",
        "sec-lastname",
        "sec-org",
        "sec-roles",
    ):
        value = headers.get(key) if headers else None
        if value:
            trusted[key] = value
    return trusted


def trust_request_identity_headers() -> bool:
    return current_settings().trust_request_headers


def allow_tool_identity_override() -> bool:
    return current_settings().allow_identity_override


def publish_name(title: str) -> str:
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


def stateless_http_enabled() -> bool:
    return current_settings().stateless_http
