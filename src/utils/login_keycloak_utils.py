from ..models.user import User
from .login_utils import _build_user, _first_header, _split_roles


def get_user() -> User:
    # Headers below are the common OAuth2/OIDC headers emitted by oauth2-proxy
    # or by nginx auth_request integrations in front of Keycloak.
    username = _first_header(
        "X-Forwarded-Preferred-Username",
        "X-Auth-Request-Preferred-Username",
        "X-Forwarded-User",
        "X-Auth-Request-User",
        "Remote-User",
    )
    return _build_user(
        username,
        _first_header("X-Forwarded-Given-Name", "X-Auth-Request-Given-Name"),
        _first_header("X-Forwarded-Family-Name", "X-Auth-Request-Family-Name"),
        _first_header("X-Forwarded-Org", "X-Auth-Request-Org"),
        _split_roles(
            _first_header(
                "X-Forwarded-Roles",
                "X-Auth-Request-Roles",
                "X-Forwarded-Groups",
                "X-Auth-Request-Groups",
            )
        ),
    )
