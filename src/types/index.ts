// ============================================================
// Zorvyn Financial Assessment — Shared Types
// Single source of truth for all TypeScript interfaces.
// These types flow through every layer — controller to service.
// ============================================================

import { Role, UserStatus, RecordType, AuditAction } from "@prisma/client";

// Re-export Prisma enums so modules import from one place
export { Role, UserStatus, RecordType, AuditAction };

// ─────────────────────────────────────────
// REQUEST CONTEXT
// Injected by authenticate middleware onto every request
// ─────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
}

// Extends Express Request with our auth context
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ─────────────────────────────────────────
// JWT PAYLOAD
// ─────────────────────────────────────────

export interface JwtAccessPayload {
  sub: string;   // userId
  email: string;
  role: Role;
  type: "access";
}

export interface JwtRefreshPayload {
  sub: string;   // userId
  type: "refresh";
}

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─────────────────────────────────────────
// USER
// ─────────────────────────────────────────

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserRoleInput {
  role: Role;
}

export interface UpdateUserStatusInput {
  status: UserStatus;
}

// Safe user shape — password never returned in responses
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────
// FINANCIAL RECORDS
// ─────────────────────────────────────────

export interface CreateRecordInput {
  amount: number;
  type: RecordType;
  category: string;
  date: string; // ISO date string from request body
  notes?: string;
}

export interface UpdateRecordInput {
  amount?: number;
  type?: RecordType;
  category?: string;
  date?: string;
  notes?: string;
}

export interface RecordFilterInput {
  type?: RecordType;
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────

export interface DashboardDateRange {
  startDate?: string;
  endDate?: string;
}

export interface SummaryResult {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  recordCount: number;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface TrendPoint {
  period: string;   // "2024-03" for monthly, "2024-W12" for weekly
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryTotal {
  category: string;
  type: RecordType;
  total: number;
  count: number;
  percentage: number;
}

export interface CashflowPoint {
  date: string;
  cumulativeBalance: number;
  dailyIncome: number;
  dailyExpenses: number;
}

// ─────────────────────────────────────────
// AUDIT
// ─────────────────────────────────────────

export interface CreateAuditInput {
  userId: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// ─────────────────────────────────────────
// API RESPONSE SHAPES
// All responses follow this envelope pattern
// ─────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ─────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────

export type Permission =
  | "read:records"
  | "write:records"
  | "delete:records"
  | "read:dashboard"
  | "read:insights"
  | "read:audit"
  | "manage:users"
  | "write:users";
