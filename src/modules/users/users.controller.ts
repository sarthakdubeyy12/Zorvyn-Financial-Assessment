// ============================================================
// Zorvyn Financial Assessment — Users Controller
// ============================================================

import { Request, Response, NextFunction } from "express";
import { sendSuccess, buildPaginationMeta } from "../../utils/response";
import { usersService } from "./users.service";

export class UsersController {
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const { users, total } = await usersService.getAll(page, limit);
      const meta = buildPaginationMeta(total, page, limit);
      sendSuccess(res, users, "Users retrieved", 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.getById(req.params.id);
      sendSuccess(res, user, "User retrieved");
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateRole(
        req.user!.id,
        req.params.id,
        req.body.role,
        { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
      );
      sendSuccess(res, user, "User role updated");
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await usersService.updateStatus(
        req.user!.id,
        req.params.id,
        req.body.status,
        { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
      );
      sendSuccess(res, user, "User status updated");
    } catch (err) {
      next(err);
    }
  }
}

export const usersController = new UsersController();