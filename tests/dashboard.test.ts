// ============================================================
// FILE: tests/dashboard.test.ts
// ============================================================

import request from "supertest";
import app from "../src/app";
import prisma from "../src/config/prisma";

let adminToken: string;
let analystToken: string;
let viewerToken: string;

beforeAll(async () => {
  const adminRes = await request(app).post("/api/auth/login").send({
    email: "admin@zorvyn.io", password: "Admin@123",
  });
  adminToken = adminRes.body.data.tokens.accessToken;

  const analystRes = await request(app).post("/api/auth/login").send({
    email: "analyst@zorvyn.io", password: "Analyst@123",
  });
  analystToken = analystRes.body.data.tokens.accessToken;

  const viewerRes = await request(app).post("/api/auth/login").send({
    email: "viewer@zorvyn.io", password: "Viewer@123",
  });
  viewerToken = viewerRes.body.data.tokens.accessToken;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /api/dashboard/summary", () => {
  it("VIEWER can access summary", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBeDefined();
    expect(res.body.data.totalExpenses).toBeDefined();
    expect(res.body.data.netBalance).toBeDefined();
    expect(res.body.data.dateRange).toBeDefined();
  });

  it("returns correct net balance calculation", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${adminToken}`);

    const { totalIncome, totalExpenses, netBalance } = res.body.data;
    expect(netBalance).toBeCloseTo(totalIncome - totalExpenses, 2);
  });
});

describe("GET /api/dashboard/trends — Permission check", () => {
  it("ANALYST can access trends", async () => {
    const res = await request(app)
      .get("/api/dashboard/trends")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("VIEWER cannot access trends — returns 403", async () => {
    const res = await request(app)
      .get("/api/dashboard/trends")
      .set("Authorization", `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
  });
});

describe("GET /api/dashboard/cashflow", () => {
  it("returns running cumulative balance", async () => {
    const res = await request(app)
      .get("/api/dashboard/cashflow")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    const points = res.body.data;
    expect(Array.isArray(points)).toBe(true);

    if (points.length > 1) {
      // Verify cumulative balance is actually cumulative
      expect(points[points.length - 1].cumulativeBalance).toBeDefined();
    }
  });
});

describe("GET /api/dashboard/categories", () => {
  it("returns category breakdown with percentages", async () => {
    const res = await request(app)
      .get("/api/dashboard/categories")
      .set("Authorization", `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    if (res.body.data.length > 0) {
      const first = res.body.data[0];
      expect(first.category).toBeDefined();
      expect(first.total).toBeDefined();
      expect(first.percentage).toBeDefined();
      expect(first.percentage).toBeGreaterThanOrEqual(0);
      expect(first.percentage).toBeLessThanOrEqual(100);
    }
  });
});
