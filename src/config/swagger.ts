// ============================================================
// Zorvyn Financial Assessment — Swagger / OpenAPI Config
// Zorvyn is an API-first company. Docs are not optional.
// ============================================================

import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Zorvyn Finance API",
      version: "1.0.0",
      description: `
## Finance Data Processing and Access Control Backend

Built for the Zorvyn Backend Developer Intern Assessment.

### Authentication
All protected endpoints require a Bearer token in the Authorization header.
\`Authorization: Bearer <access_token>\`

### Role Permissions
| Permission | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| read:records | ✓ | ✓ | ✓ |
| read:dashboard | ✓ | ✓ | ✓ |
| read:insights | | ✓ | ✓ |
| read:audit | | ✓ | ✓ |
| write:records | | | ✓ |
| delete:records | | | ✓ |
| manage:users | | | ✓ |

### Response Envelope
All responses follow a consistent shape:
\`\`\`json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "error": { "code": "...", "message": "..." } }
\`\`\`
      `,
      contact: {
        name: "Sarthak Dubey",
        email: "dubeysarthak47@gmail.com",
      },
    },
    servers: [
      {
        url: "https://zorvyn-financial-assessment-production.up.railway.app",
        description: "Live production server (Railway)",
      },
      {
        url: "http://localhost:3000",
        description: "Local development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your access token from /api/auth/login",
        },
      },
      schemas: {
        // ── Auth ──
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Sarthak Dubey" },
            email: { type: "string", example: "sarthak@example.com" },
            password: { type: "string", example: "Secret@123" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", example: "admin@zorvyn.io" },
            password: { type: "string", example: "Admin@123" },
          },
        },
        AuthTokens: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
          },
        },
        // ── User ──
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["VIEWER", "ANALYST", "ADMIN"] },
            status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // ── Financial Record ──
        FinancialRecord: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            amount: { type: "number", example: 5000.00 },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            category: { type: "string", example: "salary" },
            date: { type: "string", format: "date-time" },
            notes: { type: "string", example: "Monthly salary payment" },
            isDeleted: { type: "boolean", example: false },
            createdBy: { type: "string", format: "uuid" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        CreateRecordRequest: {
          type: "object",
          required: ["amount", "type", "category", "date"],
          properties: {
            amount: { type: "number", example: 5000.00, minimum: 0.01 },
            type: { type: "string", enum: ["INCOME", "EXPENSE"] },
            category: { type: "string", example: "salary", maxLength: 100 },
            date: { type: "string", format: "date-time", example: "2024-03-15T00:00:00Z" },
            notes: { type: "string", example: "Monthly salary", maxLength: 500 },
          },
        },
        // ── Dashboard ──
        DashboardSummary: {
          type: "object",
          properties: {
            totalIncome: { type: "number", example: 50000 },
            totalExpenses: { type: "number", example: 32000 },
            netBalance: { type: "number", example: 18000 },
            recordCount: { type: "integer", example: 45 },
            dateRange: {
              type: "object",
              properties: {
                from: { type: "string", format: "date-time" },
                to: { type: "string", format: "date-time" },
              },
            },
          },
        },
        // ── Error ──
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "VALIDATION_ERROR" },
                message: { type: "string", example: "Validation failed" },
                details: { type: "array", items: { type: "object" } },
              },
            },
          },
        },
        // ── Success envelope ──
        SuccessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
            message: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Authentication and session management" },
      { name: "Users", description: "User management and role control (Admin only)" },
      { name: "Records", description: "Financial record CRUD operations" },
      { name: "Dashboard", description: "Aggregated analytics and insights" },
      { name: "Audit", description: "Immutable audit trail (Analyst + Admin)" },
    ],
    paths: {
      // ── AUTH ──
      "/api/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            201: { description: "User created successfully" },
            409: { description: "Email already exists" },
            400: { description: "Validation error" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login and receive JWT tokens",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            200: { description: "Login successful — returns access and refresh tokens" },
            401: { description: "Invalid credentials" },
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token using refresh token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: { refreshToken: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "New tokens issued" },
            401: { description: "Invalid or expired refresh token" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout and log the event",
          responses: {
            200: { description: "Logged out successfully" },
            401: { description: "Unauthorized" },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current authenticated user",
          responses: {
            200: { description: "Current user profile" },
            401: { description: "Unauthorized" },
          },
        },
      },
      // ── RECORDS ──
      "/api/records": {
        get: {
          tags: ["Records"],
          summary: "List financial records with filters",
          parameters: [
            { in: "query", name: "type", schema: { type: "string", enum: ["INCOME", "EXPENSE"] } },
            { in: "query", name: "category", schema: { type: "string" } },
            { in: "query", name: "startDate", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "page", schema: { type: "integer", default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", default: 20, maximum: 100 } },
          ],
          responses: { 200: { description: "Paginated list of records" } },
        },
        post: {
          tags: ["Records"],
          summary: "Create a new financial record (Admin only)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateRecordRequest" },
              },
            },
          },
          responses: {
            201: { description: "Record created" },
            403: { description: "Insufficient permissions" },
            400: { description: "Validation error" },
          },
        },
      },
      "/api/records/{id}": {
        get: {
          tags: ["Records"],
          summary: "Get a single financial record",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: {
            200: { description: "Record found" },
            404: { description: "Record not found" },
            410: { description: "Record has been soft deleted" },
          },
        },
        patch: {
          tags: ["Records"],
          summary: "Update a financial record (Admin or creator only)",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Record updated" }, 403: { description: "Forbidden" } },
        },
        delete: {
          tags: ["Records"],
          summary: "Soft delete a financial record (Admin or creator only)",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 204: { description: "Record soft deleted" }, 403: { description: "Forbidden" } },
        },
      },
      // ── DASHBOARD ──
      "/api/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Financial snapshot — income, expenses, net balance",
          parameters: [
            { in: "query", name: "startDate", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date-time" } },
          ],
          responses: { 200: { description: "Summary data" } },
        },
      },
      "/api/dashboard/trends": {
        get: {
          tags: ["Dashboard"],
          summary: "Monthly or weekly income/expense trends (Analyst+)",
          parameters: [
            { in: "query", name: "groupBy", schema: { type: "string", enum: ["monthly", "weekly"], default: "monthly" } },
            { in: "query", name: "startDate", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "endDate", schema: { type: "string", format: "date-time" } },
          ],
          responses: { 200: { description: "Trend data points" } },
        },
      },
      "/api/dashboard/categories": {
        get: {
          tags: ["Dashboard"],
          summary: "Category-wise income and expense breakdown (Analyst+)",
          responses: { 200: { description: "Category totals with percentages" } },
        },
      },
      "/api/dashboard/recent": {
        get: {
          tags: ["Dashboard"],
          summary: "Most recent financial transactions",
          parameters: [
            { in: "query", name: "limit", schema: { type: "integer", default: 10, maximum: 50 } },
          ],
          responses: { 200: { description: "Recent records" } },
        },
      },
      "/api/dashboard/cashflow": {
        get: {
          tags: ["Dashboard"],
          summary: "Cumulative cashflow over time (Analyst+)",
          responses: { 200: { description: "Daily cashflow with running balance" } },
        },
      },
      // ── AUDIT ──
      "/api/audit": {
        get: {
          tags: ["Audit"],
          summary: "Full paginated audit log (Analyst+)",
          parameters: [
            { in: "query", name: "page", schema: { type: "integer", default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", default: 20 } },
          ],
          responses: { 200: { description: "Audit log entries" } },
        },
      },
      "/api/audit/{entityId}": {
        get: {
          tags: ["Audit"],
          summary: "Audit history for a specific record",
          parameters: [{ in: "path", name: "entityId", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Audit entries for entity" } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
