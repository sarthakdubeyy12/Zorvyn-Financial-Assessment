// ============================================================
// Zorvyn Financial Assessment — Dashboard Service
//
// WHY THESE SPECIFIC ENDPOINTS:
// The assignment says "total income, expenses, net balance"
// but that is the minimum. A real finance dashboard needs:
//
// 1. summary    — snapshot of current financial position
// 2. trends     — how are financials changing over time
// 3. categories — where is money coming from / going to
// 4. recent     — latest activity for quick review
// 5. cashflow   — running balance over time (the key insight)
//
// Every endpoint accepts startDate + endDate so data is always
// scoped. "Total income" without a date range is meaningless
// for business decision making.
//
// DEFAULT RANGE: Current calendar month
// If no dates provided, we show the current month — this
// ensures the dashboard always loads with meaningful data.
// ============================================================

import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { DashboardDateRange } from "../../types";

// ─────────────────────────────────────────
// DATE RANGE HELPER
// Defaults to current month if no range provided
// ─────────────────────────────────────────

function resolveDateRange(range: DashboardDateRange): {
  from: Date;
  to: Date;
} {
  const now = new Date();

  const from = range.startDate
    ? new Date(range.startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month

  const to = range.endDate
    ? new Date(range.endDate)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

  return { from, to };
}

class DashboardService {
  // ─────────────────────────────────────────
  // 1. SUMMARY
  // Total income, total expenses, net balance
  // The financial snapshot — most critical endpoint
  // ─────────────────────────────────────────

  async getSummary(range: DashboardDateRange) {
    const { from, to } = resolveDateRange(range);

    const baseWhere: Prisma.FinancialRecordWhereInput = {
      isDeleted: false,
      date: { gte: from, lte: to },
    };

    // Run both aggregations in parallel — no sequential waiting
    const [incomeResult, expenseResult, recordCount] = await Promise.all([
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: "INCOME" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.financialRecord.count({ where: baseWhere }),
    ]);

    const totalIncome = Number(incomeResult._sum.amount ?? 0);
    const totalExpenses = Number(expenseResult._sum.amount ?? 0);
    const netBalance = totalIncome - totalExpenses;

    return {
      totalIncome,
      totalExpenses,
      netBalance,
      recordCount,
      incomeCount: incomeResult._count,
      expenseCount: expenseResult._count,
      dateRange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
    };
  }

  // ─────────────────────────────────────────
  // 2. TRENDS
  // Monthly and weekly breakdown
  // Shows trajectory — not just current state
  // ─────────────────────────────────────────

  async getTrends(range: DashboardDateRange, groupBy: "monthly" | "weekly" = "monthly") {
    const { from, to } = resolveDateRange(range);

    const records = await prisma.financialRecord.findMany({
      where: {
        isDeleted: false,
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    // Group records by period in application layer
    // This avoids complex DB-specific date functions and
    // keeps the logic portable across PostgreSQL versions
    const grouped = new Map<string, { income: number; expenses: number }>();

    for (const record of records) {
      const date = new Date(record.date);

      let period: string;
      if (groupBy === "monthly") {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // ISO week number
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
        );
        period = `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      }

      if (!grouped.has(period)) {
        grouped.set(period, { income: 0, expenses: 0 });
      }

      const entry = grouped.get(period)!;
      const amount = Number(record.amount);

      if (record.type === "INCOME") {
        entry.income += amount;
      } else {
        entry.expenses += amount;
      }
    }

    return Array.from(grouped.entries()).map(([period, data]) => ({
      period,
      income: Math.round(data.income * 100) / 100,
      expenses: Math.round(data.expenses * 100) / 100,
      net: Math.round((data.income - data.expenses) * 100) / 100,
    }));
  }

  // ─────────────────────────────────────────
  // 3. CATEGORIES
  // Where is money coming from and going to
  // Includes percentage of total for each category
  // ─────────────────────────────────────────

  async getCategories(range: DashboardDateRange) {
    const { from, to } = resolveDateRange(range);

    const records = await prisma.financialRecord.findMany({
      where: {
        isDeleted: false,
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        type: true,
        category: true,
      },
    });

    // Group by category + type
    const grouped = new Map<string, { total: number; count: number; type: string }>();

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const record of records) {
      const key = `${record.category}__${record.type}`;
      const amount = Number(record.amount);

      if (!grouped.has(key)) {
        grouped.set(key, { total: 0, count: 0, type: record.type });
      }

      const entry = grouped.get(key)!;
      entry.total += amount;
      entry.count += 1;

      if (record.type === "INCOME") totalIncome += amount;
      else totalExpenses += amount;
    }

    return Array.from(grouped.entries()).map(([key, data]) => {
      const [category] = key.split("__");
      const typeTotal = data.type === "INCOME" ? totalIncome : totalExpenses;
      const percentage = typeTotal > 0
        ? Math.round((data.total / typeTotal) * 10000) / 100
        : 0;

      return {
        category,
        type: data.type,
        total: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage,
      };
    }).sort((a, b) => b.total - a.total);
  }

  // ─────────────────────────────────────────
  // 4. RECENT ACTIVITY
  // Last N transactions — quick pulse check
  // ─────────────────────────────────────────

  async getRecent(limit: number = 10) {
    return prisma.financialRecord.findMany({
      where: { isDeleted: false },
      take: Math.min(limit, 50), // Hard cap at 50
      orderBy: { date: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  // ─────────────────────────────────────────
  // 5. CASHFLOW
  // Running cumulative balance over time
  // This is the KEY insight — shows financial trajectory
  // at a glance. Declining cashflow is an early warning signal.
  // ─────────────────────────────────────────

  async getCashflow(range: DashboardDateRange) {
    const { from, to } = resolveDateRange(range);

    const records = await prisma.financialRecord.findMany({
      where: {
        isDeleted: false,
        date: { gte: from, lte: to },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by date and compute running balance
    const dailyMap = new Map<string, { income: number; expenses: number }>();

    for (const record of records) {
      const dateKey = record.date.toISOString().split("T")[0]; // YYYY-MM-DD
      const amount = Number(record.amount);

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { income: 0, expenses: 0 });
      }

      const entry = dailyMap.get(dateKey)!;
      if (record.type === "INCOME") entry.income += amount;
      else entry.expenses += amount;
    }

    // Build cumulative balance timeline
    let runningBalance = 0;
    return Array.from(dailyMap.entries()).map(([date, data]) => {
      const dailyNet = data.income - data.expenses;
      runningBalance += dailyNet;

      return {
        date,
        dailyIncome: Math.round(data.income * 100) / 100,
        dailyExpenses: Math.round(data.expenses * 100) / 100,
        dailyNet: Math.round(dailyNet * 100) / 100,
        cumulativeBalance: Math.round(runningBalance * 100) / 100,
      };
    });
  }
}

export const dashboardService = new DashboardService();
