from werkzeug.local import LocalProxy
from flask import has_app_context, request, current_app
from ..models.user import User
from .commons import replace_special_chars
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _first_header(*names: str) -> Optional[str]:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value
    return None


def _split_roles(value: Optional[str]) -> list[str]:
    if value is None:
        return [""]
    normalized_value = value.replace(",", ";").replace(" ", ";")
    roles = [role for role in normalized_value.split(";") if role]
    return roles or [""]


def _build_user(
    username: Optional[str],
    firstname: Optional[str],
    lastname: Optional[str],
    orgname: Optional[str],
    roles: list[str],
) -> User:
    if not orgname:
        orgname = current_app.config["DEFAULT_ORG"]
    normalize_orgname = replace_special_chars(orgname)
    username = username or "anonymous"
    return User(
        username,
        firstname or username,
        lastname or "anonymous",
        orgname,
        normalize_orgname,
        roles,
    )


def _get_current_user() -> Optional["User"]:
    if has_app_context():
        logger.debug("GET USER : READ HEADER")
        logger.debug(dict(request.headers))
        auth_type = current_app.config["MVIEWERSTUDIO_AUTH_TYPE"]
        if auth_type == "georchestra":
            from .login_georchestra_utils import get_user

            return get_user()
        if auth_type == "keycloak":
            from .login_keycloak_utils import get_user

            return get_user()
        raise RuntimeError(f"Unsupported MVIEWERSTUDIO_AUTH_TYPE: {auth_type}")
    logger.debug("GET USER : EMPTY APP CONTEXT - NO USER")
    return None


def is_keycloak_auth_enabled() -> bool:
    return current_app.config["MVIEWERSTUDIO_AUTH_TYPE"] == "keycloak"


def is_authenticated_user(user: User) -> bool:
    return bool(user and user.username and user.username != "anonymous")


current_user = LocalProxy(lambda: _get_current_user())
