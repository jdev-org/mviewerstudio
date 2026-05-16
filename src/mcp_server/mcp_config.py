"""Configuration loader for the MviewerStudio MCP server."""

from __future__ import annotations

from pathlib import Path
from typing import Mapping
import os
import shlex


DEFAULT_CONFIG_PATH = Path(__file__).with_name("mcp_server.conf")
CONFIG_PATH_ENV = "MVIEWERSTUDIO_MCP_CONFIG"


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

