// ============================================================
// Zorvyn Financial Assessment — Users Routes
// ============================================================

import { Router } from "express";
import { usersController } from "./users.controller";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { updateRoleSchema, updateStatusSchema, uuidParamSchema } from "../../middleware/validate";

const usersRouter = Router();

// GET /api/users — List all users (ADMIN only)
usersRouter.get(
  "/",
  authenticate,
  authorize("manage:users"),
  usersController.getAll.bind(usersController)
);

// GET /api/users/:id — Get user by ID (ADMIN only)
usersRouter.get(
  "/:id",
  authenticate,
  authorize("manage:users"),
  validate(uuidParamSchema, "params"),
  usersController.getById.bind(usersController)
);

// PATCH /api/users/:id/role — Update user role (ADMIN only)
usersRouter.patch(
  "/:id/role",
  authenticate,
  authorize("manage:users"),
  validate(uuidParamSchema, "params"),
  validate(updateRoleSchema),
  usersController.updateRole.bind(usersController)
);

// PATCH /api/users/:id/status — Activate/deactivate user (ADMIN only)
usersRouter.patch(
  "/:id/status",
  authenticate,
  authorize("manage:users"),
  validate(uuidParamSchema, "params"),
  validate(updateStatusSchema),
  usersController.updateStatus.bind(usersController)
);

export default usersRouter;
