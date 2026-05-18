"""Network allow-list policy shared by MCP tools."""

from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlparse
import json

from .mcp_config import current_settings


def allowed_ogc_hosts() -> list[str]:
    """Return hosts that MCP OGC tools are allowed to contact."""
    return sorted(_allowed_hosts())


def assert_allowed_url(url: str) -> None:
    """Restrict remote OGC calls to configured providers and explicit extras."""
    settings = current_settings()
    allowed = _allowed_hosts()
    if not allowed:
        if settings.allow_unconfigured_hosts:
            return
        raise ValueError(
            "No OGC host is allowed. Configure config.json data_providers, "
            "MVIEWERSTUDIO_MCP_ALLOWED_HOSTS, or set "
            "MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS=true for development."
        )
    host = host_from_url(url)
    if host not in allowed:
        raise ValueError(
            f"Host {host} is not allowed. Add it to config.json data_providers "
            "or MVIEWERSTUDIO_MCP_ALLOWED_HOSTS."
        )


def configured_providers(provider_type: str) -> list[dict[str, Any]]:
    """Read configured providers of one type from config.json."""
    providers = configured_data_providers()
    return [
        provider
        for provider in providers.get(provider_type, [])
        if isinstance(provider, dict)
    ]


def configured_data_providers() -> dict[str, Any]:
    """Read the data_providers section from the frontend configuration."""
    settings = current_settings()
    config_path = Path(
        settings.mviewerstudio_config_path
        or Path(__file__).resolve().parents[1] / "static" / "config.json"
    )
    try:
        with config_path.open(encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (OSError, json.JSONDecodeError):
        return {}
    return data.get("app_conf", {}).get("data_providers", {})


def host_from_url(url: str) -> str:
    """Normalize a URL or host value into a lowercase hostname."""
    parsed = urlparse(url if "://" in url else f"//{url}")
    return (parsed.hostname or "").lower()


def _allowed_hosts() -> set[str]:
    return (
        _configured_provider_hosts()
        | _configured_baselayer_hosts()
        | _env_allowed_hosts()
    )


def _configured_provider_hosts() -> set[str]:
    hosts: set[str] = set()
    for provider_type in ("wms", "csw"):
        for provider in configured_providers(provider_type):
            hosts.update(_hosts_from_url(provider.get("url", "")))
    return hosts


def _configured_baselayer_hosts() -> set[str]:
    hosts: set[str] = set()
    baselayers = _configured_baselayers()
    if isinstance(baselayers, dict):
        candidates = baselayers.values()
    elif isinstance(baselayers, list):
        candidates = baselayers
    else:
        candidates = []
    for baselayer in candidates:
        if isinstance(baselayer, dict):
            hosts.update(_hosts_from_url(baselayer.get("url", "")))
    return hosts


def _configured_baselayers() -> Any:
    settings = current_settings()
    config_path = Path(
        settings.mviewerstudio_config_path
        or Path(__file__).resolve().parents[1] / "static" / "config.json"
    )
    try:
        with config_path.open(encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (OSError, json.JSONDecodeError):
        return {}
    return data.get("app_conf", {}).get("baselayers", {})


def _hosts_from_url(url: str) -> set[str]:
    host = host_from_url(url)
    if not host:
        return set()
    hosts = {host}
    if "{a-c}" in host:
        hosts.update(host.replace("{a-c}", value) for value in ("a", "b", "c"))
    if "{abc}" in host:
        hosts.update(host.replace("{abc}", value) for value in ("a", "b", "c"))
    return hosts


def _env_allowed_hosts() -> set[str]:
    hosts: set[str] = set()
    for value in current_settings().allowed_ogc_hosts.split(","):
        host = host_from_url(value.strip())
        if host:
            hosts.add(host)
    return hosts
