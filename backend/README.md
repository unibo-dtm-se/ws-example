# AnonBoard Backend

Backend API for the AnonBoard classroom Q&A application. This Python project provides REST and WebSocket endpoints for managing anonymous questions and answers in an educational setting.

## Technology Stack

- **Language**: Python (>= 3.10.0, < 4.0.0)
- **Framework**: Flask 3.1.2
- **Package Manager**: Poetry
- **Testing**: pytest with coverage
- **Code Quality**: ruff, mypy

## Project Structure

```
backend/
├── anonboard/
│   ├── __init__.py          # Package initialization and main entry point
│   ├── __main__.py          # Module entry point
│   ├── cli.py               # Command-line interface
│   ├── store.py             # Data storage and persistence
│   └── ws.py                # WebSocket support
├── tests/
│   ├── __init__.py
│   ├── test_cli.py          # CLI tests
│   ├── test_store.py        # Data store tests
│   └── test_ws.py           # WebSocket tests
├── pyproject.toml           # Poetry configuration
├── poetry.lock              # Locked dependency versions
└── README.md
```

## Getting Started

### 1. Install Dependencies

```bash
poetry install
```

This installs all project dependencies as specified in `pyproject.toml`.

### 2. Run the Backend Server

```bash
poetry run poe serve
```

Or directly:

```bash
python -m anonboard --admin-nickname teacher --admin-password secret
```

The server listens on port 5000 by default and exposes REST API endpoints and WebSocket connections.

### Command-Line Options

- `--admin-nickname`: Username for the admin account (default: `teacher`)
- `--admin-password`: Password for the admin account (default: `secret`)
- Port configuration via environment variables if needed

## Development

### Running Tests

Run the full test suite:

```bash
poetry run poe test
```

Run tests with coverage report:

```bash
poetry run poe coverage
coverage-report
```

Generate HTML coverage report:

```bash
poetry run poe coverage-html
```

### Code Quality Checks

**Linting** (check for code issues):

```bash
poetry run poe ruff-check
```

**Formatting** (auto-format code):

```bash
poetry run poe ruff-fix
```

**Format Check** (verify formatting without changes):

```bash
poetry run poe format-check
```

**Type Checking** (static type analysis with mypy):

```bash
poetry run poe mypy
```

**Compile Check** (verify Python syntax):

```bash
poetry run poe compile
```

### Running All Static Checks

```bash
poetry run poe static-checks
```

This runs both ruff linting and mypy type checking.

## Available Tasks

All tasks are managed via Poetry and poethepoet (poe). View all tasks:

```bash
poetry run poe --help
```

Key tasks:
- `serve`: Start the backend server
- `test`: Run test suite
- `coverage`: Run tests with coverage
- `coverage-report`: Display coverage report
- `coverage-html`: Generate HTML coverage report
- `ruff-check`: Lint code
- `ruff-fix`: Auto-fix code issues
- `format`: Format code
- `format-check`: Check code formatting
- `mypy`: Type checking
- `compile`: Python syntax checking
- `static-checks`: Run all static checks (linting + type checking)

## API Endpoints

The backend provides REST API endpoints for:
- Question management
- Answer management
- User authentication (via admin credentials)
- Real-time updates via WebSocket

## Contributing

When submitting changes:
1. Run static checks: `poetry run poe static-checks`
2. Run tests with coverage: `poetry run poe coverage`
3. Ensure all tests pass and coverage is adequate
