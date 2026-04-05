// ============================================================
// Zorvyn Financial Assessment — Authorization Middleware
//
// WHY THIS EXISTS:
// Authentication answers "who are you?"
// Authorization answers "what are you allowed to do?"
//
// This middleware reads the required permission from the route
// definition and checks it against the permission matrix in
// src/config/permissions.ts — the single source of truth.
//
// Usage on any route:
// router.post('/records', authenticate, authorize('write:records'), controller.create)
// ============================================================

import { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors";
import { hasPermission } from "../config/permissions";
import { Permission } from "../types";

// Returns a middleware function that checks for the required permission
export function authorize(requiredPermission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // authenticate middleware must run before authorize
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const { role } = req.user;

      // Check permission matrix
      if (!hasPermission(role, requiredPermission)) {
        throw new ForbiddenError(
          `Role '${role}' does not have permission: '${requiredPermission}'`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
