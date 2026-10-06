const test = require("node:test");
const assert = require("node:assert/strict");

const BASE_URL =
  process.env.API_BASE_URL ||
  "https://handeled-service-marketplace-api.onrender.com";

test("live health endpoint returns a successful response", async () => {
  const response = await fetch(`${BASE_URL}/`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
});

test("live services endpoint returns structured data", async () => {
  const response = await fetch(`${BASE_URL}/api/services?limit=5&page=1`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(Array.isArray(body.data), true);
});

test("protected booking endpoint rejects unauthenticated requests", async () => {
  const response = await fetch(`${BASE_URL}/api/bookings`);
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.data, null);
});

test("invalid service id produces a helpful client error", async () => {
  const response = await fetch(`${BASE_URL}/api/services/not-a-valid-id`);
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
});
