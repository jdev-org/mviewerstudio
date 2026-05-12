from flask import request

from ..models.user import User
from .login_utils import _build_user, _split_roles


def get_user() -> User:
    # geOrchestra security-proxy exposes sec-* headers. Keep this adapter only
    # here so the rest of the application consumes a normalized user object.
    return _build_user(
        request.headers.get("sec-username"),
        request.headers.get("sec-firstname"),
        request.headers.get("sec-lastname"),
        request.headers.get("sec-org"),
        _split_roles(request.headers.get("sec-roles")),
    )
