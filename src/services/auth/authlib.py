"""OIDC client flow backed by Authlib for self-managed authentication mode.

This module is intentionally provider-agnostic and relies on standard OIDC
discovery metadata so it can work with Keycloak, GeoNode/Django OIDC, or any
other compliant provider.
"""

from urllib.parse import urlencode

from flask import current_app, redirect, request, session, url_for
from werkzeug.exceptions import InternalServerError

from ...auth_mode import is_authlib_configured
from ...extensions import oauth


AUTHLIB_CLIENT_NAME = "mviewerstudio"
AUTHLIB_SESSION_CLAIMS_KEY = "mviewerstudio.auth.claims"
AUTHLIB_SESSION_TOKEN_KEY = "mviewerstudio.auth.token"


def authlib_metadata_url() -> str:
    """Return the explicit metadata URL or derive it from the issuer URL."""
    metadata_url = current_app.config.get("MVIEWERSTUDIO_AUTHLIB_METADATA_URL", "").strip()
    if metadata_url:
        return metadata_url
    issuer = current_app.config.get("MVIEWERSTUDIO_AUTHLIB_ISSUER", "").rstrip("/")
    if not issuer:
        return ""
    return f"{issuer}/.well-known/openid-configuration"


def init_authlib_client(app) -> None:
    """Register the Authlib OAuth client when Authlib mode is configured."""
    if not is_authlib_configured():
        return
    if oauth.create_client(AUTHLIB_CLIENT_NAME) is not None:
        return

    oauth.register(
        name=AUTHLIB_CLIENT_NAME,
        client_id=app.config["MVIEWERSTUDIO_AUTHLIB_CLIENT_ID"],
        client_secret=app.config["MVIEWERSTUDIO_AUTHLIB_CLIENT_SECRET"],
        server_metadata_url=authlib_metadata_url(),
        client_kwargs={"scope": app.config["MVIEWERSTUDIO_AUTHLIB_SCOPE"]},
    )
    try:
        current_app.logger.info(
            "Authlib client '%s' registered (client_id=%s)",
            AUTHLIB_CLIENT_NAME,
            app.config.get("MVIEWERSTUDIO_AUTHLIB_CLIENT_ID", "(missing)"),
        )
    except Exception:
        pass


def authlib_client():
    """Return the configured Authlib client or fail with a server error."""
    client = oauth.create_client(AUTHLIB_CLIENT_NAME)
    if client is None:
        try:
            current_app.logger.error("Authlib client '%s' is not configured.", AUTHLIB_CLIENT_NAME)
        except Exception:
            pass
        raise InternalServerError("Authlib client is not configured.")
    return client


def app_root_path() -> str:
    """Return the studio root path, including the optional URL prefix."""
    app_prefix = current_app.config.get("MVIEWERSTUDIO_URL_PATH_PREFIX", "").strip("/")
    if not app_prefix:
        return "/"
    return f"/{app_prefix}/"


def _coerce_claims(payload: object) -> dict[str, object]:
    """Normalize an arbitrary payload into a mapping of claims."""
    return payload if isinstance(payload, dict) else {}


def _roles_from_claims(claims: dict[str, object]) -> list[str]:
    """Extract application roles from common OIDC claim conventions."""
    roles = claims.get("roles")
    if isinstance(roles, list) and roles:
        return [str(role) for role in roles]

    realm_access = claims.get("realm_access")
    if isinstance(realm_access, dict):
        realm_roles = realm_access.get("roles")
        if isinstance(realm_roles, list) and realm_roles:
            return [str(role) for role in realm_roles]

    groups = claims.get("groups")
    if isinstance(groups, list) and groups:
        return [str(group) for group in groups]
    return [""]


def normalize_claims(claims: object) -> dict[str, object]:
    """Map provider-specific claim names to the application's user shape."""
    raw_claims = _coerce_claims(claims)
    full_name = str(raw_claims.get("name") or "").strip()
    given_name = str(raw_claims.get("given_name") or "").strip()
    family_name = str(raw_claims.get("family_name") or "").strip()
    if full_name and (not given_name or not family_name):
        name_parts = full_name.split(" ", 1)
        if not given_name and name_parts:
            given_name = name_parts[0]
        if not family_name and len(name_parts) > 1:
            family_name = name_parts[1]

    organization = raw_claims.get("organization") or raw_claims.get("org")
    return {
        "preferred_username": raw_claims.get("preferred_username")
        or raw_claims.get("nickname")
        or raw_claims.get("email")
        or raw_claims.get("sub"),
        "given_name": given_name or None,
        "family_name": family_name or None,
        "organization": organization,
        "roles": _roles_from_claims(raw_claims),
    }


def store_authlib_session(token: dict[str, object], claims: dict[str, object]) -> None:
    """Persist token and normalized user claims in the Flask session."""
    try:
        current_app.logger.info(
            "Storing auth session: token_keys=%s, claim_keys=%s",
            list(token.keys()) if isinstance(token, dict) else str(type(token)),
            list(claims.keys()) if isinstance(claims, dict) else str(type(claims)),
        )
    except Exception:
        pass
    session[AUTHLIB_SESSION_TOKEN_KEY] = token
    session[AUTHLIB_SESSION_CLAIMS_KEY] = claims
    session.modified = True


