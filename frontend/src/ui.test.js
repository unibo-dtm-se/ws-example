import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, "..");
const publicDir = path.join(frontendDir, "public");
const assetsDir = path.join(publicDir, "assets");

const [commonScript, studentScript, teacherScript, studentHtml, teacherHtml] = await Promise.all([
    fs.readFile(path.join(assetsDir, "common.js"), "utf8"),
    fs.readFile(path.join(assetsDir, "student.js"), "utf8"),
    fs.readFile(path.join(assetsDir, "teacher.js"), "utf8"),
    fs.readFile(path.join(publicDir, "student.html"), "utf8"),
    fs.readFile(path.join(publicDir, "teacher.html"), "utf8"),
]);

function createJsonResponse(status, payload) {
    return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
            return payload;
        },
    };
}

function createFetchMock(handler) {
    const calls = [];

    const fetchMock = async (input, options = {}) => {
        const url = new URL(typeof input === "string" ? input : input.url);
        const call = {
            url,
            method: String(options.method || "GET").toUpperCase(),
            headers: options.headers || {},
            body: typeof options.body === "string" ? options.body : "",
        };

        calls.push(call);

        const result = await handler(call, calls);
        if (!result) {
            throw new Error(`Unexpected request: ${call.method} ${url.pathname}${url.search}`);
        }

        return createJsonResponse(result.status ?? 200, result.payload ?? {});
    };

    return { calls, fetchMock };
}

function getHeaderValue(headers, name) {
    const expected = name.toLowerCase();

    if (typeof headers?.get === "function") {
        return headers.get(name);
    }

    for (const [key, value] of Object.entries(headers || {})) {
        if (key.toLowerCase() === expected) {
            return String(value);
        }
    }

    return "";
}

function parseJsonBody(call) {
    return call.body ? JSON.parse(call.body) : null;
}

function makeQuestions(count, { start = 1, answered = false } = {}) {
    return Array.from({ length: count }, (_, index) => {
        const id = start + index;
        return {
            id,
            author: `student-${id}`,
            text: `Question ${id}`,
            timestamp: `2026-05-14T10:${String(id).padStart(2, "0")}:00.000Z`,
            answered,
        };
    });
}

async function flushAsync(turns = 5) {
    for (let index = 0; index < turns; index += 1) {
        await Promise.resolve();
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

async function submitForm(form) {
    const submitEvent = new form.ownerDocument.defaultView.Event("submit", {
        bubbles: true,
        cancelable: true,
    });

    form.dispatchEvent(submitEvent);
    await flushAsync();
}

async function clickElement(element) {
    element.click();
    await flushAsync();
}

async function loadUi({ html, pageScript, fetchHandler, localStorageEntries = [] }) {
    const dom = new JSDOM(html, {
        url: "http://localhost",
        pretendToBeVisual: true,
        runScripts: "outside-only",
    });
    const { window } = dom;
    const { calls, fetchMock } = createFetchMock(fetchHandler);

    window.__APP_CONFIG__ = { BACKEND_API_URL: "http://backend.example.test" };
    window.fetch = fetchMock;
    window.console = console;
    window.btoa = (value) => Buffer.from(value, "utf8").toString("base64");

    for (const [key, value] of localStorageEntries) {
        window.localStorage.setItem(key, value);
    }

    window.eval(commonScript);
    window.eval(pageScript);
    await flushAsync();

    return {
        calls,
        document: window.document,
        localStorage: window.localStorage,
        window,
        close() {
            window.close();
        },
    };
}

async function loadTeacherUi(options) {
    return loadUi({ html: teacherHtml, pageScript: teacherScript, ...options });
}

async function loadStudentUi(options) {
    return loadUi({ html: studentHtml, pageScript: studentScript, ...options });
}

test("teacher can log in with admin credentials", async () => {
    const questions = makeQuestions(2);
    const ui = await loadTeacherUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return { payload: questions };
            }

            if (call.method === "POST" && call.url.pathname === "/api/users/check") {
                return { payload: { nickname: "teacher", is_admin: true } };
            }

            return null;
        },
    });

    try {
        ui.document.querySelector("#teacher-nickname").value = "teacher";
        ui.document.querySelector("#teacher-password").value = "secret";

        await submitForm(ui.document.querySelector("#teacher-auth-form"));

        assert.equal(ui.localStorage.getItem("anonboard.teacher.nickname"), "teacher");
        assert.equal(ui.localStorage.getItem("anonboard.teacher.password"), "secret");
        assert.match(
            ui.document.querySelector("#teacher-auth-status").textContent,
            /Teacher credentials saved/
        );
        assert.equal(
            ui.document.querySelector("#teacher-auth-card").classList.contains("hidden"),
            true
        );
        assert.equal(
            ui.document.querySelector("#teacher-logout").classList.contains("hidden"),
            false
        );
        assert.equal(ui.document.querySelectorAll("#questions-list li").length, 2);
        assert.equal(ui.calls.filter((call) => call.url.pathname === "/api/questions").length, 2);
    } finally {
        ui.close();
    }
});

