# MCP Server + Invoice Plugin Design

**Date:** 2026-02-12
**Status:** Approved

## Overview

Add an MCP server to the invoice-pdf project that exposes invoice management tools to Claude Code. Pair it with an invoice wizard skill for guided invoice creation. Eventually bundle as a Claude Code plugin.

## Decisions

- **Runtime:** TypeScript + Node (same stack as app)
- **Location:** Inside invoice-pdf repo (monorepo, shares DB schema + Wise parser)
- **Data access:** Direct DB via Drizzle ORM (no HTTP dependency on dev server)
- **Vault path:** Configurable via `VAULT_PATH` env var

## Directory Structure

```
invoice-pdf/
├── mcp-server/
│   ├── src/
│   │   ├── index.ts                 # MCP server entry point
│   │   ├── tools/
│   │   │   ├── invoice-wizard.ts    # create_invoice tool
│   │   │   ├── wise-import.ts       # parse_wise_pdf tool
│   │   │   ├── invoice-query.ts     # list_invoices, get_invoice tools
│   │   │   ├── reporting.ts         # get_dashboard_stats tool
│   │   │   └── clients.ts          # list_clients tool
│   │   ├── resources/
│   │   │   └── vault-files.ts       # Obsidian vault file browser
│   │   └── db/
│   │       └── client.ts            # Drizzle client (imports parent schema)
│   ├── package.json
│   └── tsconfig.json
├── .claude/
│   ├── mcp.json                     # MCP server config for Claude Code
│   └── skills/
│       └── invoice-wizard/
│           └── SKILL.md             # Guided invoice creation skill
```

## MCP Tools (6)

### parse_wise_pdf

Parse a Wise balance statement PDF and extract transactions.

```
Input:  { filePath: string }
Output: {
  transactions: [{
    date: string,
    description: string,
    amount: number,
    currency: string,
    reference: string
  }],
  fileName: string,
  transactionCount: number
}
```

Reuses existing `lib/import/wise-parser.ts`. Reads file from disk via `pdf-parse`.

### create_invoice

Create a new invoice with line items. Calculates totals server-side.

```
Input: {
  businessProfileId: string,   # required
  clientId: string,            # required
  invoiceNumber: string,       # required
  issueDate: string,           # required (YYYY-MM-DD)
  dueDate: string,             # required (YYYY-MM-DD)
  items: [{                    # required, min 1
    description: string,
    quantity: number,
    unitPrice: number
  }],
  taxRate?: number,            # default 0
  discountRate?: number,       # default 0
  notes?: string,
  terms?: string,
  currency?: string,           # default "USD"
  status?: string              # default "draft"
}
Output: {
  id: string,
  invoiceNumber: string,
  total: number,
  currency: string,
  status: string,
  itemCount: number
}
```

### list_invoices

Query invoices with flexible filters.

```
Input: {
  clientId?: string,
  status?: string,             # draft | issued | paid | overdue | cancelled
  dateFrom?: string,           # YYYY-MM-DD
  dateTo?: string,
  minAmount?: number,
  maxAmount?: number,
  currency?: string,
  limit?: number,              # default 20
  offset?: number              # default 0
}
Output: {
  invoices: [{
    id: string,
    invoiceNumber: string,
    clientName: string,
    total: number,
    currency: string,
    status: string,
    issueDate: string
  }],
  totalCount: number
}
```

### get_invoice

Get full invoice details by ID or invoice number.

```
Input:  { id?: string, invoiceNumber?: string }  # one required
Output: {
  id, invoiceNumber, issueDate, dueDate, status,
  subtotal, taxRate, taxAmount, discountRate, discountAmount, total, currency,
  notes, terms,
  businessProfile: { name, email, address, ... },
  client: { name, email, address, ... },
  items: [{ description, quantity, unitPrice, amount, taxRate, taxAmount }]
}
```

### get_dashboard_stats

Revenue summaries and invoice statistics.

```
Input:  { period?: "month" | "quarter" | "year" }  # default "month"
Output: {
  totalRevenue: number,
  invoiceCount: number,
  unpaidCount: number,
  unpaidTotal: number,
  topClients: [{ name: string, total: number }],
  currency: string
}
```

### list_clients

List available clients and business profiles for invoice creation.

```
Input:  { includeBusinessProfiles?: boolean }  # default true
Output: {
  clients: [{ id, name, email, country }],
  businessProfiles: [{ id, name, email, country }]
}
```

## MCP Resources

### vault://invoices/*

Browse PDF files in the configured Obsidian vault folder.

```
URI pattern: vault://invoices/{filename}
Returns: File listing or file metadata
```

Requires `VAULT_PATH` env var to be set.

## Invoice Wizard Skill

Located at `.claude/skills/invoice-wizard/SKILL.md`. Model-invoked — Claude auto-detects intent.

### Workflow

1. Detect intent: new invoice from scratch, from PDF, or from natural language description
2. Call `list_clients` to show available clients + business profiles
3. If PDF provided → call `parse_wise_pdf`, show transactions, confirm selection
4. Collect/validate missing fields one at a time:
   - Business profile (who is sending)
   - Client (who is receiving)
   - Line items (what is being billed)
   - Dates (issue date, due date)
   - Currency, tax rate, discount
5. Show invoice summary before creation
6. Call `create_invoice` with confirmed data
7. Report: invoice number, total, status

### Trigger Phrases

- "Invoice Client X for..."
- "Create an invoice from this Wise PDF"
- "Import the statement from ~/path/to/file.pdf"
- "Bill Acme for 10 hours of consulting"
- "What's unpaid?" (routes to query tools)

## Configuration

### .claude/mcp.json

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

`VAULT_PATH` left empty by default — user sets per machine.

## Dependencies

New packages for `mcp-server/package.json`:

- `@modelcontextprotocol/sdk` — MCP server SDK
- `pdf-parse` — already used by parent project (can share)
- `drizzle-orm` + `@neondatabase/serverless` or `pg` — DB access
- `zod` — input validation (already used by parent)

## Implementation Order

1. **Scaffold MCP server** — package.json, tsconfig, entry point, DB client
2. **list_clients tool** — simplest, validates DB connection works
3. **list_invoices + get_invoice tools** — query layer
4. **create_invoice tool** — write path with validation + total calculation
5. **parse_wise_pdf tool** — file system access + existing parser reuse
6. **get_dashboard_stats tool** — aggregation queries
7. **vault resources** — file browsing for Obsidian vault
8. **Invoice wizard skill** — SKILL.md prompt
9. **MCP config** — .claude/mcp.json wiring
10. **Test end-to-end** — run with Claude Code, verify all tools work

## Future: Plugin Bundle

When stable, convert to a Claude Code plugin:

```
invoice-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── invoice-wizard/
│       └── SKILL.md
├── .mcp.json
└── README.md
```

This is a later step — get the MCP server + skill working first.
