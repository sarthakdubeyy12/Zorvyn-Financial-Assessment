// ============================================================
// Zorvyn Financial Assessment — Records Routes
// ============================================================

import { Router } from "express";
import { recordsController } from "./records.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import {
  createRecordSchema,
  updateRecordSchema,
  recordFilterSchema,
  uuidParamSchema,
} from "../../middleware/validate";

const recordsRouter = Router();

// GET /api/records — List with filters (VIEWER+)
recordsRouter.get(
  "/",
  authenticate,
  authorize("read:records"),
  validate(recordFilterSchema, "query"),
  recordsController.getAll.bind(recordsController)
);

// GET /api/records/:id — Single record (VIEWER+)
recordsRouter.get(
  "/:id",
  authenticate,
  authorize("read:records"),
  validate(uuidParamSchema, "params"),
  recordsController.getById.bind(recordsController)
);

// POST /api/records — Create (ADMIN only)
recordsRouter.post(
  "/",
  authenticate,
  authorize("write:records"),
  validate(createRecordSchema),
  recordsController.create.bind(recordsController)
);

// PATCH /api/records/:id — Update (ADMIN only)
recordsRouter.patch(
  "/:id",
  authenticate,
  authorize("write:records"),
  validate(uuidParamSchema, "params"),
  validate(updateRecordSchema),
  recordsController.update.bind(recordsController)
);

// DELETE /api/records/:id — Soft delete (ADMIN only)
recordsRouter.delete(
  "/:id",
  authenticate,
  authorize("delete:records"),
  validate(uuidParamSchema, "params"),
  recordsController.delete.bind(recordsController)
);

export default recordsRouter;
