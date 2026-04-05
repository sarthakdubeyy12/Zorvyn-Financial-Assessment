// ============================================================
// Zorvyn Financial Assessment — Input Validation Middleware
//
// WHY ZOD:
// Zod schemas are TypeScript-first. They validate AND infer
// types simultaneously — one schema, zero duplication.
//
// WHY BUSINESS RULES IN SCHEMAS:
// Validation is not just "is this a number?"
// It's "is this a VALID number for a financial system?"
// amount > 0, date not in future for expenses, category
// max length — these are business rules, enforced at the edge.
// ============================================================

import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";
import { ValidationError } from "../utils/errors";
import { RecordType, Role, UserStatus } from "@prisma/client";

// ─────────────────────────────────────────
// VALIDATION MIDDLEWARE FACTORY
// Usage: validate(schema) — validates req.body
// Usage: validate(schema, 'query') — validates req.query
// Usage: validate(schema, 'params') — validates req.params
// ─────────────────────────────────────────

export function validate(
  schema: ZodSchema,
  source: "body" | "query" | "params" = "body"
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const details = result.error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        throw new ValidationError("Validation failed", details);
      }

      // Replace source with parsed + coerced data
      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .trim(),

  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password cannot exceed 72 characters") // bcrypt limit
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: "Refresh token is required" })
    .min(1, "Refresh token is required"),
});

// ─────────────────────────────────────────
// USER SCHEMAS
// ─────────────────────────────────────────

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role, {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(Role).join(", ")}` }),
  }),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({ message: `Status must be one of: ${Object.values(UserStatus).join(", ")}` }),
  }),
});

// ─────────────────────────────────────────
// FINANCIAL RECORD SCHEMAS
// ─────────────────────────────────────────

export const createRecordSchema = z.object({
  // amount must be positive — zero-value financial records are meaningless
  amount: z
    .number({ required_error: "Amount is required" })
    .positive("Amount must be greater than 0")
    .max(999_999_999_999_999.99, "Amount exceeds maximum supported value")
    // Round to 2 decimal places to match Decimal(15,2)
    .transform((val) => Math.round(val * 100) / 100),

  type: z.nativeEnum(RecordType, {
    errorMap: () => ({ message: "Type must be either INCOME or EXPENSE" }),
  }),

  category: z
    .string({ required_error: "Category is required" })
    .min(1, "Category cannot be empty")
    .max(100, "Category cannot exceed 100 characters")
    .trim(),

  date: z
    .string({ required_error: "Date is required" })
    .datetime({ message: "Date must be a valid ISO 8601 datetime string" })
    .refine((dateStr) => {
      // Financial records cannot be dated in the future
      // A transaction that hasn't happened yet is not a record — it's a forecast
      return new Date(dateStr) <= new Date();
    }, "Record date cannot be in the future"),

  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .trim()
    .optional(),
});

export const updateRecordSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than 0")
    .max(999_999_999_999_999.99, "Amount exceeds maximum supported value")
    .transform((val) => Math.round(val * 100) / 100)
    .optional(),

  type: z.nativeEnum(RecordType).optional(),

  category: z
    .string()
    .min(1, "Category cannot be empty")
    .max(100, "Category cannot exceed 100 characters")
    .trim()
    .optional(),

  date: z
    .string()
    .datetime({ message: "Date must be a valid ISO 8601 datetime string" })
    .refine((dateStr) => new Date(dateStr) <= new Date(), "Record date cannot be in the future")
    .optional(),

  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .trim()
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided for update"
);

// ─────────────────────────────────────────
// FILTER / QUERY SCHEMAS
// ─────────────────────────────────────────

export const recordFilterSchema = z.object({
  type: z.nativeEnum(RecordType).optional(),
  category: z.string().trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
}).refine((data) => {
  // If both dates are provided, startDate must be before endDate
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "startDate must be before or equal to endDate",
  path: ["startDate"],
});

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "startDate must be before or equal to endDate",
  path: ["startDate"],
});

export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid ID format — must be a valid UUID"),
});
