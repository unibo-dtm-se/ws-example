import argparse
import os

from anonboard.ws import create_app


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the anonboard web service")
    parser.add_argument("--host", default=os.getenv("ANONBOARD_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("ANONBOARD_PORT", "5000")))
    parser.add_argument(
        "--admin-nickname",
        default=os.getenv("ANONBOARD_ADMIN_NICKNAME", "admin"),
        help="Admin nickname used for teacher actions",
    )
    parser.add_argument(
        "--admin-password",
        default=os.getenv("ANONBOARD_ADMIN_PASSWORD", "admin"),
        help="Admin password used for teacher actions",
    )
    parser.add_argument("--debug", action="store_true")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    app = create_app(
        admin_nickname=args.admin_nickname,
        admin_password=args.admin_password,
    )
    app.run(host=args.host, port=args.port, debug=args.debug)