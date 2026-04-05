// ============================================================
// Zorvyn Financial Assessment — Prisma Client Singleton
//
// WHY SINGLETON:
// In development, Next.js / ts-node hot reload creates new
// Prisma instances on every file change, exhausting the
// database connection pool. The global singleton pattern
// prevents this — one client instance for the entire process.
// ============================================================

import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
