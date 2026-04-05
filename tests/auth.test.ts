// ============================================================
// FILE: tests/auth.test.ts
// ============================================================

import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";

const BASE = "/api/auth";

// Clean up test users after each test suite
afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entity: "User" } });
  await prisma.user.deleteMany({ where: { email: { contains: "test_" } } });
  await prisma.$disconnect();
});

describe("POST /api/auth/register", () => {
  it("should register a new user and return tokens", async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: "Test User",
      email: "test_register@zorvyn.io",
      password: "Test@1234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined(); // Never expose password
    expect(res.body.data.user.role).toBe("VIEWER"); // Default role
  });

  it("should reject duplicate email with 409", async () => {
    const payload = {
      name: "Duplicate User",
      email: "test_duplicate@zorvyn.io",
      password: "Test@1234",
    };

    await request(app).post(`${BASE}/register`).send(payload);
    const res = await request(app).post(`${BASE}/register`).send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("should reject weak password with 400", async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: "Weak Password",
      email: "test_weak@zorvyn.io",
      password: "123456", // No uppercase, no lowercase
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post(`${BASE}/register`).send({
      name: "Login Test",
      email: "test_login@zorvyn.io",
      password: "Login@1234",
    });
  });

  it("should login and return access + refresh tokens", async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: "test_login@zorvyn.io",
      password: "Login@1234",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
  });

  it("should reject wrong password with 401", async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: "test_login@zorvyn.io",
      password: "WrongPassword@1",
    });

    expect(res.status).toBe(401);
    // Must not reveal whether the email exists
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("should reject non-existent email with same 401 message", async () => {
    const res = await request(app).post(`${BASE}/login`).send({
      email: "ghost@zorvyn.io",
      password: "Ghost@1234",
    });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });
});

describe("GET /api/auth/me", () => {
  let accessToken: string;

  beforeAll(async () => {
    const res = await request(app).post(`${BASE}/register`).send({
      name: "Me Test",
      email: "test_me@zorvyn.io",
      password: "Me@12345",
    });
    accessToken = res.body.data.tokens.accessToken;
  });

  it("should return current user when authenticated", async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("test_me@zorvyn.io");
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });
});