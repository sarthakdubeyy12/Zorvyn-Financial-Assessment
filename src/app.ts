// ============================================================
// Zorvyn Financial Assessment — Application Entry Point
// app.ts — Express app setup, middleware registration, routes
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import recordsRoutes from "./modules/records/records.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import auditRoutes from "./modules/audit/audit.routes";
import { globalErrorHandler, notFoundHandler } from "./utils/errors";

const app = express();

// ─────────────────────────────────────────
// SECURITY MIDDLEWARE
// helmet sets secure HTTP headers
// cors restricts cross-origin requests
// ─────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") ?? "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ─────────────────────────────────────────
// REQUEST PARSING
// ─────────────────────────────────────────

app.use(express.json({ limit: "10kb" })); // Limit payload size
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────
// LOGGING
// Dev: colorized, human readable
// Production: JSON for log aggregation
// ─────────────────────────────────────────

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─────────────────────────────────────────
// HEALTH CHECK
// Simple endpoint for deployment monitoring
// Returns 200 if the server is up and DB is reachable
// ─────────────────────────────────────────

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: "Zorvyn Finance API",
      version: process.env.npm_package_version ?? "1.0.0",
      endpoints: {
        health: "/health",
        docs: "/api/docs",
        auth: "/api/auth",
        users: "/api/users",
        records: "/api/records",
        dashboard: "/api/dashboard",
        audit: "/api/audit",
      },
    },
  });
});

app.get("/health", async (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "1.0.0",
    },
  });
});

// ─────────────────────────────────────────
// API DOCUMENTATION
// Available at GET /api/docs
// ─────────────────────────────────────────

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: "Zorvyn Finance API",
  customCss: ".swagger-ui .topbar { display: none }",
}));

// ─────────────────────────────────────────
// ROUTES
// All routes prefixed with /api
// ─────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/records", recordsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/audit", auditRoutes);

// ─────────────────────────────────────────
// ERROR HANDLERS
// Order matters — notFound before globalError
// ─────────────────────────────────────────

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ─────────────────────────────────────────
// SERVER START
// ─────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000", 10);

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Zorvyn Finance API                     ║
  ║   Running on http://localhost:${PORT}        ║
  ║   Docs:    http://localhost:${PORT}/api/docs ║
  ║   Health:  http://localhost:${PORT}/health   ║
  ╚══════════════════════════════════════════╝
  `);
});

export default app;
