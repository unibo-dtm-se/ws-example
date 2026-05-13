# AnonBoard Backend

The backend exposes the AnonBoard API used by the separate frontend application.

## Run locally

Install dependencies with Poetry:

```bash
poetry install
```

Start the API server:

```bash
python -m anonboard --admin-nickname teacher --admin-password secret
```

The backend listens on port 5000 by default and exposes only API endpoints.

## Test suite

Run the backend tests with:

```bash
pytest
```