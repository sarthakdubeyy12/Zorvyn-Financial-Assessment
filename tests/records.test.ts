// ============================================================
// FILE: tests/records.test.ts
// ============================================================

import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";

const BASE = "/api/records";
let adminToken: string;
let viewerToken: string;
let analystToken: string;
let createdRecordId: string;

beforeAll(async () => {
  // Login as seeded users
  const adminRes = await request(app).post("/api/auth/login").send({
    email: "admin@zorvyn.io",
    password: "Admin@123",
  });
  adminToken = adminRes.body.data.tokens.accessToken;

  const viewerRes = await request(app).post("/api/auth/login").send({
    email: "viewer@zorvyn.io",
    password: "Viewer@123",
  });
  viewerToken = viewerRes.body.data.tokens.accessToken;

  const analystRes = await request(app).post("/api/auth/login").send({
    email: "analyst@zorvyn.io",
    password: "Analyst@123",
  });
  analystToken = analystRes.body.data.tokens.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/records — Access Control", () => {
  it("ADMIN can create a financial record", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        amount: 5000,
        type: "INCOME",
        category: "test_salary",
        date: "2024-03-01T00:00:00Z",
        notes: "Test record",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe("5000");
    createdRecordId = res.body.data.id;
  });

  it("VIEWER cannot create a record — returns 403", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({
        amount: 1000,
        type: "INCOME",
        category: "test",
        date: "2024-03-01T00:00:00Z",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("ANALYST cannot create a record — returns 403", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${analystToken}`)
      .send({
        amount: 1000,
        type: "EXPENSE",
        category: "test",
        date: "2024-03-01T00:00:00Z",
      });

    expect(res.status).toBe(403);
  });
});

describe("POST /api/records — Validation", () => {
  it("rejects negative amount", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: -100, type: "INCOME", category: "test", date: "2024-03-01T00:00:00Z" });

    expect(res.status).toBe(400);
  });

  it("rejects zero amount", async () => {
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 0, type: "INCOME", category: "test", date: "2024-03-01T00:00:00Z" });

    expect(res.status).toBe(400);
  });

  it("rejects future date", async () => {
    const futureDate = new Date(Date.now() + 86400000 * 10).toISOString();
    const res = await request(app)
      .post(BASE)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 100, type: "INCOME", category: "test", date: futureDate });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/records — Filters", () => {
  it("VIEWER can read records", async () => {
    const res = await request(app)
      .get(BASE)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined(); // Pagination meta
  });

  it("can filter by type=INCOME", async () => {
    const res = await request(app)
      .get(`${BASE}?type=INCOME`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((r: any) => {
      expect(r.type).toBe("INCOME");
    });
  });
});

describe("DELETE /api/records/:id — Soft Delete", () => {
  it("ADMIN can soft delete a record", async () => {
    const res = await request(app)
      .delete(`${BASE}/${createdRecordId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it("deleted record returns 410 Gone", async () => {
    const res = await request(app)
      .get(`${BASE}/${createdRecordId}`)
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe("GONE");
  });
});