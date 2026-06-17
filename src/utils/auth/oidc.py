from ...models.user import User
from .common import build_user, first_header, split_roles


def get_user() -> User:
    username = first_header(
        "X-Forwarded-Preferred-Username",
        "X-Auth-Request-Preferred-Username",
        "X-Forwarded-User",
        "X-Auth-Request-User",
        "Remote-User",
    )
    return build_user(
        username,
        first_header("X-Forwarded-Given-Name", "X-Auth-Request-Given-Name"),
        first_header("X-Forwarded-Family-Name", "X-Auth-Request-Family-Name"),
        first_header("X-Forwarded-Org", "X-Auth-Request-Org"),
        split_roles(
            first_header(
                "X-Forwarded-Roles",
                "X-Auth-Request-Roles",
                "X-Forwarded-Groups",
                "X-Auth-Request-Groups",
            )
        ),
    )
