from flask import Blueprint, Response, jsonify, redirect

from ..services.auth import apply_logout_cookies, build_logout_redirect
from ..services.auth import require_authenticated_user
from ..utils.login_utils import current_user

auth_routes = Blueprint("auth-routes", __name__)


@auth_routes.before_request
def protect_auth_routes() -> None:
    require_authenticated_user()


@auth_routes.route("/api/user", methods=["GET"])
def user() -> Response:
    """
    Return current authentified user.
    Actually works with sec-proxy only.
    """
    return jsonify(current_user.as_dict())


@auth_routes.route("/logout", methods=["GET"])
@auth_routes.route("/api/logout", methods=["GET"])
def logout() -> Response:
    response = redirect(build_logout_redirect(), code=302)
    apply_logout_cookies(response)
    return response
