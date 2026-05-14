import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

process.env.NODE_ENV = "test";
process.env.BACKEND_API_URL = "https://backend.example.test";

const { default: app, createApp } = await import("./server.js");

test("serves the teacher page", async () => {
    const response = await request(app).get("/");

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Teacher dashboard/);
    assert.match(response.text, /common\.js/);
    assert.match(response.text, /teacher\.js/);
});

test("serves the student page", async () => {
    const response = await request(app).get("/ask");

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /Post an anonymous question/);
    assert.match(response.text, /common\.js/);
    assert.match(response.text, /student\.js/);
});

test("publishes frontend runtime configuration", async () => {
    const response = await request(createApp()).get("/app-config.js");

    assert.equal(response.statusCode, 200);
    assert.match(response.text, /https:\/\/backend\.example\.test/);
});