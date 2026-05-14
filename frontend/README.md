# AnonBoard Frontend

Frontend for the AnonBoard classroom Q&A application. This JavaScript project consists of two parts: browser-side static UI and a Node.js/Express server that serves the interface and proxies API requests to the backend.

## Technology Stack

- **Runtime**: Node.js (>= 24.15.0, < 27.0.0)
- **Package Manager**: npm (>= 10.0.0)
- **Server**: Express 5.1.0
- **Testing**: Node.js built-in test runner with jsdom and supertest
- **Module Type**: ES modules

## Project Structure

```
frontend/
├── src/
│   ├── server.js            # Express server
│   ├── server.test.js       # Server tests
│   └── ui.test.js           # UI tests
├── public/
│   ├── teacher.html         # Teacher interface
│   ├── student.html         # Student interface
│   └── assets/
│       ├── common.js        # Shared frontend logic
│       ├── teacher.js       # Teacher-specific frontend logic
│       ├── student.js       # Student-specific frontend logic
│       └── styles.css       # Shared styles
├── package.json             # npm configuration
├── package-lock.json        # Locked dependency versions
└── README.md
```

## Architecture

### Two-Tier Frontend

The frontend consists of two interconnected layers:

#### 1. Browser-Side Frontend
- **Files**: `public/student.html`, `public/teacher.html`, `public/assets/*.js`, `public/assets/styles.css`
- **Responsibility**: User interface, interactivity, and client-side logic
- **Language**: HTML, CSS, vanilla JavaScript
- **Communication**: Makes API calls to the frontend server via fetch/WebSocket
- **Entry Points**: 
  - `/` → Teacher interface
  - `/ask` → Student interface

#### 2. Frontend Server
- **File**: `src/server.js`
- **Framework**: Express
- **Responsibility**: 
  - Serves static HTML/CSS/JS files
  - Proxies API requests to the backend
  - Provides dynamic configuration to the browser
- **Listens on**: Port 3000 (default)
- **Backend Communication**: Configurable via `BACKEND_API_URL` environment variable

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

This installs all project dependencies as specified in `package.json`.

### 2. Run the Frontend Server

```bash
npm run server
```

The server will start on port 3000 and serve the application at `http://localhost:3000`.

### 3. Configure Backend URL (Optional)

By default, the frontend connects to the backend at `http://127.0.0.1:5000`. To use a different backend:

```bash
BACKEND_API_URL=https://api.example.com npm run server
```

The frontend server will log a warning if `BACKEND_API_URL` is not explicitly set.

## Routes

The frontend server exposes the following routes:

- `GET /` → Serves `teacher.html` (teacher interface)
- `GET /ask` → Serves `student.html` (student interface)
- `GET /assets/*` → Serves static assets (JS, CSS)
- `GET /app-config.js` → Dynamic configuration script with `BACKEND_API_URL`
- `*` → 404 response for unknown routes

## Development

### Running Tests

Run the complete test suite:

```bash
npm test
```

Tests are executed using Node.js built-in test runner and include:
- **server.test.js**: Tests for the Express server (routing, middleware, configuration)
- **ui.test.js**: Tests for browser-side UI functionality

### Test Dependencies

- **jsdom**: DOM implementation for testing browser code in Node.js
- **supertest**: HTTP assertion library for testing Express routes

## Frontend Components

### Student Interface (`student.html` / `student.js`)
- Allows students to submit anonymous questions
- View Q&A feed
- Real-time updates via WebSocket

### Teacher Interface (`teacher.html` / `teacher.js`)
- Manage questions and answers
- Moderate content
- View analytics

### Common Utilities (`common.js`)
- Shared functionality between student and teacher interfaces
- API communication utilities
- WebSocket setup

## Configuration

### Environment Variables

- `BACKEND_API_URL` (optional): URL of the backend API server
  - Default: `http://127.0.0.1:5000`
  - Used to configure where the browser makes API calls
  - Injected into browser via `window.__APP_CONFIG__`

### Node.js Environment

- `NODE_ENV=test`: Used by the server to disable logging in test mode

## API Communication

The browser-side frontend communicates with the backend through:

1. **REST API**: Standard HTTP requests for CRUD operations
2. **WebSocket**: Real-time bidirectional communication for live updates

All requests are routed through the frontend server, which forwards them to the backend API.

## Contributing

When working on the frontend:

1. Make changes to browser-side files in `public/assets/` for UI logic
2. Modify `public/*.html` for interface structure
3. Update `src/server.js` for server-side changes
4. Write tests in `src/*.test.js`
5. Run tests before submitting: `npm test`
6. Ensure all tests pass and no regressions are introduced

## Troubleshooting

### Backend Connection Issues

If the frontend cannot reach the backend:
1. Verify the backend server is running on port 5000
2. Check the `BACKEND_API_URL` environment variable
3. Look at browser console for connection errors
4. Verify CORS policies if backend is on a different origin
