// ============================================================
// Zorvyn Financial Assessment — Permission Matrix
//
// WHY THIS EXISTS:
// Scattering "if role === ADMIN" checks across route files is
// brittle, hard to audit, and easy to get wrong.
//
// This single file is the ONLY place where role-to-permission
// mapping is defined. Changing what a role can do means
// changing ONE place — not hunting through every route file.
//
// A non-engineer can read this file and understand the entire
// access model of the system. That is intentional.
// ============================================================

import { Role } from "@prisma/client";
import { Permission } from "../types";

// ─────────────────────────────────────────
// PERMISSION MATRIX
// Each role gets an explicit list of what it can do.
// No inheritance — explicit is safer than implicit in finance.
// ─────────────────────────────────────────

export const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  // VIEWER: Read-only. Can see records and basic dashboard.
  // Cannot access insights, audit logs, or manage anything.
  VIEWER: [
    "read:records",
    "read:dashboard",
  ],

  // ANALYST: Extended read access. Can see trends, categories,
  // cashflow insights, and the audit trail. Cannot write anything.
  ANALYST: [
    "read:records",
    "read:dashboard",
    "read:insights",
    "read:audit",
  ],

  // ADMIN: Full access. Can write records, manage users,
  // change roles and statuses, and see everything.
  ADMIN: [
    "read:records",
    "write:records",
    "delete:records",
    "read:dashboard",
    "read:insights",
    "read:audit",
    "manage:users",
    "write:users",
  ],
};

// ─────────────────────────────────────────
// HELPER — check if a role has a permission
// Used by the authorize middleware
// ─────────────────────────────────────────

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role].includes(permission);
}

// ─────────────────────────────────────────
// HELPER — get all permissions for a role
// Useful for returning permission list in user profile responses
// ─────────────────────────────────────────

export function getPermissions(role: Role): Permission[] {
  return PERMISSION_MATRIX[role];
}

// ─────────────────────────────────────────
// EDGE CASE GUARDS
// Business rules that go beyond simple permission checks
// ─────────────────────────────────────────

// Prevents an Admin from changing their own role
// Edge case: if the last admin demotes themselves, the system
// loses all admin access permanently.
export function canChangeRole(actorId: string, targetId: string): boolean {
  return actorId !== targetId;
}

// Prevents an Admin from deactivating themselves
// Same reasoning as above — self-lockout prevention.
export function canChangeStatus(actorId: string, targetId: string): boolean {
  return actorId !== targetId;
}
