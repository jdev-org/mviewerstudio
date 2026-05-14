"""Regression tests for MCP identity forwarding rules."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from .client import MviewerStudioClient


class TestClientIdentity(unittest.TestCase):
    def test_tool_identity_arguments_are_ignored_by_default(self) -> None:
        """LLM-provided username/org parameters must not impersonate users."""
        with patch.dict(
            os.environ,
            {
                "MCP_DEFAULT_USERNAME": "server-user",
                "MCP_DEFAULT_ORG": "server-org",
                "MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE": "",
            },
        ):
            headers = MviewerStudioClient().user_headers(
                username="prompt-user",
                organisation="prompt-org",
            )

        self.assertEqual(headers["sec-username"], "server-user")
        self.assertEqual(headers["sec-org"], "server-org")

    def test_trusted_gateway_headers_define_identity(self) -> None:
        """Headers accepted by the MCP server should be forwarded to the backend."""
        with patch.dict(
            os.environ,
            {
                "MCP_DEFAULT_USERNAME": "server-user",
                "MCP_DEFAULT_ORG": "server-org",
                "MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE": "",
            },
        ):
            headers = MviewerStudioClient(
                identity_headers={
                    "Sec-Username": "gateway-user",
                    "Sec-Org": "gateway-org",
                    "Sec-Roles": "USER;ROLE_MVIEWER_ADMIN",
                }
            ).user_headers(username="prompt-user", organisation="prompt-org")

        self.assertEqual(headers["sec-username"], "gateway-user")
        self.assertEqual(headers["sec-org"], "gateway-org")
        self.assertEqual(headers["sec-roles"], "USER;ROLE_MVIEWER_ADMIN")

    def test_tool_identity_override_requires_explicit_env_flag(self) -> None:
        """Development-only identity override should be opt-in."""
        with patch.dict(
            os.environ,
            {
                "MCP_DEFAULT_USERNAME": "server-user",
                "MCP_DEFAULT_ORG": "server-org",
                "MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE": "true",
            },
        ):
            headers = MviewerStudioClient().user_headers(
                username="prompt-user",
                organisation="prompt-org",
            )

        self.assertEqual(headers["sec-username"], "prompt-user")
        self.assertEqual(headers["sec-org"], "prompt-org")


if __name__ == "__main__":
    unittest.main()
