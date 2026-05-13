import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

function normalizeBackendApiUrl(rawUrl) {
    return rawUrl.endsWith("/") ? rawUrl.slice(0, -1) : rawUrl;
}

function createApp() {
    const app = express();
    const backendApiUrl = normalizeBackendApiUrl(
        process.env.BACKEND_API_URL || "http://127.0.0.1:5000"
    );

    if (process.env.BACKEND_API_URL === undefined) {
        console.warn(
            `Warning: BACKEND_API_URL environment variable is not set. Defaulting to ${backendApiUrl}.
            Make sure to set it to the correct backend API URL in production.`
        );
    }

    app.use("/assets", express.static(path.join(publicDir, "assets")));

    app.get("/app-config.js", (_request, response) => {
        response.type("application/javascript");
        response.send(
            `window.__APP_CONFIG__ = ${JSON.stringify({ BACKEND_API_URL: backendApiUrl })};\n`
        );
    });

    app.get("/", (_request, response) => {
        response.sendFile(path.join(publicDir, "teacher.html"));
    });

    app.get("/ask", (_request, response) => {
        response.sendFile(path.join(publicDir, "student.html"));
    });

    app.use((_request, response) => {
        response.status(404).type("text/plain").send("Not found");
    });

    return app;
}

const app = createApp();

if (process.env.NODE_ENV !== "test") {
    const port = Number(process.env.PORT || "3000");
    app.listen(port, () => {
        console.log(`AnonBoard frontend listening on port http://localhost:${port}`);
    });
}

export { createApp };
export default app;