from flask import Blueprint, Response, current_app, jsonify, redirect, request
from urllib.parse import urlencode, urlparse
from werkzeug.exceptions import Unauthorized

from .utils.login_utils import (
    current_user,
    is_authenticated_user,
    is_keycloak_auth_enabled,
)

auth_routes = Blueprint("auth-routes", __name__)


def _app_root_path() -> str:
    app_prefix = current_app.config.get("MVIEWERSTUDIO_URL_PATH_PREFIX", "").strip("/")
    if not app_prefix:
        return "/"
    return f"/{app_prefix}/"


def _expire_cookie(response: Response, key: str, path_value: str) -> None:
    response.set_cookie(key, "", max_age=0, expires=0, path=path_value)


def _keycloak_cookie_paths() -> list[str]:
    issuer_url = current_app.config.get("OAUTH2_PROXY_OIDC_ISSUER_URL", "").strip()
    issuer_path = urlparse(issuer_url).path.rstrip("/")
    paths = {"/", "/keycloak/"}
    if issuer_path:
        paths.add(f"{issuer_path}/")
        realm_parent = issuer_path.rsplit("/", 1)[0]
        if realm_parent:
            paths.add(f"{realm_parent}/")
    return sorted(paths)


def _build_keycloak_logout_redirect() -> str:
    issuer_url = current_app.config.get("OAUTH2_PROXY_OIDC_ISSUER_URL", "").strip()
    client_id = current_app.config.get("OAUTH2_PROXY_CLIENT_ID", "").strip()
    if not issuer_url or not client_id:
        return "/oauth2/sign_out"

    redirect_target = f"/oauth2/start?{urlencode({'rd': _app_root_path()})}"
    issuer_parts = urlparse(issuer_url)
    issuer_base_path = issuer_parts.path.rstrip("/")
    logout_path = f"{issuer_base_path}/protocol/openid-connect/logout"
    post_logout_redirect_uri = f"{request.host_url.rstrip('/')}{redirect_target}"
    logout_query = urlencode(
        {
            "client_id": client_id,
            "post_logout_redirect_uri": post_logout_redirect_uri,
        }
    )
    keycloak_logout_url = (
        f"{issuer_parts.scheme}://{issuer_parts.netloc}{logout_path}?{logout_query}"
    )
    return f"/oauth2/sign_out?{urlencode({'rd': keycloak_logout_url})}"


def require_keycloak_authentication() -> None:
    if not is_keycloak_auth_enabled():
        return
    if not is_authenticated_user(current_user):
        raise Unauthorized("Authentication required.")


@auth_routes.before_request
def protect_auth_routes() -> None:
    require_keycloak_authentication()


@auth_routes.route("/api/user", methods=["GET"])
def user() -> Response:
    """
    Return current authentified user.
    Actually works with sec-proxy only.
    """
    return jsonify(current_user.as_dict())


@auth_routes.route("/api/logout", methods=["GET"])
def logout() -> Response:
    response = redirect(_build_keycloak_logout_redirect(), code=302)
    cookie_paths = _keycloak_cookie_paths()
    for cookie_name in (
        "_oauth2_proxy",
        "_oauth2_proxy_csrf",
        "AUTH_SESSION_ID",
        "AUTH_SESSION_ID_LEGACY",
        "KC_AUTH_SESSION_HASH",
        "KC_RESTART",
        "KEYCLOAK_IDENTITY",
        "KEYCLOAK_IDENTITY_LEGACY",
        "KEYCLOAK_SESSION",
        "KEYCLOAK_SESSION_LEGACY",
    ):
        for cookie_path in cookie_paths:
            _expire_cookie(response, cookie_name, cookie_path)
    return response
