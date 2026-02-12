# MCP Server + Invoice Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP server exposing 6 invoice management tools + a vault resource, plus an invoice wizard skill, all wired into Claude Code via `.claude/mcp.json`.

**Architecture:** TypeScript MCP server inside `mcp-server/` subdirectory. Uses stdio transport. Imports parent project's Drizzle schema and Wise parser directly. Separate `package.json` with ESM modules, compiled to `dist/`.

**Tech Stack:** `@modelcontextprotocol/sdk`, `drizzle-orm`, `pg`, `pdf-parse`, `zod`, TypeScript 5.3, Node 18+

---

### Task 1: Scaffold MCP server package

**Files:**
- Create: `mcp-server/package.json`
- Create: `mcp-server/tsconfig.json`
- Create: `mcp-server/src/index.ts`
- Create: `mcp-server/src/db/client.ts`

**Step 1: Create `mcp-server/package.json`**

```json
{
  "name": "invoice-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "invoice-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "drizzle-orm": "^0.29.3",
    "pg": "^8.11.3",
    "pdf-parse": "^1.1.1",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.5",
    "@types/pg": "^8.10.9",
    "@types/pdf-parse": "^1.1.4",
    "@types/uuid": "^9.0.8",
    "typescript": "^5.3.3"
  }
}
```

