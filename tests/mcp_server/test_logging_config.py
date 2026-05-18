"""Regression tests for MCP server logging setup."""

from __future__ import annotations

import logging
import tempfile
import unittest
from pathlib import Path

from src.mcp_server.logging_config import setup_mcp_logging
from src.mcp_server.mcp_config import McpSettings


class TestMcpLoggingConfig(unittest.TestCase):
    def setUp(self) -> None:
        root_logger = logging.getLogger()
        self.root_level = root_logger.level
        self.null_handler = logging.NullHandler()
        root_logger.addHandler(self.null_handler)

    def tearDown(self) -> None:
        root_logger = logging.getLogger()
        for handler in list(root_logger.handlers):
            if getattr(handler, "_mviewerstudio_mcp_file_handler", False) or getattr(
                handler,
                "_mviewerstudio_mcp_stream_handler",
                False,
            ):
                root_logger.removeHandler(handler)
                handler.close()
        root_logger.removeHandler(self.null_handler)
        root_logger.setLevel(self.root_level)

    def test_setup_mcp_logging_writes_to_configured_file(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            log_path = Path(directory) / "mcp_server.log"
            settings = McpSettings(
                log_level="DEBUG",
                log_file=str(log_path),
                log_max_bytes=1024,
                log_backup_count=1,
            )

            configured_path = setup_mcp_logging(settings)
            logging.getLogger("src.mcp_server.test").debug("mcp debug marker")
            for handler in logging.getLogger().handlers:
                handler.flush()

            self.assertEqual(configured_path, log_path)
            self.assertIn(
                "mcp debug marker",
                log_path.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()
