from types import SimpleNamespace

from anonboard import cli


def test_build_parser_uses_defaults(monkeypatch):
    monkeypatch.delenv("ANONBOARD_HOST", raising=False)
    monkeypatch.delenv("ANONBOARD_PORT", raising=False)
    monkeypatch.delenv("ANONBOARD_ADMIN_NICKNAME", raising=False)
    monkeypatch.delenv("ANONBOARD_ADMIN_PASSWORD", raising=False)

    parser = cli.build_parser()
    args = parser.parse_args([])

    assert args.host == "127.0.0.1"
    assert args.port == 5000
    assert args.admin_nickname == "admin"
    assert args.admin_password == "admin"
    assert args.debug is False


def test_build_parser_uses_environment(monkeypatch):
    monkeypatch.setenv("ANONBOARD_HOST", "0.0.0.0")
    monkeypatch.setenv("ANONBOARD_PORT", "8080")
    monkeypatch.setenv("ANONBOARD_ADMIN_NICKNAME", "teacher")
    monkeypatch.setenv("ANONBOARD_ADMIN_PASSWORD", "secret")

    parser = cli.build_parser()
    args = parser.parse_args([])

    assert args.host == "0.0.0.0"
    assert args.port == 8080
    assert args.admin_nickname == "teacher"
    assert args.admin_password == "secret"


def test_main_builds_and_runs_app(monkeypatch):
    recorded = {}

    class FakeApp:
        def run(self, *, host, port, debug):
            recorded["run"] = {"host": host, "port": port, "debug": debug}

    def fake_create_app(*, admin_nickname, admin_password):
        recorded["create_app"] = {
            "admin_nickname": admin_nickname,
            "admin_password": admin_password,
        }
        return FakeApp()

    monkeypatch.setattr(cli, "create_app", fake_create_app)
    monkeypatch.setattr(
        cli,
        "build_parser",
        lambda: SimpleNamespace(
            parse_args=lambda: SimpleNamespace(
                host="0.0.0.0",
                port=9000,
                admin_nickname="teacher",
                admin_password="secret",
                debug=True,
            )
        ),
    )

    cli.main()

    assert recorded["create_app"] == {
        "admin_nickname": "teacher",
        "admin_password": "secret",
    }
    assert recorded["run"] == {"host": "0.0.0.0", "port": 9000, "debug": True}