def get_authlib_session_claims() -> dict[str, object]:
    """Read normalized user claims from the current Flask session."""
    claims = session.get(AUTHLIB_SESSION_CLAIMS_KEY, {})
    return claims if isinstance(claims, dict) else {}


def clear_authlib_session() -> None:
    """Remove Authlib-managed authentication state from the Flask session."""
    session.pop(AUTHLIB_SESSION_TOKEN_KEY, None)
    session.pop(AUTHLIB_SESSION_CLAIMS_KEY, None)
    session.modified = True


def start_authlib_login():
    """Start the OIDC authorization code flow and remember the return URL."""
    # Prefer explicit 'next', then referrer, otherwise send to the studio index page
    app_index = app_root_path().rstrip("/") + "/index.html"
    next_url = request.args.get("next") or request.referrer or app_index
    session["mviewerstudio.auth.next_url"] = next_url
    callback_url = url_for("auth-routes.authlib_callback", _external=True, _scheme="https")
    try:
        current_app.logger.info(
            "Start auth login: next=%s, callback=%s, scope=%s",
            next_url,
            callback_url,
            current_app.config.get("MVIEWERSTUDIO_AUTHLIB_SCOPE"),
        )
    except Exception:
        pass
    return authlib_client().authorize_redirect(callback_url)


def _user_claims_from_token(token: dict[str, object]) -> dict[str, object]:
    """Extract claims from the token payload or fetch them from ``userinfo``."""
    token_claims = _coerce_claims(token.get("userinfo"))
    if token_claims:
        return token_claims
    client = authlib_client()
    metadata = getattr(client, "server_metadata", {}) or {}
    if metadata.get("userinfo_endpoint"):
        try:
            current_app.logger.info(
                "Userinfo endpoint present: %s", metadata.get("userinfo_endpoint")
            )
            response = client.userinfo(token=token)
            if hasattr(response, "json"):
                claims = _coerce_claims(response.json())
            else:
                claims = _coerce_claims(response)
            try:
                current_app.logger.info("Userinfo fetched: keys=%s", list(claims.keys()))
            except Exception:
                pass
            return claims
        except Exception as e:
            current_app.logger.error("Error fetching userinfo: %s", e)
            return {}
    return {}


def complete_authlib_login():
    """Finalize the OIDC callback, store claims in session, then redirect back."""
    callback_error = request.args.get("error")
    if callback_error:
        current_app.logger.error(
            "OIDC callback error: error=%s, description=%s, scope=%s",
            callback_error,
            request.args.get("error_description", ""),
            current_app.config.get("MVIEWERSTUDIO_AUTHLIB_SCOPE"),
        )
    token = authlib_client().authorize_access_token()
    try:
        current_app.logger.info(
            "Token exchange completed: token_keys=%s",
            list(token.keys()) if isinstance(token, dict) else str(type(token)),
        )
    except Exception:
        pass
    raw_claims = _user_claims_from_token(token)
    current_app.logger.info("Authlib claims: %s", raw_claims)
    claims = normalize_claims(raw_claims)
    store_authlib_session(token, claims)
    # Pop the saved next URL (if any). If none, redirect to the studio index page.
    app_index = app_root_path().rstrip("/") + "/index.html"
    redirect_target = session.pop("mviewerstudio.auth.next_url", None) or app_index
    return redirect(redirect_target, code=302)


def build_authlib_logout_redirect() -> str:
    """Build a provider logout URL from OIDC discovery metadata when available."""
    redirect_uri = request.host_url.rstrip("/")
    if redirect_uri.startswith("http://"):
        redirect_uri = "https://" + redirect_uri.split("://", 1)[1]
    redirect_uri = redirect_uri + app_root_path()
    try:
        current_app.logger.info("Building logout redirect: post_logout_redirect_uri=%s", redirect_uri)
    except Exception:
        pass
    token = session.get(AUTHLIB_SESSION_TOKEN_KEY, {})
    if not isinstance(token, dict):
        token = {}

    client = oauth.create_client(AUTHLIB_CLIENT_NAME)
    if client is None:
        try:
            current_app.logger.error("Authlib client not available when building logout redirect")
        except Exception:
            pass
        return app_root_path()

    metadata = getattr(client, "server_metadata", {}) or {}
    end_session_endpoint = metadata.get("end_session_endpoint")
    if not end_session_endpoint:
        try:
            current_app.logger.info("No end_session_endpoint found in provider metadata")
        except Exception:
            pass
        return app_root_path()

    try:
        current_app.logger.info(
            "Using end_session_endpoint=%s", end_session_endpoint
        )
    except Exception:
        pass

    query = {"post_logout_redirect_uri": redirect_uri}
    id_token = token.get("id_token")
    if id_token:
        query["id_token_hint"] = id_token
    return f"{end_session_endpoint}?{urlencode(query)}"
