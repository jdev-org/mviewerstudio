"""Cross-mode access control helpers for protected routes."""

from flask import redirect, request, url_for
from werkzeug.exceptions import Unauthorized

from ...auth_mode import is_authlib_mode, is_public_mode
from ...utils.login_utils import current_user, is_authenticated_user


def require_authenticated_user() -> None:
    """Allow public mode, otherwise enforce an authenticated application user.

    In Authlib mode, browser navigation is redirected to the local login route.
    API requests still receive a ``401 Unauthorized`` response.
    """
    if is_public_mode():
        return
    if not is_authenticated_user(current_user):
        if is_authlib_mode() and not request.path.startswith("/api/"):
            return redirect(
                url_for("auth-routes.login", next=request.url),
                code=302,
            )
        raise Unauthorized("Authentication required.")
