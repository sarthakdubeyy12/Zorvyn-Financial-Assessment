// ============================================================
// Zorvyn Financial Assessment — Dashboard Controller
// ============================================================

import { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/response";
import { dashboardService } from "./dashboard.service";

export class DashboardController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getSummary(req.query as any);
      sendSuccess(res, data, "Dashboard summary retrieved");
    } catch (err) {
      next(err);
    }
  }

  async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { groupBy, ...range } = req.query as any;
      const data = await dashboardService.getTrends(range, groupBy ?? "monthly");
      sendSuccess(res, data, "Trend data retrieved");
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getCategories(req.query as any);
      sendSuccess(res, data, "Category breakdown retrieved");
    } catch (err) {
      next(err);
    }
  }

  async getRecent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 10;
      const data = await dashboardService.getRecent(limit);
      sendSuccess(res, data, "Recent activity retrieved");
    } catch (err) {
      next(err);
    }
  }

  async getCashflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await dashboardService.getCashflow(req.query as any);
      sendSuccess(res, data, "Cashflow data retrieved");
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();



