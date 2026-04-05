// ============================================================
// Zorvyn Financial Assessment — Audit Service
//
// WHY THIS IS A SERVICE, NOT MIDDLEWARE:
// Audit logging is business logic — it captures WHAT changed
// in domain terms (which record, what fields, before/after).
// Middleware handles cross-cutting concerns like auth headers.
//
// Every state-changing operation calls audit.log() explicitly.
// This makes auditing visible, intentional, and testable —
// not a hidden side effect buried in middleware.
//
// The AuditLog table is APPEND-ONLY.
// No update or delete methods exist here. Intentionally.
// ============================================================

import prisma from "../../config/prisma";
import { CreateAuditInput } from "../../types";
import { AuditAction } from "@prisma/client";

class AuditService {
  // ─────────────────────────────────────────
  // CORE LOG METHOD
  // Called by every service after a state change
  // Fire-and-forget — never throws, never blocks the main flow
  // ─────────────────────────────────────────

  async log(input: CreateAuditInput): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? undefined,
          previousValue: input.previousValue ?? undefined,
          newValue: input.newValue ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
        },
      });
    } catch (err) {
      console.error("[AuditService] Failed to write audit log:", err);
    }
  }

  // ─────────────────────────────────────────
  // CONVENIENCE METHODS
  // Typed wrappers for common audit actions
  // ─────────────────────────────────────────

  async logCreate(
    userId: string,
    entity: string,
    entityId: string,
    newValue: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.CREATE,
      entity,
      entityId,
      newValue,
      ...meta,
    });
  }

  async logUpdate(
    userId: string,
    entity: string,
    entityId: string,
    previousValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      entity,
      entityId,
      previousValue,
      newValue,
      ...meta,
    });
  }

  async logDelete(
    userId: string,
    entity: string,
    entityId: string,
    previousValue: Record<string, unknown>,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.DELETE,
      entity,
      entityId,
      previousValue,
      ...meta,
    });
  }

  async logLogin(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGIN,
      entity: "User",
      entityId: userId,
      ...meta,
    });
  }

  async logLogout(
    userId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGOUT,
      entity: "User",
      entityId: userId,
      ...meta,
    });
  }

  async logRoleChange(
    actorId: string,
    targetId: string,
    previousRole: string,
    newRole: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId: actorId,
      action: AuditAction.ROLE_CHANGE,
      entity: "User",
      entityId: targetId,
      previousValue: { role: previousRole },
      newValue: { role: newRole },
      ...meta,
    });
  }

  async logStatusChange(
    actorId: string,
    targetId: string,
    previousStatus: string,
    newStatus: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.log({
      userId: actorId,
      action: AuditAction.STATUS_CHANGE,
      entity: "User",
      entityId: targetId,
      previousValue: { status: previousStatus },
      newValue: { status: newStatus },
      ...meta,
    });
  }

  // ─────────────────────────────────────────
  // READ METHODS
  // Used by the audit routes (ANALYST + ADMIN only)
  // ─────────────────────────────────────────

  async getAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count(),
    ]);

    return { logs, total };
  }

  async getByEntityId(entityId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { entityId },
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where: { entityId } }),
    ]);

    return { logs, total };
  }
}

// Export as singleton — one audit service for the entire app
export const auditService = new AuditService();
