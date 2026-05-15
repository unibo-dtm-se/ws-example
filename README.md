# AnonBoard

AnonBoard is a small Flask web service for classroom Q&A. Students can register an anonymous nickname and password, then submit timestamped questions through HTTP Basic authentication. Teachers can open a dedicated dashboard, inspect all submitted questions, and mark each one as answered or pending.

The project is intentionally didactical:

- Flask backend with a small app factory
- In-memory storage isolated behind a clear Python repository API
- REST endpoints for registration and question management
- OpenAPI specification in the project root
- Minimal HTML, CSS, and vanilla JavaScript frontend
- Pytest coverage for the backend behavior

## Features

- Student registration via REST: nickname + password
- Credential verification via REST without backend sessions
- Question submission via authenticated REST requests
- Public paginated question listing with author, timestamp, and answered mark
- Teacher-only state updates for answered or pending questions
- Admin account configurable through command-line arguments or environment variables
- Two frontend views: student page and teacher page

## Project layout

```text
anonboard/
  cli.py          CLI launcher for the backend
  store.py        In-memory repository and domain records
  ws.py           Flask app factory and HTTP routes
  templates/      HTML pages served by Flask
  static/         CSS and JavaScript assets
    openapi.yaml  Reverse-engineered OpenAPI specification
tests/
  test_ws.py
```

## API summary

- `POST /api/register`

  Body: `{"nickname": "alice", "password": "secret"}`

- `POST /api/users/check`

  Body: `{"nickname": "alice", "password": "secret"}`

- `GET /api/questions`

  Public endpoint returning questions sorted from newest to oldest

  Query parameters: `page` defaults to `1`, `limit` defaults to `25`, backend cap is `1000`

- `POST /api/questions`

  Basic auth required, body: `{"text": "Will this be on the exam?"}`

- `PATCH /api/questions/<id>`

  Admin Basic auth required, body: `{"answered": true}`

Question payloads contain:

- `id`
- `text`
- `author`
- `timestamp`
- `answered`

The complete reverse-engineered API description is available in [anonboard/static/openapi.yaml](./anonboard/static/openapi.yaml).

## Run locally

Install dependencies:

```bash
poetry install
```

Launch the backend with explicit admin credentials:

```bash
python -m anonboard --admin-nickname teacher --admin-password secret
```

Or configure the admin via environment variables:

```bash
export ANONBOARD_ADMIN_NICKNAME=teacher
export ANONBOARD_ADMIN_PASSWORD=secret
python -m anonboard
```

Open these pages in the browser:

- http://127.0.0.1:5000/ for the teacher dashboard
- http://127.0.0.1:5000/ask for the student page

The OpenAPI specification is served by `GET /api` using HTTP content negotiation:

- Default (browser / `Accept: text/html`): a Swagger-like rendered documentation page
- `Accept: application/json`: raw JSON OpenAPI document
- `Accept: application/yaml` (or `application/x-yaml`, `text/yaml`): raw YAML OpenAPI document

## Test suite

Run the backend tests with:

```bash
pytest
```
