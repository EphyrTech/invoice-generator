# Invoice MCP Server

A Model Context Protocol (MCP) server that exposes invoice management capabilities to AI assistants like Claude Code. Provides 6 tools for querying, creating, and managing invoices, plus a vault resource for browsing PDF files.

## Table of Contents

- [Architecture](#architecture)
- [Setup](#setup)
- [Configuration](#configuration)
- [Tools Reference](#tools-reference)
- [Resources](#resources)
- [Invoice Wizard Skill](#invoice-wizard-skill)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
mcp-server/
  src/
    index.ts              # Server entry point — registers all tools and resources
    db/
      client.ts           # Drizzle ORM database connection
    schema/
      auth-schema.ts      # User/session tables (mirrors parent project)
      invoice-schema.ts   # Invoice/client/business profile tables
    tools/
      clients.ts          # list_clients tool
      invoice-query.ts    # list_invoices + get_invoice tools
      invoice-wizard.ts   # create_invoice tool
      reporting.ts        # get_dashboard_stats tool
      wise-import.ts      # parse_wise_pdf tool
    resources/
      vault-files.ts      # vault://invoices resource
    lib/
      wise-parser.ts      # Wise PDF text parser
      wise-types.ts       # TypeScript types for Wise data
```

The server communicates over **stdio** using the MCP protocol. It connects directly to PostgreSQL via Drizzle ORM — no dependency on the Next.js dev server.

---

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15 with the invoice database running
- The parent project's database schema applied (`yarn db:push` from the project root)

### Install and Build

```bash
cd mcp-server
npm install
npm run build
```

This compiles TypeScript to `dist/`.

### Register with Claude Code

The server is configured via `.claude/mcp.json` in the project root:

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

After adding this config, restart Claude Code. The server starts automatically when Claude Code launches in the project directory.

### Verify It Works

In Claude Code, try:

```
List my clients
```

or:

```
Show my invoices
```

Claude should call the `list_clients` or `list_invoices` tools and display the results.

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `VAULT_PATH` | No | Absolute path to a folder containing PDF files (e.g., an Obsidian vault). Supports `~` for home directory. If not set, the vault resource is disabled. |

### Changing the Database

Edit `.claude/mcp.json` and update `DATABASE_URL`:

```json
"env": {
  "DATABASE_URL": "postgresql://user:password@host:5432/dbname"
}
```

### Enabling Vault Browsing

Set `VAULT_PATH` to a directory containing Wise PDF statements:

```json
"env": {
  "VAULT_PATH": "~/Documents/Invoices"
}
```

---

## Tools Reference

### 1. `list_clients`

List available clients and business profiles for invoice creation.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `includeBusinessProfiles` | boolean | `true` | Include business profiles in response |

**Example prompt:** "Show me my clients and business profiles"

**Returns:** JSON with `clients` array and optional `businessProfiles` array. Each entry includes `id`, `name`, `email`, and `country`.

---

### 2. `list_invoices`

Query invoices with flexible filters. Supports pagination.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `clientId` | string | — | Filter by client ID |
| `status` | enum | — | `"draft"` \| `"issued"` \| `"paid"` \| `"overdue"` \| `"cancelled"` |
| `dateFrom` | string | — | Start date (YYYY-MM-DD) |
| `dateTo` | string | — | End date (YYYY-MM-DD) |
| `minAmount` | number | — | Minimum total amount |
| `maxAmount` | number | — | Maximum total amount |
| `currency` | string | — | Currency code (e.g., `"EUR"`, `"USD"`) |
| `limit` | number | `20` | Max results per page |
| `offset` | number | `0` | Pagination offset |

**Example prompts:**
- "What invoices are unpaid?"
- "Show invoices from January 2026"
- "List all EUR invoices over 1000"

**Returns:** JSON with `invoices` array (id, invoiceNumber, clientName, total, currency, status, issueDate) and `totalCount` for pagination.

---

### 3. `get_invoice`

Get full invoice details including line items, business profile, and client.

**Parameters (at least one required):**

| Name | Type | Description |
|------|------|-------------|
| `id` | string | Invoice UUID |
| `invoiceNumber` | string | Invoice number (e.g., `"INV-0001"`) |

**Example prompts:**
- "Show me invoice INV-0042"
- "Get the details of invoice abc-123"

**Returns:** Full invoice object with all fields, plus nested `businessProfile`, `client`, and `items` arrays.

---

### 4. `create_invoice`

Create a new invoice with line items. Automatically calculates subtotal, tax, discount, and total.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `businessProfileId` | string | Yes | — | Business profile ID (sender) |
| `clientId` | string | Yes | — | Client ID (recipient) |
| `invoiceNumber` | string | Yes | — | Invoice number (e.g., `"INV-2026-001"`) |
| `issueDate` | string | Yes | — | Issue date (YYYY-MM-DD) |
| `dueDate` | string | Yes | — | Due date (YYYY-MM-DD) |
| `items` | array | Yes | — | Line items (min 1) — each with `description`, `quantity`, `unitPrice` |
| `taxRate` | number | No | `0` | Tax rate percentage (0-100) |
| `discountRate` | number | No | `0` | Discount rate percentage (0-100) |
| `notes` | string | No | — | Invoice notes |
| `terms` | string | No | — | Payment terms |
| `currency` | string | No | `"USD"` | Currency code |
| `status` | enum | No | `"draft"` | `"draft"` \| `"issued"` |

**Calculation logic:**
1. Subtotal = sum of (quantity x unitPrice) for all items
2. Discount = subtotal x (discountRate / 100)
3. Taxable = subtotal - discount
4. Tax = taxable x (taxRate / 100)
5. **Total = taxable + tax**

**Example prompt:** "Create an invoice for Acme Corp: 10 hours of consulting at $150/hr, 20% VAT, due in 30 days"

**Returns:** Summary with `id`, `invoiceNumber`, `total`, `currency`, `status`, `itemCount`.

---

### 5. `parse_wise_pdf`

Parse a Wise balance statement PDF and extract structured transaction data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Absolute path to the PDF file |

**Example prompts:**
- "Parse the Wise statement at ~/Documents/wise-nov-2025.pdf"
- "Import transactions from /Users/me/Downloads/statement.pdf"

**Returns:** JSON with `fileName`, `currency`, `dateRange`, `transactionCount`, and `transactions` array. Each transaction includes `date`, `description`, `amount`, `currency`, `reference`, and `type` ("incoming" or "outgoing").

**Supported format:** Wise Europe SA balance statements with the standard table layout (Description / Incoming / Outgoing / Amount columns).

---

### 6. `get_dashboard_stats`

Revenue summaries and invoice statistics for a given time period.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `period` | enum | `"month"` | `"month"` \| `"quarter"` \| `"year"` |

**Example prompts:**
- "What's my revenue this month?"
- "Show quarterly stats"
- "How much is unpaid?"

**Returns:**

| Field | Description |
|-------|-------------|
| `period` | Selected period |
| `periodStart` | Start date of the period |
| `totalRevenue` | Sum of paid invoices in period |
| `invoiceCount` | Total invoices created in period |
| `unpaidCount` | Unpaid invoices (all time, excludes cancelled) |
| `unpaidTotal` | Sum of unpaid invoices |
| `topClients` | Top 5 clients by revenue in period |

---

## Resources

### `vault://invoices`

Lists all PDF files in the configured vault directory.

**Prerequisites:** Set `VAULT_PATH` in `.claude/mcp.json`.

**Returns:** Array of objects with `name`, `path`, `size` (bytes), and `modified` (ISO timestamp).

**Usage:** Browse available PDFs, then use `parse_wise_pdf` with the returned file path:

```
1. "What PDFs are in my vault?"        → reads vault://invoices
2. "Parse the November statement"       → calls parse_wise_pdf with the path
3. "Create invoices for the incoming"   → calls create_invoice for each
```

---

## Invoice Wizard Skill

The invoice wizard skill (`.claude/skills/invoice-wizard/SKILL.md`) provides a guided conversation flow for creating invoices. It's automatically available when Claude Code loads in the project directory.

### What It Does

The wizard detects your intent and guides you through the process:

| You say | Wizard does |
|---------|-------------|
| "Create an invoice for ClientX" | Calls `list_clients`, confirms selection, collects line items, creates invoice |
| "Import from this PDF" | Calls `parse_wise_pdf`, shows transactions, lets you pick and assign clients |
| "What's unpaid?" | Calls `list_invoices` with status filter |
| "Revenue this quarter" | Calls `get_dashboard_stats` |
| "Show invoice INV-001" | Calls `get_invoice` |

### Workflow

1. **Detect intent** — Is this a new invoice, PDF import, or query?
2. **Gather context** — Fetches clients and business profiles
3. **Collect fields** — Asks for line items, dates, currency, tax one at a time
4. **Show summary** — Displays all fields and calculated total
5. **Confirm** — Waits for your approval before creating
6. **Create** — Calls `create_invoice` and reports the result

### Defaults

- Issue date: today (if not specified)
- Due date: 30 days from issue date (if not specified)
- Currency: USD (unless client has a known currency)
- Tax/discount: 0 (unless specified)

### Example Session

```
You: I need to invoice Acme Corp for last month's work

Claude: Let me check your clients and profiles.
        [calls list_clients]

        I found:
        - Business Profile: "My Company" (profile-abc)
        - Client: "Acme Corp" (client-xyz)

        What line items should I include?

You: 40 hours of development at $125/hr and 5 hours of code review at $100/hr

Claude: Here's the summary:

        Invoice: INV-2026-013
        From: My Company → To: Acme Corp
        Items:
          - Development: 40 x $125.00 = $5,000.00
          - Code review: 5 x $100.00 = $500.00
        Subtotal: $5,500.00
        Tax (0%): $0.00
        Total: $5,500.00

        Issue date: 2026-02-12
        Due date: 2026-03-14

        Should I create this invoice?

You: Yes

Claude: [calls create_invoice]
        Invoice INV-2026-013 created — $5,500.00 USD (draft)
```

---

## Development

### Building

```bash
cd mcp-server
npm run build        # Compile TypeScript to dist/
npm run dev          # Watch mode — recompiles on changes
```

### Testing the Server Manually

Send a JSON-RPC initialize request via stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' \
  | DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_db" \
  node mcp-server/dist/index.js
```

Expected response:

```json
{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"invoice","version":"1.0.0"}},"jsonrpc":"2.0","id":1}
```

### Adding a New Tool

1. Create a file in `mcp-server/src/tools/`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";

export function registerMyTools(server: McpServer) {
  server.registerTool(
    "my_tool_name",
    {
      title: "My Tool",
      description: "What this tool does",
      inputSchema: {
        param1: z.string().describe("Description of param1"),
        param2: z.number().optional().default(10).describe("Optional param"),
      },
    },
    async ({ param1, param2 }) => {
      // Implementation here
      const result = { /* ... */ };
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
```

2. Register it in `src/index.ts`:

```typescript
import { registerMyTools } from "./tools/my-tools.js";
registerMyTools(server);
```

3. Rebuild: `npm run build`

4. Restart Claude Code to pick up the new tool.

### Project Structure Notes

- **Schema duplication:** The schema files in `mcp-server/src/schema/` are copies of the parent project's schema. If the parent schema changes, these must be updated to match.
- **Wise parser duplication:** The parser in `mcp-server/src/lib/` is a copy of `lib/import/wise-parser.ts` to avoid cross-project import issues with TypeScript module resolution.
- **Hardcoded user:** All tools use `USER_ID = "user-1"`. This is suitable for single-user setups. Multi-user support would require passing the user ID through MCP context.

---

## Troubleshooting

### Server doesn't start

Check that the database is running and `DATABASE_URL` is correct:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invoice_db" \
  node mcp-server/dist/index.js
```

If you see `DATABASE_URL environment variable is required`, the env var isn't being passed.

### Tools not appearing in Claude Code

1. Verify `.claude/mcp.json` exists in the project root
2. Verify the server is built: `ls mcp-server/dist/index.js`
3. Restart Claude Code (the MCP config is read at startup)
4. Check Claude Code's MCP status (look for the invoice server in the tools list)

### "Invoice not found" errors

Ensure the database has data and the correct `USER_ID` is set. The default is `"user-1"` — this must match the user ID in your database.

### Wise PDF parsing fails

- Ensure the file path is absolute (e.g., `/Users/me/statement.pdf`, not `~/statement.pdf`)
- Only Wise Europe SA balance statements are supported
- The PDF must contain the standard table format with "Description Incoming Outgoing Amount" header

### Build errors after schema changes

If the parent project's database schema changes:

1. Update the schema files in `mcp-server/src/schema/` to match
2. Rebuild: `cd mcp-server && npm run build`

### VAULT_PATH not working

- Use an absolute path (or `~` for home directory)
- Ensure the directory exists and contains PDF files
- The `VAULT_PATH` env var must be set in `.claude/mcp.json`
