"""HTTP client used by MCP tools to reuse the existing Flask backend.

The MCP server should not duplicate application persistence, preview, publishing
or style storage logic. This client keeps those operations behind the same
MviewerStudio API that the browser already uses.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional
from urllib.parse import quote
import os
import posixpath
import requests

from .mcp_config import load_mcp_config


load_mcp_config()


SEC_IDENTITY_HEADERS = (
    "sec-username",
    "sec-firstname",
    "sec-lastname",
    "sec-org",
    "sec-roles",
)


def _normalize_identity_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Keep only sec-* identity headers with normalized lowercase keys."""
    normalized: dict[str, str] = {}
    for key, value in headers.items():
        lower_key = key.lower()
        if lower_key in SEC_IDENTITY_HEADERS and value:
            normalized[lower_key] = str(value)
    return normalized


def _complete_identity_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Return a complete identity header set using trusted values or server defaults."""
    user = headers.get("sec-username") or os.getenv("MCP_DEFAULT_USERNAME", "ai")
    org = headers.get("sec-org") or os.getenv("MCP_DEFAULT_ORG", "my_org")
    return {
        "sec-username": user,
        "sec-firstname": headers.get("sec-firstname") or user,
        "sec-lastname": headers.get("sec-lastname") or "mcp",
        "sec-org": org,
        "sec-roles": headers.get("sec-roles") or "USER",
    }


def _identity_override_allowed() -> bool:
    """Allow tool-provided identity only when explicitly enabled for development."""
    return os.getenv("MVIEWERSTUDIO_MCP_ALLOW_IDENTITY_OVERRIDE", "").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


class MviewerStudioClient:
    """Small wrapper around the MviewerStudio HTTP API."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        mviewer_base_url: Optional[str] = None,
        identity_headers: Optional[Mapping[str, str]] = None,
        timeout: float = 30,
    ) -> None:
        # Environment defaults make the same code usable from Docker, local
        # stdio MCP sessions, and tests that inject explicit URLs.
        self.base_url = (base_url or os.getenv("MVIEWERSTUDIO_BASE_URL") or "http://localhost/mviewerstudio").rstrip("/")
        self.mviewer_base_url = (
            mviewer_base_url or os.getenv("MVIEWER_BASE_URL") or "http://localhost/mviewer/"
        )
        self.conf_path = os.getenv("MVIEWER_CONF_PATH", "apps/store/")
        self.public_path = os.getenv("MVIEWER_PUBLIC_PATH", "apps/public")
        self.mviewer_instance = os.getenv("MVIEWER_INSTANCE_PATH", "/mviewer/")
        self.identity_headers = _normalize_identity_headers(identity_headers or {})
        self.timeout = timeout
        self.session = requests.Session()

    def user_headers(
        self,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
        firstname: Optional[str] = None,
        lastname: Optional[str] = None,
        roles: Optional[str] = None,
    ) -> dict[str, str]:
        """Build trusted sec-* headers consumed by MviewerStudio's proxy login shim."""
        if _identity_override_allowed() and any(
            value for value in (username, organisation, firstname, lastname, roles)
        ):
            return _complete_identity_headers(
                {
                    "sec-username": username or "",
                    "sec-firstname": firstname or "",
                    "sec-lastname": lastname or "",
                    "sec-org": organisation or "",
                    "sec-roles": roles or "",
                }
            )
        if self.identity_headers:
            return _complete_identity_headers(self.identity_headers)
        return {
            **_complete_identity_headers({}),
        }

    def active_identity(self) -> dict[str, str]:
        """Return the effective identity that will be sent to the backend."""
        return self.user_headers()

    def create_or_update_app(
        self,
        app_id: str,
        xml: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
        message: str = "MCP update",
    ) -> dict[str, Any]:
        """Use POST for new apps and PUT for existing apps."""
        exists = self.app_exists(app_id, username=username, organisation=organisation)
        path = "api/app"
        params = {"message": message} if exists else None
        return self.request(
            "PUT" if exists else "POST",
            path,
            data=xml.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/xml",
            },
            params=params,
        )

    def update_existing_app(
        self,
        app_id: str,
        xml: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
        message: str = "MCP update",
    ) -> dict[str, Any]:
        """Update an existing app through the same PUT endpoint used by the UI."""
        if not self.app_exists(app_id, username=username, organisation=organisation):
            raise RuntimeError(f"Application does not exist: {app_id}")
        return self.request(
            "PUT",
            "api/app",
            data=xml.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/xml",
            },
            params={"message": message},
        )

    def get_app(
        self,
        app_id: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        """Return one stored app XML and register metadata visible to the user."""
        return self.request(
            "GET",
            f"api/app/{quote(app_id, safe='')}",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def app_exists(
        self,
        app_id: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> bool:
        response = self.request(
            "GET",
            f"api/app/{quote(app_id, safe='')}/exists",
            headers=self.user_headers(username=username, organisation=organisation),
        )
        return bool(response.get("exists"))

    def list_apps(
        self,
        search: Optional[str] = None,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        params = {"search": search} if search else None
        response = self.request(
            "GET",
            "api/app",
            headers=self.user_headers(username=username, organisation=organisation),
            params=params,
        )
        if not isinstance(response, list):
            raise RuntimeError("Unexpected list_apps response")
        return response

    def preview_app(
        self,
        app_id: str,
        xml: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            f"api/app/{quote(app_id, safe='')}/preview",
            data=xml.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/xml",
            },
        )

    def publish_app(
        self,
        app_id: str,
        publish_name: str,
        xml: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            f"api/app/{quote(app_id, safe='')}/publish/{quote(publish_name, safe='')}",
            params={"instance": self.mviewer_instance},
            data=xml.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/xml",
            },
        )

    def unpublish_app(
        self,
        app_id: str,
        publish_name: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "DELETE",
            f"api/app/{quote(app_id, safe='')}/publish/{quote(publish_name, safe='')}",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def delete_app(
        self,
        app_id: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "DELETE",
            f"api/app/{quote(app_id, safe='')}",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def list_app_versions(
        self,
        app_id: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "GET",
            f"api/app/{quote(app_id, safe='')}/versions",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def preview_app_version(
        self,
        app_id: str,
        version: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "GET",
            f"api/app/{quote(app_id, safe='')}/version/{quote(version, safe='')}/preview",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def restore_app_version(
        self,
        app_id: str,
        version: str,
        as_new: bool = False,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "PUT",
            f"api/app/{quote(app_id, safe='')}/version/{quote(version, safe='')}",
            json={"as_new": as_new},
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def create_app_version(
        self,
        app_id: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            f"api/app/{quote(app_id, safe='')}/version",
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def delete_app_versions(
        self,
        app_id: str,
        versions: list[str],
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "DELETE",
            f"api/app/{quote(app_id, safe='')}/version",
            json={"versions": versions},
            headers=self.user_headers(username=username, organisation=organisation),
        )

    def store_template(
        self,
        app_id: str,
        layer_id: str,
        template: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            f"api/app/{quote(app_id, safe='')}/template/{quote(layer_id, safe='')}",
            data=template.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/plain",
            },
        )

    def store_sld(
        self,
        sld: str,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            "api/style",
            data=sld.encode("utf-8"),
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "text/plain",
            },
        )

    def store_spatial_file(
        self,
        app_id: str,
        filename: str,
        content: bytes,
        username: Optional[str] = None,
        organisation: Optional[str] = None,
    ) -> dict[str, Any]:
        return self.request(
            "POST",
            f"api/app/{quote(app_id, safe='')}/file/{quote(filename, safe='')}",
            data=content,
            headers={
                **self.user_headers(username=username, organisation=organisation),
                "Content-Type": "application/octet-stream",
            },
        )

    def draft_url(self, filepath: str) -> str:
        """Return a mviewer URL pointing at a stored draft XML config."""
        return self._mviewer_url(posixpath.join(self.conf_path, filepath))

    def preview_url(self, filepath: str) -> str:
        """Preview files live under the same mviewer config path as drafts."""
        return self.draft_url(filepath)

    def public_url(self, online_file: str) -> str:
        """Return a public mviewer URL after publication."""
        if online_file.endswith(".xml"):
            config = online_file
        else:
            config = f"{online_file}.xml"
        return self._mviewer_url(posixpath.join(self.public_path, config))

    def request(self, method: str, path: str, **kwargs: Any) -> Any:
        """Send a request and normalize backend errors into RuntimeError."""
        url = f"{self.base_url}/{path.lstrip('/')}"
        response = self.session.request(method, url, timeout=self.timeout, **kwargs)
        if response.ok:
            if response.content:
                return response.json()
            return {}
        message = response.text
        try:
            payload = response.json()
            message = payload.get("description") or payload.get("message") or message
        except ValueError:
            pass
        raise RuntimeError(f"{method} {url} failed with {response.status_code}: {message}")

    def _mviewer_url(self, config_path: str) -> str:
        """Append the config parameter while preserving existing query params."""
        base = self.mviewer_base_url
        separator = "&" if "?" in base else "?"
        return f"{base}{separator}config={config_path}"
