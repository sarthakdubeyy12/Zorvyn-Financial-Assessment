// ============================================================
// Zorvyn Financial Assessment — Users Service
// ============================================================

import prisma from "../../config/prisma";
import { auditService } from "../audit/audit.service";
import { canChangeRole, canChangeStatus } from "../../config/permissions";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "../../utils/errors";
import { Role, UserStatus, SafeUser } from "../../types";

// Fields returned in all user responses — password never included
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

class UsersService {
  // ─────────────────────────────────────────
  // LIST ALL USERS
  // ─────────────────────────────────────────

  async getAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: SAFE_USER_SELECT,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return { users, total };
  }

  // ─────────────────────────────────────────
  // GET SINGLE USER
  // ─────────────────────────────────────────

  async getById(id: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundError("User");

    return user;
  }

  // ─────────────────────────────────────────
  // UPDATE ROLE
  // Edge case: Admin cannot change their own role
  // This prevents accidental self-lockout
  // ─────────────────────────────────────────

  async updateRole(
    actorId: string,
    targetId: string,
    newRole: Role,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SafeUser> {
    // Self-role-change guard
    if (!canChangeRole(actorId, targetId)) {
      throw new ForbiddenError("You cannot change your own role");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: SAFE_USER_SELECT,
    });

    if (!target) throw new NotFoundError("User");

    // No-op check — avoid unnecessary writes and audit noise
    if (target.role === newRole) {
      return target;
    }

    const previousRole = target.role;

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { role: newRole },
      select: SAFE_USER_SELECT,
    });

    await auditService.logRoleChange(actorId, targetId, previousRole, newRole, meta);

    return updated;
  }

  // ─────────────────────────────────────────
  // UPDATE STATUS
  // Edge case: Admin cannot deactivate themselves
  // ─────────────────────────────────────────

  async updateStatus(
    actorId: string,
    targetId: string,
    newStatus: UserStatus,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SafeUser> {
    // Self-deactivation guard
    if (!canChangeStatus(actorId, targetId)) {
      throw new ForbiddenError("You cannot change your own status");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: SAFE_USER_SELECT,
    });

    if (!target) throw new NotFoundError("User");

    // No-op check
    if (target.status === newStatus) {
      return target;
    }

    const previousStatus = target.status;

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { status: newStatus },
      select: SAFE_USER_SELECT,
    });

    await auditService.logStatusChange(actorId, targetId, previousStatus, newStatus, meta);

    return updated;
  }
}

export const usersService = new UsersService();