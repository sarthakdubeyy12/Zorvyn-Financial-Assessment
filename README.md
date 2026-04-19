### Finance Data Processing and Access Control Backend
**Submitted by:** Sarthak Dubey — dubeysarthak47@gmail.com

---

## 🔗 Live Deployment

| | URL |
|---|---|
| **Live API** | https://zorvyn-financial-assessment-production.up.railway.app |
| **Swagger Docs** | https://zorvyn-financial-assessment-production.up.railway.app/api/docs |
| **Health Check** | https://zorvyn-financial-assessment-production.up.railway.app/health |
| **GitHub** | https://github.com/sarthakdubeyy12/Zorvyn-Financial-Assessment |

> The API is live and fully functional. Seeded test credentials are available below under [Getting Started](#getting-started).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Philosophy](#architecture-philosophy)
3. [Tech Stack & Why](#tech-stack--why)
4. [Project Structure](#project-structure)
5. [Data Model](#data-model)
6. [Permission System](#permission-system)
7. [API Reference](#api-reference)
8. [Audit Trail](#audit-trail)
9. [Getting Started](#getting-started)
10. [Environment Variables](#environment-variables)
11. [Running Tests](#running-tests)
12. [Assumptions & Decisions](#assumptions--decisions)
13. [Tradeoffs Considered](#tradeoffs-considered)
14. [What I Would Build Next](#what-i-would-build-next)

---

## Overview

This is a backend system for a **finance dashboard** that supports multi-role access, financial record management, real-time summary analytics, and a full audit trail on every mutation.

The system is designed around three core concerns — mirroring how modern financial infrastructure actually thinks:

| Layer | Purpose | Inspired By |
|---|---|---|
| **Ledger** | Financial records — the source of truth | Core financial data integrity |
| **Comply** | Access control + audit trail — every action logged | Regulatory and compliance thinking |
| **Insight** | Dashboard analytics — aggregated, meaningful data | Business intelligence layer |

This is not just a CRUD app. Every architectural decision was made with financial systems thinking in mind.

---

## Architecture Philosophy

### Why this structure?

Most backend systems treat financial data as just another resource. In reality, financial data has unique requirements:

- **Immutability matters** — deleting a financial record should never erase history. We use soft deletes.
- **Every action must be traceable** — who created what, when, and what changed. We log every mutation.
- **Money is not a float** — all amount fields use `Decimal` types to avoid floating-point precision errors.
- **Permissions over roles** — roles change, but a declarative permission matrix is explicit, auditable, and extensible.

These are not over-engineering choices. They are the minimum bar for any system that handles financial data responsibly.

### Request Lifecycle

```
Request
  → authenticate.ts     (verify JWT, attach user to request)
  → authorize.ts        (check permission matrix for this route)
  → validate.ts         (Zod schema validation on body/params/query)
  → Controller          (thin layer — calls service, returns response)
  → Service             (business logic lives here)
  → Prisma ORM          (database operations)
  → audit.service.ts    (log mutation with before/after state)
  → Response
```

Every layer has exactly one job. No business logic leaks into controllers. No database calls in routes.

---

## Tech Stack & Why

| Technology | Role | Reason |
|---|---|---|
| **Node.js + TypeScript** | Runtime + Language | Type safety is non-negotiable for financial data. Catches schema mismatches at compile time. |
| **Express.js** | Framework | Minimal and explicit. Keeps the architecture visible rather than magic. |
| **PostgreSQL** | Database | Relational model is the correct choice for financial records. ACID compliance, joins, constraints. |
| **Prisma ORM** | Database layer | Type-safe queries, schema-as-code, clean migrations. Reduces raw SQL errors. |
| **JWT** | Authentication | Stateless, standard, and works well for API-first systems. Access + refresh token pattern. |
| **Zod** | Validation | Schema-first validation that pairs naturally with TypeScript types. Single source of truth for input shape. |
| **Swagger / OpenAPI** | API Documentation | Zorvyn is an API-first company. Documentation is not optional — it is part of the deliverable. |
| **Jest + Supertest** | Testing | Integration tests on critical paths: auth, permissions, record creation. |
| **bcrypt** | Password hashing | Industry standard. Passwords are never stored in plain text. |

---

## Project Structure

```
zorvyn-assessment/
├── src/
│   ├── modules/
│   │   ├── auth/                   # Login, token issuance, session management
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.routes.ts
│   │   │
│   │   ├── users/                  # User management, role assignment, status control
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   └── users.routes.ts
│   │   │
│   │   ├── records/                # Financial entries — the Ledger layer
│   │   │   ├── records.controller.ts
│   │   │   ├── records.service.ts
│   │   │   └── records.routes.ts
│   │   │
│   │   ├── dashboard/              # Aggregated analytics — the Insight layer
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   └── dashboard.routes.ts
│   │   │
│   │   └── audit/                  # Immutable action log — the Comply layer
│   │       ├── audit.service.ts
│   │       └── audit.routes.ts
│   │
│   ├── middleware/
│   │   ├── authenticate.ts         # JWT verification, user context injection
│   │   ├── authorize.ts            # Permission matrix guard
│   │   └── validate.ts             # Zod input validation wrapper
│   │
│   ├── config/
│   │   └── permissions.ts          # Declarative permission matrix (role → actions)
│   │
│   ├── utils/
│   │   ├── response.ts             # Standardized API response shape
│   │   └── errors.ts               # Custom error classes with HTTP status codes
│   │
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types and interfaces
│   │
│   └── app.ts                      # Express app setup, middleware registration
│
├── prisma/
│   └── schema.prisma               # Database schema — single source of truth
│
├── tests/
│   ├── auth.test.ts
│   ├── records.test.ts
│   └── dashboard.test.ts
│
├── .env.example                    # All required environment variables documented
├── package.json
├── tsconfig.json
└── README.md
```

---

## Data Model

### Core Design Decisions

**1. `amount` is `Decimal`, not `Float`**
Floating-point arithmetic introduces rounding errors. For a system handling financial records, `Decimal(15, 2)` is the only correct choice. This is enforced at the Prisma schema level.

**2. Soft deletes on financial records**
Financial records are never hard deleted. The `isDeleted` flag preserves history while removing the record from normal queries. This is standard practice in financial systems for auditability.

**3. AuditLog is append-only**
No update or delete operations exist on AuditLog. Once written, a log entry is immutable. This mirrors how compliance systems like SOX require immutable audit trails.

### Schema Overview

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String                        // bcrypt hashed
  name      String
  role      Role     @default(VIEWER)
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  records   FinancialRecord[]
  auditLogs AuditLog[]
}

model FinancialRecord {
  id          String      @id @default(uuid())
  amount      Decimal     @db.Decimal(15, 2)   // Never Float
  type        RecordType                        // INCOME | EXPENSE
  category    String
  date        DateTime
  notes       String?
  isDeleted   Boolean     @default(false)       // Soft delete
  createdBy   String
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  user        User        @relation(fields: [createdBy], references: [id])
}

model AuditLog {
  id            String   @id @default(uuid())
  userId        String
  action        String                          // CREATE | UPDATE | DELETE | LOGIN
  entity        String                          // Which model was affected
  entityId      String?                         // Which record was affected
  previousValue Json?                           // State before change
  newValue      Json?                           // State after change
  ipAddress     String?
  timestamp     DateTime @default(now())        // Immutable — no updatedAt

  user          User     @relation(fields: [userId], references: [id])
}

enum Role   { VIEWER  ANALYST  ADMIN }
enum Status { ACTIVE  INACTIVE }
enum RecordType { INCOME  EXPENSE }
```

---

## Permission System

Rather than scattering `if role === 'admin'` checks throughout the codebase, permissions are defined once as a declarative matrix in `src/config/permissions.ts`.

```typescript
// src/config/permissions.ts

export const PERMISSIONS = {
  VIEWER: [
    'read:records',
    'read:dashboard',
  ],
  ANALYST: [
    'read:records',
    'read:dashboard',
    'read:insights',
    'read:audit',
  ],
  ADMIN: [
    'read:records',
    'write:records',
    'delete:records',
    'read:dashboard',
    'read:insights',
    'read:audit',
    'manage:users',
    'write:users',
  ],
} as const;
```

The `authorize` middleware takes a required permission string and checks it against the user's role:

```typescript
// Usage on any route
router.post('/records', authenticate, authorize('write:records'), validate(recordSchema), controller.create);
```

**Why this approach:**
- Adding a new role requires changing one file, not hunting through route files
- Permissions are readable and reviewable — a non-engineer can understand what each role can do
- Consistent enforcement — no route can accidentally skip the check

---

## API Reference

Full interactive documentation available at `GET /api/docs` (Swagger UI) after running the server.

### Auth
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login, receive JWT |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | Authenticated | Invalidate session |

### Users
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/users` | `manage:users` | List all users |
| GET | `/api/users/:id` | `manage:users` | Get user by ID |
| PATCH | `/api/users/:id/role` | `manage:users` | Update user role |
| PATCH | `/api/users/:id/status` | `manage:users` | Activate / deactivate user |

### Financial Records
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/records` | `read:records` | List records (with filters) |
| GET | `/api/records/:id` | `read:records` | Get single record |
| POST | `/api/records` | `write:records` | Create a new record |
| PATCH | `/api/records/:id` | `write:records` | Update a record |
| DELETE | `/api/records/:id` | `delete:records` | Soft delete a record |

**Query Parameters for GET `/api/records`:**
```
?type=INCOME|EXPENSE
?category=salary
?startDate=2024-01-01
?endDate=2024-12-31
?page=1&limit=20
?search=keyword
```

### Dashboard
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | `read:dashboard` | Total income, expenses, net balance |
| GET | `/api/dashboard/trends` | `read:insights` | Weekly and monthly breakdown |
| GET | `/api/dashboard/categories` | `read:insights` | Category-wise totals |
| GET | `/api/dashboard/recent` | `read:dashboard` | Last 10 transactions |
| GET | `/api/dashboard/cashflow` | `read:insights` | Cash flow over time |

### Audit
| Method | Endpoint | Permission | Description |
|---|---|---|---|
| GET | `/api/audit` | `read:audit` | Full audit log (paginated) |
| GET | `/api/audit/:entityId` | `read:audit` | Audit history for a specific record |

---

## Audit Trail

Every state-changing operation automatically writes to the `AuditLog` table. This happens inside the service layer — not in controllers, not in middleware — because it is business logic, not cross-cutting concern.

**What gets logged:**
- User login and logout
- Financial record created, updated, soft-deleted
- User role changes
- User status changes

**Log entry shape:**
```json
{
  "userId": "uuid-of-actor",
  "action": "UPDATE",
  "entity": "FinancialRecord",
  "entityId": "uuid-of-record",
  "previousValue": { "amount": "1000.00", "category": "salary" },
  "newValue": { "amount": "1200.00", "category": "salary" },
  "ipAddress": "192.168.1.1",
  "timestamp": "2024-03-15T10:30:00Z"
}
```

This directly mirrors Zorvyn Comply's core promise: *"Every action is logged with immutable timestamps. Who did what, when, and why."*

---

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL 14+
- npm or yarn

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/sarthakdubeyy12/Zorvyn-Financial-Assessment.git
cd zorvyn-assessment

# 2. Install dependencies
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in your DATABASE_URL and JWT_SECRET in .env

# 4. Run database migrations
npx prisma migrate dev --name init

# 5. Seed the database with test users
npx prisma db seed

# 6. Start the development server
npm run dev
```

The server starts at `http://localhost:3000`
Swagger docs available at `http://localhost:3000/api/docs`

### Seeded Test Users

After running the seed command, these users are available for testing:

| Email | Password | Role |
|---|---|---|
| admin@zorvyn.io | Admin@123 | ADMIN |
| analyst@zorvyn.io | Analyst@123 | ANALYST |
| viewer@zorvyn.io | Viewer@123 | VIEWER |

---

## Environment Variables

```env
# .env.example

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zorvyn_finance"

# JWT
JWT_SECRET="your-secret-key-minimum-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# Server
PORT=3000
NODE_ENV="development"

# Optional
BCRYPT_ROUNDS=12
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.ts
```

Tests cover:
- Auth flow: register, login, token refresh
- Permission enforcement: viewer blocked from write operations
- Record creation with validation failures
- Dashboard summary correctness
- Soft delete behavior

---

## Assumptions & Decisions

**1. Role hierarchy is flat, not inherited**
ANALYST does not automatically inherit VIEWER permissions. Each role's permissions are explicitly declared. This is intentional — explicit is safer than implicit in financial systems.

**2. Soft delete, not hard delete**
Financial records are never permanently removed. `isDeleted: true` hides them from normal queries but preserves audit history. Hard deletes are not exposed via any API.

**3. JWT with access + refresh token pattern**
Access tokens expire in 15 minutes. Refresh tokens expire in 7 days. This balances security with usability — a stolen access token has a short window.

**4. Amount precision: Decimal(15, 2)**
Supports amounts up to 999,999,999,999,999.99 with exactly 2 decimal places. No floating-point arithmetic anywhere in the financial calculation path.

**5. Pagination defaults to 20 records per page**
All list endpoints are paginated. No endpoint returns an unbounded result set.

**6. Category is a free-text field, not an enum**
Categories are user-defined (salary, rent, marketing, etc.) rather than a fixed list. This makes the system flexible for different business types without requiring schema changes.

**7. Inactive users cannot authenticate**
If a user's status is INACTIVE, login is rejected even with valid credentials. Tokens issued before deactivation are not explicitly invalidated in this implementation (see Tradeoffs).

---

## Tradeoffs Considered

**Token blacklisting not implemented**
When a user is deactivated or logs out, their existing JWT remains technically valid until expiry. A production system would use a Redis-backed token blacklist. Given the scope of this assessment, the short access token TTL (15 minutes) is the practical mitigation.

**No rate limiting on auth endpoints**
A production system would rate-limit `/auth/login` to prevent brute force attacks. This is noted as a gap, not an oversight.

**In-process audit logging**
Audit logs are written in the same database transaction as the main operation. A production system might use an event queue (Kafka, RabbitMQ) to decouple audit writing and ensure it survives service failures. For this scope, synchronous logging is acceptable and simpler to reason about.

**Single database, no read replica**
Dashboard aggregation queries run against the same database as write operations. At scale, a read replica or materialized views would separate the load. Not applicable at this scope.

---

## What I Would Build Next

Given more time, the next priorities would be:

1. **Redis token blacklist** — proper logout and deactivation invalidation
2. **Rate limiting** — on auth routes using `express-rate-limit`
3. **Materialized views** — for dashboard summary queries at scale
4. **Webhook support** — notify external systems on record changes
5. **Multi-currency support** — store amounts with currency code, convert on read
6. **CSV / PDF export** — financial records export for reporting use cases
7. **Role inheritance** — a proper RBAC hierarchy rather than flat permission lists

---



*Sarthak Dubey — dubeysarthak47@gmail.com*
*Built for Zorvyn Backend Developer Intern Assessment*
