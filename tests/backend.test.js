const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");

const { isValidEmail, isStrongPassword } = require("../src/utils/validators");
const { ok, fail } = require("../src/utils/respond");
const requireRole = require("../src/middleware/roleMiddleware");
const requireAuth = require("../src/middleware/authMiddleware");

function responseDouble() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("email validation accepts valid email and rejects invalid email", () => {
  assert.equal(isValidEmail("customer@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("password validation enforces the minimum length", () => {
  assert.equal(isStrongPassword("secret1"), true);
  assert.equal(isStrongPassword("123"), false);
});

test("success responses use the standard API structure", () => {
  const res = responseDouble();
  ok(res, 201, "Created", { id: "123" });
  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, {
    success: true,
    message: "Created",
    data: { id: "123" },
  });
});

test("error responses use the standard API structure", () => {
  const res = responseDouble();
  fail(res, 400, "Invalid input");
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid input",
    data: null,
  });
});

test("role middleware allows an approved role", () => {
  const req = { user: { role: "admin" } };
  const res = responseDouble();
  let called = false;
  requireRole("admin")(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
});

test("role middleware rejects an unapproved role", () => {
  const req = { user: { role: "customer" } };
  const res = responseDouble();
  requireRole("admin")(req, res, () => {});
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
});

test("authentication middleware rejects a missing token", () => {
  const req = { headers: {} };
  const res = responseDouble();
  requireAuth(req, res, () => {});
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.data, null);
});

test("authentication middleware accepts a valid token", () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-secret";
  const token = jwt.sign(
    { id: "user-1", role: "provider" },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = responseDouble();
  let called = false;

  requireAuth(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.user.id, "user-1");
  assert.equal(req.user.role, "provider");

  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});
