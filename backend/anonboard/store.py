from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(slots=True)
class UserRecord:
    nickname: str
    password: str
    is_admin: bool = False


@dataclass(slots=True)
class QuestionRecord:
    id: int
    text: str
    author: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    answered: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "text": self.text,
            "author": self.author,
            "timestamp": self.created_at.isoformat(),
            "answered": self.answered,
        }


class DuplicateNicknameError(ValueError):
    pass


class UnknownUserError(LookupError):
    pass


class InvalidCredentialsError(PermissionError):
    pass


class QuestionNotFoundError(LookupError):
    pass


class InMemoryBoardRepository:
    def __init__(self) -> None:
        self._users: dict[str, UserRecord] = {}
        self._questions: list[QuestionRecord] = []
        self._next_question_id = 1

    def register_user(
        self, nickname: str, password: str, *, is_admin: bool = False
    ) -> UserRecord:
        normalized_nickname = nickname.strip()
        if not normalized_nickname:
            raise ValueError("Nickname must not be empty")
        if not password:
            raise ValueError("Password must not be empty")
        if normalized_nickname in self._users:
            raise DuplicateNicknameError(normalized_nickname)
        user = UserRecord(
            nickname=normalized_nickname, password=password, is_admin=is_admin
        )
        self._users[normalized_nickname] = user
        return user

    def authenticate_user(self, nickname: str, password: str) -> UserRecord:
        user = self._users.get(nickname)
        if user is None:
            raise UnknownUserError(nickname)
        if user.password != password:
            raise InvalidCredentialsError(nickname)
        return user

    def ensure_admin(self, nickname: str, password: str) -> UserRecord:
        user = self.authenticate_user(nickname, password)
        if not user.is_admin:
            raise InvalidCredentialsError(nickname)
        return user

    def add_question(self, author: str, text: str) -> QuestionRecord:
        if author not in self._users:
            raise UnknownUserError(author)
        normalized_text = text.strip()
        if not normalized_text:
            raise ValueError("Question text must not be empty")
        question = QuestionRecord(
            id=self._next_question_id,
            text=normalized_text,
            author=author,
        )
        self._questions.append(question)
        self._next_question_id += 1
        return question

    def list_questions(
        self, *, page: int = 1, limit: int = 25
    ) -> list[dict[str, object]]:
        questions = sorted(
            self._questions, key=lambda question: question.created_at, reverse=True
        )
        start_index = (page - 1) * limit
        end_index = start_index + limit
        return [question.to_dict() for question in questions[start_index:end_index]]

    def set_answered(self, question_id: int, answered: bool) -> dict[str, object]:
        for question in self._questions:
            if question.id == question_id:
                question.answered = answered
                return question.to_dict()
        raise QuestionNotFoundError(question_id)
