import base64

import pytest

from anonboard import InMemoryBoardRepository, create_app


@pytest.fixture
def app():
    repository = InMemoryBoardRepository()
    return create_app(
        admin_nickname="teacher",
        admin_password="secret",
        repository=repository,
    )


@pytest.fixture
def client(app):
    return app.test_client()


def make_basic_auth_header(username: str, password: str) -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


def test_register_user(client):
    response = client.post(
        "/api/register",
        json={"nickname": "alice", "password": "wonder"},
    )

    assert response.status_code == 201
    assert response.get_json() == {"nickname": "alice", "is_admin": False}


def test_post_question_requires_authentication(client):
    response = client.post("/api/questions", json={"text": "Will this be on the exam?"})

    assert response.status_code == 401


def test_registered_student_can_be_checked(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    response = client.post(
        "/api/users/check",
        json={"nickname": "alice", "password": "wonder"},
    )

    assert response.status_code == 200
    assert response.get_json() == {"nickname": "alice", "is_admin": False}


def test_user_check_rejects_invalid_credentials(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    response = client.post(
        "/api/users/check",
        json={"nickname": "alice", "password": "wrong"},
    )

    assert response.status_code == 401


def test_user_check_rejects_unknown_user(client):
    response = client.post(
        "/api/users/check",
        json={"nickname": "missing", "password": "wonder"},
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "User not found"}


def test_register_rejects_invalid_payload(client):
    response = client.post(
        "/api/register",
        json={"nickname": "   ", "password": ""},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Nickname must not be empty"}


def test_register_rejects_duplicate_nickname(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    response = client.post(
        "/api/register",
        json={"nickname": "alice", "password": "wonder"},
    )

    assert response.status_code == 409
    assert response.get_json() == {"error": "Nickname already registered"}


def test_registered_student_can_post_and_everyone_can_list_questions(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    create_response = client.post(
        "/api/questions",
        json={"text": "Will the slides be published?"},
        headers=make_basic_auth_header("alice", "wonder"),
    )

    assert create_response.status_code == 201
    created_question = create_response.get_json()
    assert created_question["author"] == "alice"
    assert created_question["answered"] is False
    assert created_question["timestamp"]

    list_response = client.get("/api/questions")

    assert list_response.status_code == 200
    assert list_response.get_json() == [created_question]


def test_post_question_rejects_invalid_credentials(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    response = client.post(
        "/api/questions",
        json={"text": "Will the slides be published?"},
        headers=make_basic_auth_header("alice", "wrong"),
    )

    assert response.status_code == 401
    assert response.get_json() == {"error": "Invalid credentials"}


def test_post_question_rejects_empty_text(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    response = client.post(
        "/api/questions",
        json={"text": "   "},
        headers=make_basic_auth_header("alice", "wonder"),
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "Question text must not be empty"}


def test_admin_can_mark_question_as_answered(client):
    client.post("/api/register", json={"nickname": "bob", "password": "builder"})
    question_response = client.post(
        "/api/questions",
        json={"text": "Can you repeat the theorem proof?"},
        headers=make_basic_auth_header("bob", "builder"),
    )
    question_id = question_response.get_json()["id"]

    update_response = client.patch(
        f"/api/questions/{question_id}",
        json={"answered": True},
        headers=make_basic_auth_header("teacher", "secret"),
    )

    assert update_response.status_code == 200
    assert update_response.get_json()["answered"] is True


def test_non_admin_cannot_mark_question(client):
    client.post("/api/register", json={"nickname": "eve", "password": "pass"})
    question_response = client.post(
        "/api/questions",
        json={"text": "Could you share more examples?"},
        headers=make_basic_auth_header("eve", "pass"),
    )
    question_id = question_response.get_json()["id"]

    update_response = client.patch(
        f"/api/questions/{question_id}",
        json={"answered": True},
        headers=make_basic_auth_header("eve", "pass"),
    )

    assert update_response.status_code == 401


def test_update_question_requires_boolean_answered_field(client):
    response = client.patch(
        "/api/questions/1",
        json={"answered": "yes"},
        headers=make_basic_auth_header("teacher", "secret"),
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "The answered field must be a boolean"}


def test_update_question_rejects_missing_answered_field(client):
    response = client.patch(
        "/api/questions/1",
        json={},
        headers=make_basic_auth_header("teacher", "secret"),
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "The answered field must be a boolean"}


def test_update_question_returns_not_found_for_unknown_question(client):
    response = client.patch(
        "/api/questions/999",
        json={"answered": True},
        headers=make_basic_auth_header("teacher", "secret"),
    )

    assert response.status_code == 404
    assert response.get_json() == {"error": "Question not found"}


def test_questions_are_sorted_from_newest_to_oldest(client):
    client.post("/api/register", json={"nickname": "alice", "password": "wonder"})

    client.post(
        "/api/questions",
        json={"text": "First question"},
        headers=make_basic_auth_header("alice", "wonder"),
    )
    client.post(
        "/api/questions",
        json={"text": "Second question"},
        headers=make_basic_auth_header("alice", "wonder"),
    )

    response = client.get("/api/questions")

    assert response.status_code == 200
    assert [item["text"] for item in response.get_json()] == [
        "Second question",
        "First question",
    ]


def test_html_pages_are_served(client):
    teacher_response = client.get("/")
    student_response = client.get("/ask")
    stylesheet_response = client.get("/static/styles.css")

    assert teacher_response.status_code == 200
    assert b"Teacher dashboard" in teacher_response.data
    assert student_response.status_code == 200
    assert b"Post an anonymous question" in student_response.data
    assert stylesheet_response.status_code == 200
    assert b":root" in stylesheet_response.data


def test_create_app_uses_defaults_and_warns(capsys):
    app = create_app()

    captured = capsys.readouterr()

    assert app.config["ADMIN_NICKNAME"] == "admin"
    assert "WARNING: Using default admin password." in captured.out


def test_create_app_accepts_preconfigured_admin_repository():
    repository = InMemoryBoardRepository()
    repository.register_user("teacher", "secret", is_admin=True)

    app = create_app(
        admin_nickname="teacher",
        admin_password="secret",
        repository=repository,
    )

    assert app.config["ADMIN_NICKNAME"] == "teacher"
