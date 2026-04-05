// ============================================================
// Zorvyn Financial Assessment — Records Service
//
// WHY SOFT DELETE ONLY:
// Financial records cannot be hard deleted. Ever.
// If a transaction happened, it must remain in the system
// for audit, reconciliation, and regulatory purposes.
// isDeleted = true removes it from normal views while
// preserving the full history in the database.
//
// WHY OWNERSHIP CHECK:
// Only the creator of a record OR an Admin can modify it.
// An Analyst with write:records should not be able to edit
// another user's financial entry — that is a data integrity risk.
// ============================================================

import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { auditService } from "../audit/audit.service";
import {
  NotFoundError,
  GoneError,
  ForbiddenError,
} from "../../utils/errors";
import {
  CreateRecordInput,
  UpdateRecordInput,
  RecordFilterInput,
  Role,
} from "../../types";

class RecordsService {
  // ─────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────

  async create(
    userId: string,
    input: CreateRecordInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const record = await prisma.financialRecord.create({
      data: {
        amount: new Prisma.Decimal(input.amount),
        type: input.type,
        category: input.category,
        date: new Date(input.date),
        notes: input.notes ?? null,
        createdBy: userId,
      },
    });

    await auditService.logCreate(userId, "FinancialRecord", record.id, {
      amount: record.amount.toString(),
      type: record.type,
      category: record.category,
      date: record.date,
      notes: record.notes,
    }, meta);

    return record;
  }

  // ─────────────────────────────────────────
  // GET ALL — with filters + pagination
  // Only returns non-deleted records
  // ─────────────────────────────────────────

  async getAll(filters: RecordFilterInput) {
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause dynamically
    const where: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
      ...(type && { type }),
      ...(category && {
        category: { contains: category, mode: "insensitive" },
      }),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
      ...(search && {
        OR: [
          { category: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [records, total] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.financialRecord.count({ where }),
    ]);

    return { records, total };
  }

  // ─────────────────────────────────────────
  // GET BY ID
  // ─────────────────────────────────────────

  async getById(id: string) {
    const record = await prisma.financialRecord.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!record) throw new NotFoundError("Financial record");

    // Return specific error for soft-deleted records
    // 410 Gone is more informative than 404 for financial systems
    if (record.isDeleted) throw new GoneError("Financial record");

    return record;
  }

  // ─────────────────────────────────────────
  // UPDATE
  // Only creator or Admin can update
  // Cannot update a soft-deleted record
  // ─────────────────────────────────────────

  async update(
    actorId: string,
    actorRole: Role,
    recordId: string,
    input: UpdateRecordInput,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const record = await prisma.financialRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) throw new NotFoundError("Financial record");
    if (record.isDeleted) throw new GoneError("Financial record");

    // Ownership check — only creator or Admin can modify
    if (record.createdBy !== actorId && actorRole !== "ADMIN") {
      throw new ForbiddenError("You can only edit records you created");
    }

    const previousValue = {
      amount: record.amount.toString(),
      type: record.type,
      category: record.category,
      date: record.date,
      notes: record.notes,
    };

    const updated = await prisma.financialRecord.update({
      where: { id: recordId },
      data: {
        ...(input.amount !== undefined && {
          amount: new Prisma.Decimal(input.amount),
        }),
        ...(input.type && { type: input.type }),
        ...(input.category && { category: input.category }),
        ...(input.date && { date: new Date(input.date) }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });

    const newValue = {
      amount: updated.amount.toString(),
      type: updated.type,
      category: updated.category,
      date: updated.date,
      notes: updated.notes,
    };

    await auditService.logUpdate(
      actorId,
      "FinancialRecord",
      recordId,
      previousValue,
      newValue,
      meta
    );

    return updated;
  }

  // ─────────────────────────────────────────
  // SOFT DELETE
  // Sets isDeleted = true — record is never removed from DB
  // Only creator or Admin can delete
  // ─────────────────────────────────────────

  async softDelete(
    actorId: string,
    actorRole: Role,
    recordId: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const record = await prisma.financialRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) throw new NotFoundError("Financial record");
    if (record.isDeleted) throw new GoneError("Financial record");

    // Ownership check
    if (record.createdBy !== actorId && actorRole !== "ADMIN") {
      throw new ForbiddenError("You can only delete records you created");
    }

    await prisma.financialRecord.update({
      where: { id: recordId },
      data: { isDeleted: true },
    });

    await auditService.logDelete(actorId, "FinancialRecord", recordId, {
      amount: record.amount.toString(),
      type: record.type,
      category: record.category,
      date: record.date,
    }, meta);
  }
}

export const recordsService = new RecordsService();
