// ============================================================
// Zorvyn Financial Assessment — Auth Routes
// ============================================================

import { Router } from "express";
import { authController } from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "../../middleware/validate";

const router = Router();

// POST /api/auth/register — Public
router.post(
  "/register",
  validate(registerSchema),
  authController.register.bind(authController)
);

// POST /api/auth/login — Public
router.post(
  "/login",
  validate(loginSchema),
  authController.login.bind(authController)
);

// POST /api/auth/refresh — Public (uses refresh token)
router.post(
  "/refresh",
  validate(refreshSchema),
  authController.refresh.bind(authController)
);

// POST /api/auth/logout — Authenticated
router.post(
  "/logout",
  authenticate,
  authController.logout.bind(authController)
);

// GET /api/auth/me — Authenticated
// Returns the current user's profile and permissions
router.get(
  "/me",
  authenticate,
  authController.me.bind(authController)
);

export default router;