test("teacher can mark a question as answered", async () => {
    let answered = false;
    const ui = await loadTeacherUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return {
                    payload: [
                        {
                            id: 7,
                            author: "student-7",
                            text: "Question 7",
                            timestamp: "2026-05-14T10:07:00.000Z",
                            answered,
                        },
                    ],
                };
            }

            if (call.method === "POST" && call.url.pathname === "/api/users/check") {
                return { payload: { nickname: "teacher", is_admin: true } };
            }

            if (call.method === "PATCH" && call.url.pathname === "/api/questions/7") {
                const body = parseJsonBody(call);

                assert.deepEqual(body, { answered: true });
                assert.equal(
                    getHeaderValue(call.headers, "Authorization"),
                    "Basic dGVhY2hlcjpzZWNyZXQ="
                );

                answered = body.answered;
                return { payload: { id: 7, answered } };
            }

            return null;
        },
    });

    try {
        ui.document.querySelector("#teacher-nickname").value = "teacher";
        ui.document.querySelector("#teacher-password").value = "secret";
        await submitForm(ui.document.querySelector("#teacher-auth-form"));

        await clickElement(ui.document.querySelector("#questions-list button"));

        assert.match(ui.document.querySelector("#teacher-auth-status").textContent, /updated/);
        assert.match(ui.document.querySelector("#questions-list button").textContent, /Mark as pending/);
        assert.equal(ui.calls.some((call) => call.method === "PATCH"), true);
    } finally {
        ui.close();
    }
});

test("teacher question pagination appends items and hides load more on the last page", async () => {
    const firstPage = makeQuestions(10);
    const secondPage = makeQuestions(2, { start: 11 });
    const ui = await loadTeacherUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                const page = call.url.searchParams.get("page");
                const limit = call.url.searchParams.get("limit");

                assert.equal(limit, "10");
                return { payload: page === "2" ? secondPage : firstPage };
            }

            return null;
        },
    });

    try {
        assert.equal(
            ui.document.querySelector("#load-more-questions").classList.contains("hidden"),
            false
        );

        await clickElement(ui.document.querySelector("#load-more-questions"));

        assert.equal(ui.document.querySelectorAll("#questions-list li").length, 12);
        assert.match(ui.document.querySelector("#questions-list").textContent, /Question 11/);
        assert.equal(
            ui.document.querySelector("#load-more-questions").classList.contains("hidden"),
            true
        );
    } finally {
        ui.close();
    }
});

test("teacher login failure keeps the UI in logged-out state", async () => {
    const ui = await loadTeacherUi({
        localStorageEntries: [["anonboard.teacher.nickname", "old"], ["anonboard.teacher.password", "value"]],
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return { payload: [] };
            }

            if (call.method === "POST" && call.url.pathname === "/api/users/check") {
                return { status: 401, payload: { error: "Invalid credentials." } };
            }

            return null;
        },
    });

    try {
        ui.document.querySelector("#teacher-nickname").value = "teacher";
        ui.document.querySelector("#teacher-password").value = "wrong";

        await submitForm(ui.document.querySelector("#teacher-auth-form"));

        assert.equal(ui.localStorage.getItem("anonboard.teacher.nickname"), null);
        assert.equal(ui.localStorage.getItem("anonboard.teacher.password"), null);
        assert.match(ui.document.querySelector("#teacher-auth-status").textContent, /Invalid credentials/);
        assert.equal(
            ui.document.querySelector("#teacher-auth-card").classList.contains("hidden"),
            false
        );
    } finally {
        ui.close();
    }
});

test("student can register and unlock the question form", async () => {
    const ui = await loadStudentUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return { payload: [] };
            }

            if (call.method === "POST" && call.url.pathname === "/api/register") {
                assert.deepEqual(parseJsonBody(call), { nickname: "alice", password: "pw" });
                return { status: 201, payload: { nickname: "alice" } };
            }

            return null;
        },
    });

    try {
        ui.document.querySelector("#register-nickname").value = "alice";
        ui.document.querySelector("#register-password").value = "pw";

        await submitForm(ui.document.querySelector("#register-form"));

        assert.match(ui.document.querySelector("#register-status").textContent, /alice ready to post/);
        assert.equal(ui.document.querySelector("#register-card").classList.contains("hidden"), true);
        assert.equal(ui.document.querySelector("#question-card").classList.contains("hidden"), false);
        assert.equal(ui.document.querySelector("#question-nickname").value, "alice");
    } finally {
        ui.close();
    }
});

