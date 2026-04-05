// ============================================================
// Zorvyn Financial Assessment — Records Controller
// ============================================================

import { Request, Response, NextFunction } from "express";
import { recordsService } from "./records.service";
import { sendSuccess, sendCreated, sendNoContent, buildPaginationMeta } from "../../utils/response";

export class RecordsController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await recordsService.create(
        req.user!.id,
        req.body,
        { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
      );
      sendCreated(res, record, "Financial record created");
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = req.query as any;
      const { records, total } = await recordsService.getAll(filters);
      const meta = buildPaginationMeta(total, filters.page, filters.limit);
      sendSuccess(res, records, "Records retrieved", 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await recordsService.getById(req.params.id);
      sendSuccess(res, record, "Record retrieved");
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await recordsService.update(
        req.user!.id,
        req.user!.role,
        req.params.id,
        req.body,
        { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
      );
      sendSuccess(res, record, "Record updated");
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await recordsService.softDelete(
        req.user!.id,
        req.user!.role,
        req.params.id,
        { ipAddress: req.ip, userAgent: req.headers["user-agent"] }
      );
      sendNoContent(res);
    } catch (err) {
      next(err);
    }
  }
}

export const recordsController = new RecordsController();