**Step 2: Create `mcp-server/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@parent/*": ["../lib/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Note: The `@parent/*` path alias won't work with plain `tsc` for runtime — we'll use relative imports like `../../lib/` instead. The paths are here for IDE support only.

**Step 3: Create `mcp-server/src/db/client.ts`**

This creates a Drizzle DB client for the MCP server, importing schema from the parent project.

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../../../lib/db/schema/invoice-schema.js";
import * as authSchema from "../../../lib/db/schema/auth-schema.js";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, {
  schema: { ...schema, ...authSchema },
});

export { schema, authSchema };
```

Important: The parent schema uses `drizzle-orm/pg-core` which is compatible with `drizzle-orm/node-postgres`. The parent uses `postgres` (postgres.js) driver but our MCP server uses `pg` (node-postgres) — both work with the same Drizzle schema definitions.

**Step 4: Create `mcp-server/src/index.ts`**

Minimal server entry point — just boots up with no tools yet.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "invoice",
  version: "1.0.0",
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Invoice MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

**Step 5: Install dependencies and build**

Run: `cd mcp-server && npm install && npm run build`
Expected: Compiles to `mcp-server/dist/` with no errors.

**Step 6: Smoke test — verify the server starts**

Run: `echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | node mcp-server/dist/index.js`
Expected: JSON response with server capabilities (may hang waiting for more input — that's fine, Ctrl+C).

**Step 7: Commit**

```bash
git add mcp-server/package.json mcp-server/tsconfig.json mcp-server/src/index.ts mcp-server/src/db/client.ts
git commit -m "feat: scaffold MCP server with DB client and stdio transport"
```

---

### Task 2: list_clients tool

**Files:**
- Create: `mcp-server/src/tools/clients.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/tools/clients.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";

const USER_ID = "user-1";

export function registerClientTools(server: McpServer) {
  server.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description:
        "List available clients and business profiles for invoice creation. Returns names, emails, and IDs.",
      inputSchema: {
        includeBusinessProfiles: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include business profiles in response (default: true)"),
      },
    },
    async ({ includeBusinessProfiles }) => {
      const clients = await db
        .select({
          id: schema.clients.id,
          name: schema.clients.name,
          email: schema.clients.email,
          country: schema.clients.country,
        })
        .from(schema.clients)
        .where(eq(schema.clients.userId, USER_ID));

      const result: Record<string, unknown> = { clients };

      if (includeBusinessProfiles) {
        const profiles = await db
          .select({
            id: schema.businessProfiles.id,
            name: schema.businessProfiles.name,
            email: schema.businessProfiles.email,
            country: schema.businessProfiles.country,
          })
          .from(schema.businessProfiles)
          .where(eq(schema.businessProfiles.userId, USER_ID));

        result.businessProfiles = profiles;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
```

**Step 2: Wire into `mcp-server/src/index.ts`**

Add import and call before `main()`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerClientTools } from "./tools/clients.js";

const server = new McpServer({
  name: "invoice",
  version: "1.0.0",
});

registerClientTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Invoice MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/tools/clients.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add list_clients tool"
```

---

### Task 3: list_invoices and get_invoice tools

**Files:**
- Create: `mcp-server/src/tools/invoice-query.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/tools/invoice-query.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, and, gte, lte, sql, type SQL } from "drizzle-orm";

const USER_ID = "user-1";

export function registerInvoiceQueryTools(server: McpServer) {
  server.registerTool(
    "list_invoices",
    {
      title: "List Invoices",
      description:
        "Query invoices with flexible filters. Returns summary list with totals.",
      inputSchema: {
        clientId: z.string().optional().describe("Filter by client ID"),
        status: z
          .enum(["draft", "issued", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Filter by invoice status"),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter invoices from this date (YYYY-MM-DD)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter invoices up to this date (YYYY-MM-DD)"),
        minAmount: z.number().optional().describe("Minimum total amount"),
        maxAmount: z.number().optional().describe("Maximum total amount"),
        currency: z.string().optional().describe("Filter by currency code"),
        limit: z.number().optional().default(20).describe("Max results (default 20)"),
        offset: z.number().optional().default(0).describe("Offset for pagination"),
      },
    },
    async (params) => {
      const conditions: SQL[] = [eq(schema.invoices.userId, USER_ID)];

      if (params.clientId) conditions.push(eq(schema.invoices.clientId, params.clientId));
      if (params.status) conditions.push(eq(schema.invoices.status, params.status));
      if (params.dateFrom) conditions.push(gte(schema.invoices.issueDate, params.dateFrom));
      if (params.dateTo) conditions.push(lte(schema.invoices.issueDate, params.dateTo));
      if (params.minAmount !== undefined) conditions.push(gte(schema.invoices.total, params.minAmount));
      if (params.maxAmount !== undefined) conditions.push(lte(schema.invoices.total, params.maxAmount));
      if (params.currency) conditions.push(eq(schema.invoices.currency, params.currency));

      const where = and(...conditions);

      const invoices = await db
        .select({
          id: schema.invoices.id,
          invoiceNumber: schema.invoices.invoiceNumber,
          clientName: schema.clients.name,
          total: schema.invoices.total,
          currency: schema.invoices.currency,
          status: schema.invoices.status,
          issueDate: schema.invoices.issueDate,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(where)
        .limit(params.limit)
        .offset(params.offset)
        .orderBy(schema.invoices.issueDate);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(where);

      const result = {
        invoices,
        totalCount: Number(countResult[0]?.count ?? 0),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get Invoice",
      description:
        "Get full invoice details by ID or invoice number. Includes items, business profile, and client.",
      inputSchema: {
        id: z.string().optional().describe("Invoice ID"),
        invoiceNumber: z.string().optional().describe("Invoice number (e.g. INV-0001)"),
      },
    },
    async (params) => {
      if (!params.id && !params.invoiceNumber) {
        return {
          content: [{ type: "text" as const, text: "Error: Provide either id or invoiceNumber" }],
          isError: true,
        };
      }

      const condition = params.id
        ? and(eq(schema.invoices.id, params.id), eq(schema.invoices.userId, USER_ID))
        : and(eq(schema.invoices.invoiceNumber, params.invoiceNumber!), eq(schema.invoices.userId, USER_ID));

      const invoice = await db.query.invoices.findFirst({
        where: condition,
        with: {
          items: true,
          businessProfile: true,
          client: true,
        },
      });

      if (!invoice) {
        return {
          content: [{ type: "text" as const, text: "Invoice not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(invoice, null, 2) }],
      };
    }
  );
}
```

**Step 2: Wire into `mcp-server/src/index.ts`**

Add import and registration call:

```typescript
import { registerInvoiceQueryTools } from "./tools/invoice-query.js";
// ... after registerClientTools(server);
registerInvoiceQueryTools(server);
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/tools/invoice-query.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add list_invoices and get_invoice tools"
```

---

### Task 4: create_invoice tool

**Files:**
- Create: `mcp-server/src/tools/invoice-wizard.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/tools/invoice-wizard.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { v4 as uuidv4 } from "uuid";

const USER_ID = "user-1";

export function registerInvoiceWizardTools(server: McpServer) {
  server.registerTool(
    "create_invoice",
    {
      title: "Create Invoice",
      description:
        "Create a new invoice with line items. Calculates subtotal, tax, discount, and total automatically. Returns the created invoice summary.",
      inputSchema: {
        businessProfileId: z.string().describe("Business profile ID (sender)"),
        clientId: z.string().describe("Client ID (recipient)"),
        invoiceNumber: z.string().describe("Invoice number (e.g. INV-2026-001)"),
        issueDate: z.string().describe("Issue date in YYYY-MM-DD format"),
        dueDate: z.string().describe("Due date in YYYY-MM-DD format"),
        items: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().positive().describe("Quantity"),
              unitPrice: z.number().min(0).describe("Unit price"),
            })
          )
          .min(1)
          .describe("Invoice line items (at least one)"),
        taxRate: z.number().min(0).max(100).optional().default(0).describe("Tax rate percentage"),
        discountRate: z.number().min(0).max(100).optional().default(0).describe("Discount rate percentage"),
        notes: z.string().optional().describe("Invoice notes"),
        terms: z.string().optional().describe("Payment terms"),
        currency: z.string().optional().default("USD").describe("Currency code (default: USD)"),
        status: z
          .enum(["draft", "issued"])
          .optional()
          .default("draft")
          .describe("Invoice status (default: draft)"),
      },
    },
    async (params) => {
      const invoiceId = uuidv4();

      // Calculate totals
      const subtotal = params.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discountAmount = subtotal * (params.discountRate / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (params.taxRate / 100);
      const total = taxableAmount + taxAmount;

      // Insert invoice
      await db.insert(schema.invoices).values({
        id: invoiceId,
        userId: USER_ID,
        businessProfileId: params.businessProfileId,
        clientId: params.clientId,
        invoiceNumber: params.invoiceNumber,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        status: params.status,
        subtotal,
        taxRate: params.taxRate,
        taxAmount,
        discountRate: params.discountRate,
        discountAmount,
        total,
        notes: params.notes ?? null,
        terms: params.terms ?? null,
        currency: params.currency,
      });

      // Insert items
      const itemValues = params.items.map((item) => {
        const amount = item.quantity * item.unitPrice;
        const itemTaxAmount = amount * (params.taxRate / 100);
        return {
          id: uuidv4(),
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount,
          taxRate: params.taxRate,
          taxAmount: itemTaxAmount,
        };
      });

      await db.insert(schema.invoiceItems).values(itemValues);

      const result = {
        id: invoiceId,
        invoiceNumber: params.invoiceNumber,
        total: Math.round(total * 100) / 100,
        currency: params.currency,
        status: params.status,
        itemCount: params.items.length,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
```

**Step 2: Wire into `mcp-server/src/index.ts`**

Add import and registration call:

```typescript
import { registerInvoiceWizardTools } from "./tools/invoice-wizard.js";
// ... after other registrations
registerInvoiceWizardTools(server);
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/tools/invoice-wizard.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add create_invoice tool with total calculation"
```

---

### Task 5: parse_wise_pdf tool

**Files:**
- Create: `mcp-server/src/tools/wise-import.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/tools/wise-import.ts`**

This tool reads a PDF file from disk and reuses the existing Wise parser.

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

// Import the existing Wise parser from the parent project
// Note: This file uses relative imports so it should work when compiled
import { parseWiseText } from "../../../lib/import/wise-parser.js";

export function registerWiseImportTools(server: McpServer) {
  server.registerTool(
    "parse_wise_pdf",
    {
      title: "Parse Wise PDF",
      description:
        "Parse a Wise balance statement PDF file and extract transactions. Provide the absolute file path to the PDF. Returns structured transaction data with dates, descriptions, amounts, currency, and references.",
      inputSchema: {
        filePath: z
          .string()
          .describe("Absolute path to the Wise PDF statement file"),
      },
    },
    async ({ filePath }) => {
      try {
        const buffer = await readFile(filePath);

        // Dynamic import pdf-parse (CommonJS module)
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);

        const result = parseWiseText(pdfData.text);

        const output = {
          fileName: basename(filePath),
          currency: result.currency,
          dateRange: result.dateRange,
          transactionCount: result.transactions.length,
          transactions: result.transactions.map((tx) => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            reference: tx.reference,
            type: tx.incoming ? "incoming" : "outgoing",
          })),
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error parsing PDF: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
```

Note: The parent `wise-parser.ts` uses `@/lib/import/wise-types` import. When the MCP server compiles separately, this import won't resolve. We need to handle this — see Step 2.

**Step 2: Handle the parent import compatibility**

The parent's `wise-parser.ts` imports from `@/lib/import/wise-types` using the Next.js path alias. Since our MCP tsconfig uses `Node16` module resolution, we can't resolve `@/*`.

**Solution:** Copy just the parser function logic into the MCP server, or create a thin wrapper. The simplest approach: create `mcp-server/src/wise-parser.ts` that re-exports from a local copy of the parsing logic.

Actually, the cleaner approach: The `wise-parser.ts` only imports types from `wise-types.ts`. We can use `tsx` to run the server in dev, or pre-compile the parent files.

**Simplest approach:** Copy the parser and types into the MCP server directory as `mcp-server/src/lib/wise-parser.ts` and `mcp-server/src/lib/wise-types.ts`. This duplicates ~200 lines but avoids all cross-project import issues.

Create `mcp-server/src/lib/wise-types.ts`:
```typescript
export interface WiseTransaction {
  description: string;
  date: string;
  incoming: number | null;
  outgoing: number | null;
  amount: number;
  reference: string;
  currency: string;
}

export interface WiseParseResult {
  currency: string;
  dateRange: { from: string; to: string };
  transactions: WiseTransaction[];
}
```

Create `mcp-server/src/lib/wise-parser.ts`:
Copy the entire contents of `lib/import/wise-parser.ts`, changing the import to:
```typescript
import type { WiseTransaction, WiseParseResult } from "./wise-types.js";
```

Then update `wise-import.ts` import:
```typescript
import { parseWiseText } from "../lib/wise-parser.js";
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/tools/wise-import.ts mcp-server/src/lib/wise-parser.ts mcp-server/src/lib/wise-types.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add parse_wise_pdf tool with Wise parser"
```

---

### Task 6: get_dashboard_stats tool

**Files:**
- Create: `mcp-server/src/tools/reporting.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/tools/reporting.ts`**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, and, gte, sql, ne } from "drizzle-orm";

const USER_ID = "user-1";

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split("T")[0];
    }
    case "year":
      return `${now.getFullYear()}-01-01`;
    case "month":
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
}

export function registerReportingTools(server: McpServer) {
  server.registerTool(
    "get_dashboard_stats",
    {
      title: "Dashboard Stats",
      description:
        "Get revenue summaries and invoice statistics for a given period. Shows total revenue, invoice count, unpaid totals, and top clients.",
      inputSchema: {
        period: z
          .enum(["month", "quarter", "year"])
          .optional()
          .default("month")
          .describe("Time period for stats (default: month)"),
      },
    },
    async ({ period }) => {
      const periodStart = getPeriodStart(period);
      const userCondition = eq(schema.invoices.userId, USER_ID);

      // Total revenue (paid invoices in period)
      const revenueResult = await db
        .select({ total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)` })
        .from(schema.invoices)
        .where(
          and(
            userCondition,
            eq(schema.invoices.status, "paid"),
            gte(schema.invoices.issueDate, periodStart)
          )
        );

      // Invoice count in period
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(and(userCondition, gte(schema.invoices.issueDate, periodStart)));

      // Unpaid invoices (all time, not just period)
      const unpaidResult = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)`,
        })
        .from(schema.invoices)
        .where(
          and(
            userCondition,
            ne(schema.invoices.status, "paid"),
            ne(schema.invoices.status, "cancelled")
          )
        );

      // Top clients by revenue in period
      const topClients = await db
        .select({
          name: schema.clients.name,
          total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)`,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(userCondition, gte(schema.invoices.issueDate, periodStart)))
        .groupBy(schema.clients.name)
        .orderBy(sql`sum(${schema.invoices.total}) desc`)
        .limit(5);

      const result = {
        period,
        periodStart,
        totalRevenue: Number(revenueResult[0]?.total ?? 0),
        invoiceCount: Number(countResult[0]?.count ?? 0),
        unpaidCount: Number(unpaidResult[0]?.count ?? 0),
        unpaidTotal: Number(unpaidResult[0]?.total ?? 0),
        topClients: topClients.map((c) => ({
          name: c.name,
          total: Number(c.total),
        })),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
```

**Step 2: Wire into `mcp-server/src/index.ts`**

```typescript
import { registerReportingTools } from "./tools/reporting.js";
// ... after other registrations
registerReportingTools(server);
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/tools/reporting.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add get_dashboard_stats tool"
```

---

### Task 7: Vault file resource

**Files:**
- Create: `mcp-server/src/resources/vault-files.ts`
- Modify: `mcp-server/src/index.ts`

**Step 1: Create `mcp-server/src/resources/vault-files.ts`**

```typescript
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const VAULT_PATH = process.env.VAULT_PATH || "";

export function registerVaultResources(server: McpServer) {
  if (!VAULT_PATH) {
    console.error("VAULT_PATH not set — vault resources disabled");
    return;
  }

  // List all PDFs in the vault directory
  server.registerResource(
    "vault-pdf-list",
    "vault://invoices",
    {
      title: "Invoice PDFs in Vault",
      description: "Lists all PDF files in the configured Obsidian vault invoices folder",
      mimeType: "application/json",
    },
    async () => {
      try {
        const expandedPath = VAULT_PATH.replace(/^~/, process.env.HOME || "");
        const entries = await readdir(expandedPath);
        const pdfs = [];

        for (const entry of entries) {
          if (extname(entry).toLowerCase() === ".pdf") {
            const fullPath = join(expandedPath, entry);
            const stats = await stat(fullPath);
            pdfs.push({
              name: entry,
              path: fullPath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          }
        }

        return {
          contents: [
            {
              uri: "vault://invoices",
              text: JSON.stringify(pdfs, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri: "vault://invoices",
              text: JSON.stringify({ error: message }),
              mimeType: "application/json",
            },
          ],
        };
      }
    }
  );
}
```

**Step 2: Wire into `mcp-server/src/index.ts`**

```typescript
import { registerVaultResources } from "./resources/vault-files.js";
// ... after tool registrations
registerVaultResources(server);
```

**Step 3: Build and verify**

Run: `cd mcp-server && npm run build`
Expected: No errors.

**Step 4: Commit**

```bash
git add mcp-server/src/resources/vault-files.ts mcp-server/src/index.ts
git commit -m "feat(mcp): add vault PDF file listing resource"
```

---

### Task 8: Invoice wizard skill

**Files:**
- Create: `.claude/skills/invoice-wizard/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: invoice-wizard
description: Guided invoice creation from natural language, files, or Wise PDFs. Use when the user wants to create an invoice, import from a PDF, describes billable work, or asks about unpaid invoices.
---

# Invoice Wizard

You help users create invoices through natural conversation. You have access to the invoice MCP tools.

## Workflow

1. **Detect intent** — Is the user:
   - Creating an invoice from scratch?
   - Importing from a Wise PDF?
   - Describing work to bill?
   - Querying existing invoices?

2. **Gather context** — Call `list_clients` to see available clients and business profiles. Present them as options.

3. **If a PDF path is mentioned** — Call `parse_wise_pdf` with the path. Show the parsed transactions and ask which ones to invoice.

4. **Collect required fields** one at a time (don't overwhelm):
   - Business profile (who is sending the invoice)
   - Client (who is receiving)
   - Line items (description, quantity, unit price)
   - Invoice number
   - Issue date and due date
   - Currency (default: USD)
   - Tax rate and discount (default: 0)

5. **Show a summary** before creating — display all fields and calculated total. Ask for confirmation.

6. **Create the invoice** — Call `create_invoice` with the confirmed data.

7. **Report back** — Show the invoice number, total, and status.

## For queries

- "What's unpaid?" → Use `list_invoices` with status filter
- "Show me invoices for Client X" → Use `list_invoices` with client filter
- "Revenue this month" → Use `get_dashboard_stats`
- "Show invoice INV-001" → Use `get_invoice`

## Rules

- Always confirm before creating an invoice
- Default to today's date for issue date if not specified
- Default to 30 days from issue date for due date if not specified
- Use the client's currency if known, otherwise ask
- Round all amounts to 2 decimal places
```

**Step 2: Commit**

```bash
git add .claude/skills/invoice-wizard/SKILL.md
git commit -m "feat: add invoice wizard skill for guided invoice creation"
```

---

### Task 9: MCP config + final wiring

**Files:**
- Create: `.claude/mcp.json`
- Modify: `mcp-server/src/index.ts` (final version with all imports)

**Step 1: Create `.claude/mcp.json`**

```json
{
  "mcpServers": {
    "invoice": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/invoice_db",
        "VAULT_PATH": ""
      }
    }
  }
}
```

**Step 2: Verify final `mcp-server/src/index.ts`**

Ensure all tool and resource registrations are present:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerClientTools } from "./tools/clients.js";
import { registerInvoiceQueryTools } from "./tools/invoice-query.js";
import { registerInvoiceWizardTools } from "./tools/invoice-wizard.js";
import { registerWiseImportTools } from "./tools/wise-import.js";
import { registerReportingTools } from "./tools/reporting.js";
import { registerVaultResources } from "./resources/vault-files.js";

const server = new McpServer({
  name: "invoice",
  version: "1.0.0",
});

// Register all tools
registerClientTools(server);
registerInvoiceQueryTools(server);
registerInvoiceWizardTools(server);
registerWiseImportTools(server);
registerReportingTools(server);

// Register resources
registerVaultResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Invoice MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
```

**Step 3: Full rebuild and verify**

Run: `cd mcp-server && npm run build`
Expected: Clean compilation, `dist/` directory populated.

**Step 4: Add .gitignore for mcp-server build artifacts**

Create `mcp-server/.gitignore`:
```
node_modules/
dist/
```

**Step 5: Commit**

```bash
git add .claude/mcp.json mcp-server/src/index.ts mcp-server/.gitignore
git commit -m "feat: wire MCP config and finalize server entry point"
```

---

### Task 10: End-to-end verification

**Step 1: Full clean build**

Run: `cd mcp-server && rm -rf dist node_modules && npm install && npm run build`
Expected: Clean install and compilation.

**Step 2: Test server starts and responds to initialization**

Run:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_db" node mcp-server/dist/index.js
```
Expected: JSON response containing `"name":"invoice"` and tool capabilities.

**Step 3: Verify tools are listed**

After initialization, send tools/list request:
```bash
printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}\n{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_db" node mcp-server/dist/index.js
```
Expected: Response listing 6 tools: `list_clients`, `list_invoices`, `get_invoice`, `create_invoice`, `parse_wise_pdf`, `get_dashboard_stats`.

**Step 4: Test with Claude Code**

Restart Claude Code in the project directory. Verify:
- MCP server starts (check with `/mcp` or equivalent)
- Tools appear in the tool list
- Try: "List my clients" → should call `list_clients`
- Try: "Show my invoices" → should call `list_invoices`

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete MCP server with 6 tools, vault resource, and invoice wizard skill"
```
