// ============================================================
// Zorvyn Financial Assessment — Auth Controller
//
// Controllers are intentionally thin.
// They extract request data, call the service, return response.
// Zero business logic lives here — that belongs in the service.
// ============================================================

import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import { sendSuccess, sendCreated } from "../../utils/response";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.register(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      sendCreated(res, { user, tokens }, "Account created successfully");
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, tokens } = await authService.login(req.body, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      sendSuccess(res, { user, tokens }, "Login successful");
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      sendSuccess(res, { tokens }, "Tokens refreshed successfully");
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.user!.id, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      sendSuccess(res, null, "Logged out successfully");
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      sendSuccess(res, req.user, "Current user retrieved");
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
