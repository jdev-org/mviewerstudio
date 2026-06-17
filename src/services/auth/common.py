from werkzeug.exceptions import Unauthorized

from ...utils.login_utils import current_user, is_authenticated_user
from .oidc import is_oidc_auth_enabled


def require_authenticated_user() -> None:
    if not is_oidc_auth_enabled():
        return
    if not is_authenticated_user(current_user):
        raise Unauthorized("Authentication required.")
