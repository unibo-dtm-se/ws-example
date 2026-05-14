# AnonBoard

AnonBoard is a web application with a modern three-tier architecture separating the browser-side frontend, frontend server, and backend API.

## Architecture Overview

The project consists of three distinct components:

### Frontend (Browser Side)
- **Location**: `frontend/public/` (HTML) and `frontend/src/` (JavaScript)
- **Description**: Client-side code that runs in the user's browser
- **Responsibility**: User interface, client-side logic, and API communication through the frontend server
- **Technologies**: HTML, CSS, vanilla JavaScript
- **Entry Points**: `student.html` and `teacher.html`

### Frontend Server
- **Location**: `frontend/src/server.js`
- **Description**: Node.js/Express server that serves the static frontend files and proxies API requests to the backend
- **Responsibility**: Serving the web interface and routing API calls to the backend
- **Listens on**: Port 3000 (default)
- **Backend URL**: Configurable via `BACKEND_API_URL` environment variable (defaults to `http://127.0.0.1:5000`)

### Backend Server
- **Location**: `backend/anonboard/`
- **Description**: Python-based REST API server
- **Responsibility**: Business logic, data persistence, and API endpoints
- **Technologies**: Python with Poetry package management
- **Listens on**: Port 5000 (default)
- **Admin Credentials**: Configurable via command-line arguments

## Project Structure & Technology Stack

### Backend: Python Project (Poetry)
- **Technology**: Python with Poetry for dependency management
- **Directory**: `backend/`
- **Configuration Files**: `pyproject.toml`, `poetry.lock`
- **Dependency Installation**: `poetry install`

### Frontend: JavaScript Project (npm)
- **Technology**: Node.js with npm for dependency management
- **Directory**: `frontend/`
- **Configuration Files**: `package.json`, `package-lock.json`
- **Dependency Installation**: `npm install`

## Restoring Dependencies

To restore dependencies on both backend and frontend:

```bash
# Restore backend Python dependencies
cd backend
poetry install

# Restore frontend JavaScript dependencies
cd frontend
npm install
```

Or use the deployment script, which automatically restores both:

```bash
python deploy.py
```

## Running Components Manually

### Backend Server

Install dependencies with Poetry:

```bash
cd backend
poetry install
```

Start the backend API server:

```bash
python -m anonboard --admin-nickname teacher --admin-password secret
```

The backend listens on port 5000 and exposes only API endpoints.

### Frontend Server

Install dependencies with npm:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run server
```

The frontend server listens on port 3000 by default and serves the static files. You can set the backend URL:

```bash
BACKEND_API_URL=http://127.0.0.1:5000 npm run server
```

Then access the application at `http://localhost:3000`.

## Running the Complete System

Use the deployment script to start all components together:

```bash
python deploy.py
```

This script will:
1. Install backend dependencies and start the backend server on port 5000
2. Install frontend dependencies and start the frontend server on port 3000
3. Output logs to `backend.log` and `frontend.log`
4. Run until you press Ctrl+C to shut everything down

## Testing

### Backend Tests

Run the backend test suite:

```bash
cd backend
pytest
```

Tests are located in `backend/tests/` and cover:
- CLI functionality (`test_cli.py`)
- Data store operations (`test_store.py`)
- WebSocket functionality (`test_ws.py`)

### Frontend Tests

Run the frontend test suite:

```bash
cd frontend
npm test
```

Tests are located in `frontend/src/` and cover:
- Server functionality (`server.test.js`)
- UI components and interactions (`ui.test.js`)