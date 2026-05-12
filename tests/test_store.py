from datetime import datetime, timedelta, timezone

import pytest

from anonboard.store import (
    DuplicateNicknameError,
    InMemoryBoardRepository,
    InvalidCredentialsError,
    QuestionNotFoundError,
    UnknownUserError,
)


def test_register_user_rejects_empty_nickname():
    repository = InMemoryBoardRepository()

    with pytest.raises(ValueError, match="Nickname must not be empty"):
        repository.register_user("   ", "secret")


def test_register_user_rejects_empty_password():
    repository = InMemoryBoardRepository()

    with pytest.raises(ValueError, match="Password must not be empty"):
        repository.register_user("alice", "")


def test_register_user_rejects_duplicate_nickname():
    repository = InMemoryBoardRepository()
    repository.register_user("alice", "secret")

    with pytest.raises(DuplicateNicknameError):
        repository.register_user("alice", "another")


def test_authenticate_user_rejects_unknown_user():
    repository = InMemoryBoardRepository()

    with pytest.raises(UnknownUserError):
        repository.authenticate_user("missing", "secret")


def test_authenticate_user_rejects_wrong_password():
    repository = InMemoryBoardRepository()
    repository.register_user("alice", "secret")

    with pytest.raises(InvalidCredentialsError):
        repository.authenticate_user("alice", "wrong")


def test_ensure_admin_rejects_non_admin_user():
    repository = InMemoryBoardRepository()
    repository.register_user("alice", "secret")

    with pytest.raises(InvalidCredentialsError):
        repository.ensure_admin("alice", "secret")


def test_add_question_rejects_unknown_author():
    repository = InMemoryBoardRepository()

    with pytest.raises(UnknownUserError):
        repository.add_question("missing", "Question")


def test_add_question_rejects_empty_text():
    repository = InMemoryBoardRepository()
    repository.register_user("alice", "secret")

    with pytest.raises(ValueError, match="Question text must not be empty"):
        repository.add_question("alice", "   ")


def test_set_answered_rejects_unknown_question():
    repository = InMemoryBoardRepository()

    with pytest.raises(QuestionNotFoundError):
        repository.set_answered(999, True)


def test_list_questions_returns_requested_page_slice():
    repository = InMemoryBoardRepository()
    repository.register_user("alice", "secret")
    base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)

    for index in range(5):
        repository.add_question("alice", f"Question {index}")
        repository._questions[-1].created_at = base_time + timedelta(seconds=index)

    questions = repository.list_questions(page=2, limit=2)

    assert [item["text"] for item in questions] == ["Question 2", "Question 1"]
