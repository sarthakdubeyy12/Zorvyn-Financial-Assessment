// ============================================================
// Zorvyn Financial Assessment — Dashboard Routes
// ============================================================

import { Router } from "express";
import { dashboardController } from "./dashboard.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { dashboardQuerySchema } from "../../middleware/validate";

const dashboardRouter = Router();

// GET /api/dashboard/summary — VIEWER+
dashboardRouter.get(
  "/summary",
  authenticate,
  authorize("read:dashboard"),
  validate(dashboardQuerySchema, "query"),
  dashboardController.getSummary.bind(dashboardController)
);

// GET /api/dashboard/recent — VIEWER+
dashboardRouter.get(
  "/recent",
  authenticate,
  authorize("read:dashboard"),
  dashboardController.getRecent.bind(dashboardController)
);

// GET /api/dashboard/trends — ANALYST+
dashboardRouter.get(
  "/trends",
  authenticate,
  authorize("read:insights"),
  validate(dashboardQuerySchema, "query"),
  dashboardController.getTrends.bind(dashboardController)
);

// GET /api/dashboard/categories — ANALYST+
dashboardRouter.get(
  "/categories",
  authenticate,
  authorize("read:insights"),
  validate(dashboardQuerySchema, "query"),
  dashboardController.getCategories.bind(dashboardController)
);

// GET /api/dashboard/cashflow — ANALYST+
dashboardRouter.get(
  "/cashflow",
  authenticate,
  authorize("read:insights"),
  validate(dashboardQuerySchema, "query"),
  dashboardController.getCashflow.bind(dashboardController)
);

export default dashboardRouter;