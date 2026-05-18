"""Logging setup for the MviewerStudio MCP server."""

from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
import sys

from .mcp_config import McpSettings, current_settings


_MCP_FILE_HANDLER = "_mviewerstudio_mcp_file_handler"
_MCP_STREAM_HANDLER = "_mviewerstudio_mcp_stream_handler"
_FORMAT = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"


def setup_mcp_logging(settings: McpSettings | None = None) -> Path | None:
    """Configure console and rotating file logs for the MCP process."""
    settings = settings or current_settings()
    level = _level(settings.log_level)
    formatter = logging.Formatter(_FORMAT)
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    _remove_mcp_file_handlers(root_logger)
    _ensure_stream_handler(root_logger, level, formatter)

    for handler in root_logger.handlers:
        handler.setLevel(level)

    log_file = settings.log_file.strip()
    if not log_file:
        logging.getLogger(__name__).info("MCP file logging disabled")
        return None

    path = Path(log_file)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        handler = RotatingFileHandler(
            path,
            maxBytes=max(0, settings.log_max_bytes),
            backupCount=max(0, settings.log_backup_count),
            encoding="utf-8",
        )
    except OSError as exc:
        logging.getLogger(__name__).warning(
            "Unable to initialize MCP file logging at %s: %s",
            path,
            exc,
        )
        return None

    setattr(handler, _MCP_FILE_HANDLER, True)
    handler.setFormatter(formatter)
    handler.setLevel(level)
    root_logger.addHandler(handler)
    logging.getLogger(__name__).info("MCP file logging enabled at %s", path)
    return path


def _ensure_stream_handler(
    root_logger: logging.Logger,
    level: int,
    formatter: logging.Formatter,
) -> None:
    if root_logger.handlers:
        return
    handler = logging.StreamHandler(sys.stderr)
    setattr(handler, _MCP_STREAM_HANDLER, True)
    handler.setFormatter(formatter)
    handler.setLevel(level)
    root_logger.addHandler(handler)


def _remove_mcp_file_handlers(root_logger: logging.Logger) -> None:
    for handler in list(root_logger.handlers):
        if getattr(handler, _MCP_FILE_HANDLER, False):
            root_logger.removeHandler(handler)
            handler.close()


def _level(value: str) -> int:
    level = getattr(logging, value.upper(), None)
    if isinstance(level, int):
        return level
    return logging.INFO
