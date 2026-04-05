// ============================================================
// Zorvyn Financial Assessment — Standardized API Responses
//
// WHY THIS EXISTS:
// Every API response follows the same envelope shape.
// This makes frontend integration predictable and eliminates
// the "sometimes it's data.result, sometimes it's data.records"
// inconsistency that plagues most backends.
//
// Success:  { success: true, data: T, message?, meta? }
// Error:    { success: false, error: { code, message, details? } }
// ============================================================

import { Response } from "express";
import { PaginationMeta, ApiSuccess, ApiError } from "../types";

// ─────────────────────────────────────────
// SUCCESS RESPONSES
// ─────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
  meta?: PaginationMeta
): Response<ApiSuccess<T>> {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = "Resource created successfully"
): Response<ApiSuccess<T>> {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

// ─────────────────────────────────────────
// PAGINATION META BUILDER
// ─────────────────────────────────────────

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
