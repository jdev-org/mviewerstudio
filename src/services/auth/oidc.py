from flask import Response, current_app, request
from urllib.parse import urlencode, urlparse


OIDC_LOGOUT_COOKIES = (
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
)


def is_oidc_auth_enabled() -> bool:
    return current_app.config["MVIEWERSTUDIO_AUTH_TYPE"] == "keycloak"


def app_root_path() -> str:
    app_prefix = current_app.config.get("MVIEWERSTUDIO_URL_PATH_PREFIX", "").strip("/")
    if not app_prefix:
        return "/"
    return f"/{app_prefix}/"


def expire_cookie(response: Response, key: str, path_value: str) -> None:
    response.set_cookie(key, "", max_age=0, expires=0, path=path_value)


def cookie_paths() -> list[str]:
    issuer_url = current_app.config.get("OAUTH2_PROXY_OIDC_ISSUER_URL", "").strip()
    issuer_path = urlparse(issuer_url).path.rstrip("/")
    paths = {"/", "/keycloak/"}
    if issuer_path:
        paths.add(f"{issuer_path}/")
        realm_parent = issuer_path.rsplit("/", 1)[0]
        if realm_parent:
            paths.add(f"{realm_parent}/")
    return sorted(paths)


def build_logout_redirect() -> str:
    issuer_url = current_app.config.get("OAUTH2_PROXY_OIDC_ISSUER_URL", "").strip()
    client_id = current_app.config.get("OAUTH2_PROXY_CLIENT_ID", "").strip()
    if not issuer_url or not client_id:
        return "/oauth2/sign_out"

    redirect_target = f"/oauth2/start?{urlencode({'rd': app_root_path()})}"
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
    oidc_logout_url = (
        f"{issuer_parts.scheme}://{issuer_parts.netloc}{logout_path}?{logout_query}"
    )
    return f"/oauth2/sign_out?{urlencode({'rd': oidc_logout_url})}"


def apply_logout_cookies(response: Response) -> None:
    for cookie_name in OIDC_LOGOUT_COOKIES:
        for cookie_path in cookie_paths():
            expire_cookie(response, cookie_name, cookie_path)
