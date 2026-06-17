from typing import Optional

from flask import current_app, request

from ...models.user import User
from ..commons import replace_special_chars


def first_header(*names: str) -> Optional[str]:
    for name in names:
        value = request.headers.get(name)
        if value:
            return value
    return None


def split_roles(value: Optional[str]) -> list[str]:
    if value is None:
        return [""]
    normalized_value = value.replace(",", ";").replace(" ", ";")
    roles = [role for role in normalized_value.split(";") if role]
    return roles or [""]


def build_user(
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