test("student can log in after a nickname conflict and sees an error on failed authentication", async () => {
    let authenticateSucceeds = true;

    const ui = await loadStudentUi({
        async fetchHandler(call, calls) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return { payload: [] };
            }

            if (call.method === "POST" && call.url.pathname === "/api/register") {
                return { status: 409, payload: { error: "Nickname already exists." } };
            }

            if (call.method === "POST" && call.url.pathname === "/api/users/check") {
                return authenticateSucceeds
                    ? { payload: { nickname: "alice" } }
                    : { status: 401, payload: { error: "Invalid credentials." } };
            }

            assert.fail(`Unexpected request #${calls.length}: ${call.method} ${call.url.pathname}`);
        },
    });

    try {
        ui.document.querySelector("#register-nickname").value = "alice";
        ui.document.querySelector("#register-password").value = "pw";
        await submitForm(ui.document.querySelector("#register-form"));

        assert.match(ui.document.querySelector("#register-status").textContent, /Welcome back, alice/);
        assert.equal(ui.document.querySelector("#question-card").classList.contains("hidden"), false);

        authenticateSucceeds = false;
        ui.document.querySelector("#register-card").classList.remove("hidden");
        ui.document.querySelector("#question-card").classList.add("hidden");
        ui.document.querySelector("#register-nickname").value = "alice";
        ui.document.querySelector("#register-password").value = "wrong";

        await submitForm(ui.document.querySelector("#register-form"));

        assert.match(ui.document.querySelector("#register-status").textContent, /Invalid credentials/);
    } finally {
        ui.close();
    }
});

test("student can submit a question with mocked backend responses", async () => {
    let questions = [];
    const ui = await loadStudentUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                return { payload: questions };
            }

            if (call.method === "POST" && call.url.pathname === "/api/register") {
                return { status: 201, payload: { nickname: "alice" } };
            }

            if (call.method === "POST" && call.url.pathname === "/api/questions") {
                assert.equal(
                    getHeaderValue(call.headers, "Authorization"),
                    "Basic YWxpY2U6cHc="
                );
                assert.deepEqual(parseJsonBody(call), { text: "How do mocks work?" });

                questions = [
                    {
                        id: 1,
                        author: "alice",
                        text: "How do mocks work?",
                        timestamp: "2026-05-14T11:00:00.000Z",
                        answered: false,
                    },
                ];

                return { status: 201, payload: questions[0] };
            }

            return null;
        },
    });

    try {
        ui.document.querySelector("#register-nickname").value = "alice";
        ui.document.querySelector("#register-password").value = "pw";
        await submitForm(ui.document.querySelector("#register-form"));

        ui.document.querySelector("#question-text").value = "How do mocks work?";
        await submitForm(ui.document.querySelector("#question-form"));

        assert.match(ui.document.querySelector("#question-status").textContent, /sent successfully/);
        assert.equal(ui.document.querySelector("#question-text").value, "");
        assert.equal(ui.document.querySelectorAll("#public-questions-list li").length, 1);
        assert.match(ui.document.querySelector("#public-questions-list").textContent, /How do mocks work\?/);
    } finally {
        ui.close();
    }
});

test("student question pagination appends items and hides load more on the last page", async () => {
    const firstPage = makeQuestions(10);
    const secondPage = makeQuestions(1, { start: 11 });
    const ui = await loadStudentUi({
        async fetchHandler(call) {
            if (call.method === "GET" && call.url.pathname === "/api/questions") {
                const page = call.url.searchParams.get("page");
                return { payload: page === "2" ? secondPage : firstPage };
            }

            return null;
        },
    });

    try {
        assert.equal(
            ui.document.querySelector("#load-more-public-questions").classList.contains("hidden"),
            false
        );

        await clickElement(ui.document.querySelector("#load-more-public-questions"));

        assert.equal(ui.document.querySelectorAll("#public-questions-list li").length, 11);
        assert.match(ui.document.querySelector("#public-questions-list").textContent, /Question 11/);
        assert.equal(
            ui.document.querySelector("#load-more-public-questions").classList.contains("hidden"),
            true
        );
    } finally {
        ui.close();
    }
});