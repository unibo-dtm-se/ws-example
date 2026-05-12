from __future__ import annotations

from functools import wraps
from http import HTTPStatus

from flask import Flask, Response, jsonify, render_template, request
from flask.typing import ResponseReturnValue

from anonboard.store import (
    DuplicateNicknameError,
    InMemoryBoardRepository,
    InvalidCredentialsError,
    QuestionNotFoundError,
    UnknownUserError,
)


def create_app(
    *,
    admin_nickname: str | None = None,
    admin_password: str | None = None,
    repository: InMemoryBoardRepository | None = None,
) -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")

    repo = repository or InMemoryBoardRepository()
    configured_admin_nickname = admin_nickname or "admin"
    configured_admin_password = admin_password or "admin"
    if configured_admin_password == "admin":
        print(
            "WARNING: Using default admin password. This is not recommended for production use. "
            "Set the ANONBOARD_ADMIN_PASSWORD environment variable to a secure password.",
        )

    try:
        repo.register_user(
            configured_admin_nickname,
            configured_admin_password,
            is_admin=True,
        )
    except DuplicateNicknameError:
        repo.ensure_admin(configured_admin_nickname, configured_admin_password)

    app.config["REPOSITORY"] = repo
    app.config["ADMIN_NICKNAME"] = configured_admin_nickname

    @app.get("/")
    def teacher_page() -> str:
        return render_template("index.html", admin_nickname=configured_admin_nickname)

    @app.get("/ask")
    def student_page() -> str:
        return render_template("ask.html")

    @app.post("/api/register")
    def register() -> ResponseReturnValue:
        payload = request.get_json(silent=True) or {}
        nickname = str(payload.get("nickname", ""))
        password = str(payload.get("password", ""))

        try:
            user = repo.register_user(nickname, password)
        except DuplicateNicknameError:
            return jsonify(
                {"error": "Nickname already registered"}
            ), HTTPStatus.CONFLICT
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        return (
            jsonify({"nickname": user.nickname, "is_admin": user.is_admin}),
            HTTPStatus.CREATED,
        )

    @app.get("/api/questions")
    def list_questions() -> ResponseReturnValue:
        try:
            page = _read_positive_int_query_param("page", default=1)
            limit = _read_positive_int_query_param("limit", default=25, maximum=1000)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

        return jsonify(repo.list_questions(page=page, limit=limit))

    @app.post("/api/users/check")
    def check_user() -> ResponseReturnValue:
        payload = request.get_json(silent=True) or {}
        nickname = str(payload.get("nickname", ""))
        password = str(payload.get("password", ""))

        try:
            user = repo.authenticate_user(nickname, password)
        except UnknownUserError:
            return jsonify({"error": "User not found"}), HTTPStatus.NOT_FOUND
        except InvalidCredentialsError:
            return jsonify({"error": "Invalid credentials"}), HTTPStatus.UNAUTHORIZED

        return jsonify({"nickname": user.nickname, "is_admin": user.is_admin})

    def require_basic_auth(*, admin_only: bool = False):
        def decorator(view_func):
            @wraps(view_func)
            def wrapped(*args, **kwargs):
                auth = request.authorization
                if auth is None or not auth.username or auth.password is None:
                    return _auth_error("Authentication required")
                try:
                    user = (
                        repo.ensure_admin(auth.username, auth.password)
                        if admin_only
                        else repo.authenticate_user(auth.username, auth.password)
                    )
                except (UnknownUserError, InvalidCredentialsError):
                    return _auth_error("Invalid credentials")

                return view_func(user, *args, **kwargs)

            return wrapped

        return decorator

    @app.post("/api/questions")
    @require_basic_auth()
    def post_question(user) -> ResponseReturnValue:
        payload = request.get_json(silent=True) or {}
        text = str(payload.get("text", ""))
        try:
            question = repo.add_question(user.nickname, text)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST
        return jsonify(question.to_dict()), HTTPStatus.CREATED

    @app.patch("/api/questions/<int:question_id>")
    @require_basic_auth(admin_only=True)
    def update_question(_admin_user, question_id: int) -> ResponseReturnValue:
        payload = request.get_json(silent=True) or {}
        if "answered" not in payload or not isinstance(payload["answered"], bool):
            return jsonify(
                {"error": "The answered field must be a boolean"}
            ), HTTPStatus.BAD_REQUEST
        try:
            question = repo.set_answered(question_id, payload["answered"])
        except QuestionNotFoundError:
            return jsonify({"error": "Question not found"}), HTTPStatus.NOT_FOUND
        return jsonify(question)

    return app


def _auth_error(message: str) -> tuple[Response, int]:
    response = jsonify({"error": message})
    response.headers["WWW-Authenticate"] = 'Basic realm="anonboard"'
    return response, HTTPStatus.UNAUTHORIZED


def _read_positive_int_query_param(
    name: str,
    *,
    default: int,
    maximum: int | None = None,
) -> int:
    raw_value = request.args.get(name)
    if raw_value is None:
        return default

    try:
        value = int(raw_value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a positive integer") from exc

    if value <= 0:
        raise ValueError(f"{name} must be a positive integer")
    if maximum is not None:
        return min(value, maximum)
    return value
