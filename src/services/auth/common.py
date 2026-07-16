"""Cross-mode access control helpers for protected routes."""

from flask import current_app, jsonify, redirect, request, url_for
from werkzeug.exceptions import Unauthorized

from ...auth_mode import is_authlib_mode, is_public_mode
from ...utils.login_utils import current_user, is_authenticated_user


def _anonymous_redirect_url() -> str:
    configured_url = current_app.config.get("MVIEWERSTUDIO_AUTHLIB_ANONYMOUS_REDIRECT_URL", "")
    configured_url = configured_url.strip() if isinstance(configured_url, str) else ""
    if configured_url:
        return configured_url
    return request.host_url


def _is_studio_entry_request() -> bool:
    path = request.path.rstrip("/")
    app_prefix = current_app.config.get("MVIEWERSTUDIO_URL_PATH_PREFIX", "").strip("/")
    prefixed_root = f"/{app_prefix}" if app_prefix else ""
    return path.endswith("/index.html") or path in {"", prefixed_root}


def _is_api_request() -> bool:
    path = request.path
    app_prefix = current_app.config.get("MVIEWERSTUDIO_URL_PATH_PREFIX", "").strip("/")
    prefixed_api_root = f"/{app_prefix}/api/" if app_prefix else "/api/"
    return path.startswith("/api/") or path.startswith(prefixed_api_root)


def require_authenticated_user() -> None:
    """Allow public mode, otherwise enforce an authenticated application user.

    In Authlib mode, browser navigation is redirected to the local login route.
    API requests still receive a ``401 Unauthorized`` response.
    """
    if is_public_mode():
        return
    if not is_authenticated_user(current_user):
        if is_authlib_mode():
            login_url = url_for(
                "auth-routes.login",
                next=request.headers.get("X-Auth-Return-To") or request.referrer or request.url,
            )
            if _is_studio_entry_request():
                return redirect(login_url, code=302)
            if _is_api_request():
                return (
                    jsonify(
                        {
                            "error": "authentication_required",
                            "login_url": login_url,
                            "redirect_url": _anonymous_redirect_url(),
                        }
                    ),
                    401,
                )
            return redirect(login_url, code=302)
        raise Unauthorized("Authentication required.")


def require_authenticated_studio_entry() -> None:
    """Protect the studio entry page before any HTML is served."""
    if _is_studio_entry_request():
        return require_authenticated_user()
