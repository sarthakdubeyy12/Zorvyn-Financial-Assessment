// ============================================================
// Zorvyn Financial Assessment — Audit Routes
// ============================================================

import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { auditService } from "./audit.service";
import { sendSuccess, buildPaginationMeta } from "../../utils/response";
import { z } from "zod";

const router = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

const uuidParamSchema = z.object({
  entityId: z.string().uuid("Invalid entity ID"),
});

// GET /api/audit — Full audit log (paginated)
// Only ANALYST and ADMIN can access
router.get(
  "/",
  authenticate,
  authorize("read:audit"),
  validate(paginationSchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = req.query as any;
      const { logs, total } = await auditService.getAll(page, limit);
      const meta = buildPaginationMeta(total, page, limit);
      sendSuccess(res, logs, "Audit logs retrieved", 200, meta);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/audit/:entityId — Audit history for a specific record
router.get(
  "/:entityId",
  authenticate,
  authorize("read:audit"),
  validate(uuidParamSchema, "params"),
  validate(paginationSchema, "query"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId } = req.params;
      const { page, limit } = req.query as any;
      const { logs, total } = await auditService.getByEntityId(entityId, page, limit);
      const meta = buildPaginationMeta(total, page, limit);
      sendSuccess(res, logs, "Entity audit history retrieved", 200, meta);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
