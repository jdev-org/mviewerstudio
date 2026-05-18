"""Configuration loader for the MviewerStudio MCP server."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping
import os
import shlex

import requests


DEFAULT_CONFIG_PATH = Path("/etc/mviewerstudio/mcp_server.conf")
EXAMPLE_CONFIG_PATH = Path(__file__).with_name("mcp_server.conf.example")
CONFIG_PATH_ENV = "MVIEWERSTUDIO_MCP_CONFIG"
_BACKEND_CONFIG_CACHE: dict[tuple[str, float], dict[str, Any]] = {}


def load_mcp_config(
    path: str | os.PathLike[str] | None = None,
    *,
    environ: dict[str, str] | None = None,
    override: bool = False,
) -> dict[str, str]:
    """Load a dotenv-like MCP config file as environment defaults.

    Existing environment variables win by default. This keeps Docker, systemd
    and gateway deployments in control while still allowing local dev to use a
    documented config file.
    """
    target_env = environ if environ is not None else os.environ
    config_path = _config_path(path, target_env)
    if not config_path.exists():
        return {}
    values = parse_mcp_config(config_path.read_text(encoding="utf-8"))
    for key, value in values.items():
        if override or key not in target_env:
            target_env[key] = value
    return values


@dataclass(frozen=True)
class McpSettings:
    """Typed view over MCP environment settings."""

    transport: str = "stdio"
    fastmcp_host: str = "127.0.0.1"
    fastmcp_port: int = 8030
    stateless_http: bool = True
    mviewerstudio_base_url: str = "http://localhost/mviewerstudio"
    mviewer_base_url: str = "http://localhost/mviewer/"
    mviewer_fqdn: str = ""
    mviewer_public_origin: str = ""
    mviewer_conf_path: str = "apps/store/"
    mviewer_public_path: str = "apps/public"
    mviewer_instance_path: str = "/mviewer/"
    mviewer_apps_root: str = "apps"
    mviewer_addons_path: str = ""
    mviewerstudio_config_path: str = ""
    default_username: str = "ai"
    default_org: str = "my_org"
    trust_request_headers: bool = False
    allow_identity_override: bool = False
    allowed_ogc_hosts: str = ""
    allow_unconfigured_hosts: bool = False
    inline_data_max_bytes: int = 8192
    xml_max_bytes: int = 1048576
    spatial_file_max_bytes: int = 10485760
    help_file_max_bytes: int = 262144
    log_level: str = "INFO"
    log_file: str = "logs/mcp_server.log"
    log_max_bytes: int = 10485760
    log_backup_count: int = 5

    @classmethod
    def from_env(
        cls,
        environ: Mapping[str, str] | None = None,
        backend_config: Mapping[str, Any] | None = None,
    ) -> "McpSettings":
        env = environ or os.environ
        backend = backend_config or {}
        return cls(
            transport=env.get("MCP_TRANSPORT", "stdio"),
            fastmcp_host=env.get("FASTMCP_HOST", "127.0.0.1"),
            fastmcp_port=int(env.get("FASTMCP_PORT", "8030")),
            stateless_http=_bool(env.get("MVIEWERSTUDIO_MCP_STATELESS_HTTP", "true")),
            mviewerstudio_base_url=env.get(
                "MVIEWERSTUDIO_BASE_URL",
                "http://localhost/mviewerstudio",
            ),
            mviewer_base_url=env.get("MVIEWER_BASE_URL", "http://localhost/mviewer/"),
            mviewer_fqdn=env.get("MVIEWER_FQDN", ""),
            mviewer_public_origin=env.get("MVIEWER_PUBLIC_ORIGIN", ""),
            mviewer_conf_path=_setting(
                env,
                "MVIEWER_CONF_PATH",
                backend,
                ("mviewer", "conf_path"),
                "apps/store/",
            ),
            mviewer_public_path=_setting(
                env,
                "MVIEWER_PUBLIC_PATH",
                backend,
                ("mviewer", "public_path"),
                "apps/public",
            ),
            mviewer_instance_path=env.get("MVIEWER_INSTANCE_PATH", "/mviewer/"),
            mviewer_apps_root=env.get("MVIEWER_APPS_ROOT", str(Path.cwd() / "apps")),
            mviewer_addons_path=env.get("MVIEWER_ADDONS_PATH", ""),
            mviewerstudio_config_path=env.get("MVIEWERSTUDIO_CONFIG_PATH", ""),
            default_username=env.get("MCP_DEFAULT_USERNAME", "ai"),
            default_org=env.get("MCP_DEFAULT_ORG", "my_org"),
            trust_request_headers=_bool(
                env.get("MVIEWERSTUDIO_MCP_TRUST_REQUEST_HEADERS", "")
            ),
            allow_identity_override=_bool(
                env.get("MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE", "")
            ),
            allowed_ogc_hosts=env.get("MVIEWERSTUDIO_MCP_ALLOWED_HOSTS", ""),
            allow_unconfigured_hosts=_bool(
                env.get("MVIEWERSTUDIO_MCP_ALLOW_UNCONFIGURED_HOSTS", "")
            ),
            inline_data_max_bytes=int(
                env.get("MVIEWERSTUDIO_MCP_INLINE_DATA_MAX_BYTES", "8192")
            ),
            xml_max_bytes=int(
                _first_setting(
                    env,
                    ("MVIEWERSTUDIO_MCP_XML_MAX_BYTES", "MVIEWERSTUDIO_XML_MAX_BYTES"),
                    backend,
                    ("limits", "xml_max_bytes"),
                    "1048576",
                )
            ),
            spatial_file_max_bytes=int(
                _first_setting(
                    env,
                    (
                        "MVIEWERSTUDIO_MCP_SPATIAL_FILE_MAX_BYTES",
                        "MVIEWERSTUDIO_SPATIAL_FILE_MAX_BYTES",
                    ),
                    backend,
                    ("limits", "spatial_file_max_bytes"),
                    "10485760",
                )
            ),
            help_file_max_bytes=int(
                _first_setting(
                    env,
                    (
                        "MVIEWERSTUDIO_MCP_HELP_FILE_MAX_BYTES",
                        "MVIEWERSTUDIO_HELP_FILE_MAX_BYTES",
                    ),
                    backend,
                    ("limits", "help_file_max_bytes"),
                    "262144",
                )
            ),
            log_level=env.get(
                "MVIEWERSTUDIO_MCP_LOG_LEVEL",
                env.get("LOG_LEVEL", "INFO"),
            ),
            log_file=env.get("MVIEWERSTUDIO_MCP_LOG_FILE", "logs/mcp_server.log"),
            log_max_bytes=int(
                env.get("MVIEWERSTUDIO_MCP_LOG_MAX_BYTES", "10485760")
            ),
            log_backup_count=int(env.get("MVIEWERSTUDIO_MCP_LOG_BACKUP_COUNT", "5")),
        )


def current_settings() -> McpSettings:
    """Return current settings after applying the configured MCP file."""
    load_mcp_config()
    env = os.environ
    backend_config = {}
    if _bool(env.get("MVIEWERSTUDIO_MCP_USE_BACKEND_CONFIG", "true")):
        backend_config = fetch_backend_mcp_config(
            env.get("MVIEWERSTUDIO_BASE_URL", "http://localhost/mviewerstudio"),
            timeout=float(env.get("MVIEWERSTUDIO_MCP_BACKEND_CONFIG_TIMEOUT", "0.5")),
        )
    return McpSettings.from_env(env, backend_config=backend_config)


def fetch_backend_mcp_config(base_url: str, timeout: float = 0.5) -> dict[str, Any]:
    """Fetch non-sensitive defaults published by the MviewerStudio backend."""
    cache_key = (base_url.rstrip("/"), timeout)
    if cache_key in _BACKEND_CONFIG_CACHE:
        return _BACKEND_CONFIG_CACHE[cache_key]
    try:
        response = requests.get(
            f"{cache_key[0]}/api/config/mcp",
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        return {}
    if not isinstance(payload, dict):
        return {}
    _BACKEND_CONFIG_CACHE[cache_key] = payload
    return payload


def parse_mcp_config(content: str) -> dict[str, str]:
    """Parse shell-style KEY=VALUE lines with comments."""
    values: dict[str, str] = {}
    for line_number, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            raise ValueError(f"Invalid MCP config line {line_number}: missing '='")
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or not key.replace("_", "").isalnum() or key[0].isdigit():
            raise ValueError(f"Invalid MCP config line {line_number}: invalid key")
        values[key] = _parse_value(value)
    return values


def _config_path(
    path: str | os.PathLike[str] | None,
    environ: Mapping[str, str],
) -> Path:
    if path is not None:
        return Path(path)
    configured = environ.get(CONFIG_PATH_ENV, "")
    return Path(configured) if configured else DEFAULT_CONFIG_PATH


def _parse_value(value: str) -> str:
    lexer = shlex.shlex(value, posix=True)
    lexer.whitespace_split = True
    lexer.commenters = "#"
    parts = list(lexer)
    return " ".join(parts) if parts else ""


def _bool(value: str) -> bool:
    return value.lower() in {"1", "true", "yes", "on"}


def _setting(
    env: Mapping[str, str],
    env_name: str,
    backend: Mapping[str, Any],
    backend_path: tuple[str, str],
    default: str,
) -> str:
    return _first_setting(env, (env_name,), backend, backend_path, default)


def _first_setting(
    env: Mapping[str, str],
    env_names: tuple[str, ...],
    backend: Mapping[str, Any],
    backend_path: tuple[str, str],
    default: str,
) -> str:
    for env_name in env_names:
        if env.get(env_name, "") != "":
            return env[env_name]
    value = _backend_value(backend, backend_path)
    if value is not None and value != "":
        return str(value)
    return default


def _backend_value(
    backend: Mapping[str, Any],
    backend_path: tuple[str, str],
) -> Any:
    section = backend.get(backend_path[0])
    if not isinstance(section, Mapping):
        return None
    return section.get(backend_path[1])
