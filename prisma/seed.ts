import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const rounds = 12;

  // ── Seed Users ──────────────────────────────────────
  const users = [
    {
      name: "System Admin",
      email: "admin@zorvyn.io",
      password: await bcrypt.hash("Admin@123", rounds),
      role: Role.ADMIN,
    },
    {
      name: "Finance Analyst",
      email: "analyst@zorvyn.io",
      password: await bcrypt.hash("Analyst@123", rounds),
      role: Role.ANALYST,
    },
    {
      name: "Dashboard Viewer",
      email: "viewer@zorvyn.io",
      password: await bcrypt.hash("Viewer@123", rounds),
      role: Role.VIEWER,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    console.log(`  ✓ User: ${user.email} (${user.role})`);
  }

  // ── Seed Financial Records ───────────────────────────
  const admin = await prisma.user.findUnique({
    where: { email: "admin@zorvyn.io" },
  });

  if (!admin) throw new Error("Admin user not found");

  const records = [
    { amount: 85000, type: "INCOME" as const, category: "salary", date: new Date("2024-03-01"), notes: "March salary" },
    { amount: 12000, type: "INCOME" as const, category: "freelance", date: new Date("2024-03-05"), notes: "Client project" },
    { amount: 3500,  type: "EXPENSE" as const, category: "rent", date: new Date("2024-03-01"), notes: "Monthly rent" },
    { amount: 8500,  type: "EXPENSE" as const, category: "marketing", date: new Date("2024-03-10"), notes: "Ad spend Q1" },
    { amount: 2100,  type: "EXPENSE" as const, category: "utilities", date: new Date("2024-03-15"), notes: "Electricity + internet" },
    { amount: 45000, type: "INCOME" as const, category: "consulting", date: new Date("2024-02-20"), notes: "Strategy consulting" },
    { amount: 6200,  type: "EXPENSE" as const, category: "software", date: new Date("2024-02-25"), notes: "SaaS subscriptions" },
    { amount: 15000, type: "INCOME" as const, category: "investment", date: new Date("2024-02-10"), notes: "Dividend income" },
    { amount: 4800,  type: "EXPENSE" as const, category: "travel", date: new Date("2024-02-15"), notes: "Client meetings" },
    { amount: 9200,  type: "EXPENSE" as const, category: "payroll", date: new Date("2024-03-28"), notes: "Staff payroll" },
  ];

  for (const record of records) {
    await prisma.financialRecord.create({
      data: { ...record, createdBy: admin.id },
    });
  }

  console.log(`  ✓ ${records.length} financial records seeded`);
  console.log("\n✅ Seed complete!\n");
  console.log("  Test credentials:");
  console.log("  ADMIN    → admin@zorvyn.io    / Admin@123");
  console.log("  ANALYST  → analyst@zorvyn.io  / Analyst@123");
  console.log("  VIEWER   → viewer@zorvyn.io   / Viewer@123\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
