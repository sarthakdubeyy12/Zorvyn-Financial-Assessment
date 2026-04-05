// ============================================================
// Zorvyn Financial Assessment — Custom Error Classes
//
// WHY THIS EXISTS:
// Throwing generic Error objects forces every catch block to
// guess what HTTP status code to use.
//
// Our custom errors carry their status code and error code
// with them. The global error handler reads these and responds
// consistently — no guessing, no inconsistency.
//
// Pattern: throw new NotFoundError("Record not found")
// Result:  { success: false, error: { code: "NOT_FOUND", message: "..." } }
// ============================================================

// ─────────────────────────────────────────
// BASE APPLICATION ERROR
// ─────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─────────────────────────────────────────
// HTTP ERROR CLASSES
// Each maps to a specific status code + error code
// ─────────────────────────────────────────

// 400 — Client sent invalid data
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

// 401 — Not authenticated
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

// 403 — Authenticated but not permitted
// Critical distinction from 401:
// 401 = "I don't know who you are"
// 403 = "I know who you are, and you can't do this"
export class ForbiddenError extends AppError {
  constructor(message: string = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

// 404 — Resource doesn't exist
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

// 409 — State conflict (e.g. duplicate email)
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

// 410 — Resource existed but is soft-deleted
// More informative than 404 for financial systems
export class GoneError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} has been deleted`, 410, "GONE");
  }
}

// 422 — Input is valid format but violates business rules
// e.g. amount = 0, future date on expense
export class BusinessRuleError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, "BUSINESS_RULE_VIOLATION", details);
  }
}

// 429 — Too many requests
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests, please try again later") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

// 500 — Something broke on our end
export class InternalError extends AppError {
  constructor(message: string = "An internal error occurred") {
    // isOperational = false — these are programmer errors, not user errors
    super(message, 500, "INTERNAL_ERROR", undefined, false);
  }
}

// ─────────────────────────────────────────
// GLOBAL ERROR HANDLER MIDDLEWARE
// Registered last in app.ts — catches everything
// ─────────────────────────────────────────

import { Request, Response, NextFunction } from "express";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Known operational error — respond with its details
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
    return;
  }

  // Prisma unique constraint violation (e.g. duplicate email)
  if ((err as any).code === "P2002") {
    res.status(409).json({
      success: false,
      error: {
        code: "CONFLICT",
        message: "A record with this value already exists",
      },
    });
    return;
  }

  // Prisma record not found
  if ((err as any).code === "P2025") {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Record not found",
      },
    });
    return;
  }

  // Unknown error — don't leak internals
  console.error("UNHANDLED ERROR:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}

// ─────────────────────────────────────────
// 404 HANDLER — for unknown routes
// Registered before globalErrorHandler in app.ts
// ─────────────────────────────────────────

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.path}`));
}
