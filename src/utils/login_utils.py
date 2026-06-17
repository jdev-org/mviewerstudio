from werkzeug.local import LocalProxy
from flask import has_app_context, request, current_app
from ..models.user import User
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _get_current_user() -> Optional["User"]:
    if has_app_context():
        logger.debug("GET USER : READ HEADER")
        logger.debug(dict(request.headers))
        auth_type = current_app.config["MVIEWERSTUDIO_AUTH_TYPE"]
        if auth_type == "georchestra":
            from .auth.georchestra import get_user

            return get_user()
        if auth_type == "keycloak":
            from .auth.oidc import get_user

            return get_user()
        raise RuntimeError(f"Unsupported MVIEWERSTUDIO_AUTH_TYPE: {auth_type}")
    logger.debug("GET USER : EMPTY APP CONTEXT - NO USER")
    return None


def is_keycloak_auth_enabled() -> bool:
    return current_app.config["MVIEWERSTUDIO_AUTH_TYPE"] == "keycloak"


def is_oidc_auth_enabled() -> bool:
    return is_keycloak_auth_enabled()


def is_authenticated_user(user: User) -> bool:
    return bool(user and user.username and user.username != "anonymous")


current_user = LocalProxy(lambda: _get_current_user())
