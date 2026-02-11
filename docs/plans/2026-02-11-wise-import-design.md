# Wise PDF Import — Design Document

## Overview

Import transactions from Wise balance statement PDFs and convert selected lines into invoices. Each transaction line becomes one invoice with one line item. Users select which transactions to import, assign a business profile and client per line, and generate all invoices at once.

## User Flow

New page at `/dashboard/invoices/import`, accessible via an "Import from Wise" button on the invoices list page.

Single-page flow with three zones:

1. **Upload zone** (top) — Drag-and-drop or file picker for a Wise PDF. Parsing happens server-side. Table populates on success.
2. **Transaction table** (middle) — All parsed lines with columns: checkbox, date, description, amount (green incoming / red outgoing), business profile dropdown, client dropdown. Select All / Deselect All toggle.
3. **Action bar** (bottom) — Selected count + "Generate Invoices" button. Disabled until every checked row has both dropdowns assigned.

## PDF Parsing

**Library:** `pdf-parse` (server-side)

**Parser:** `lib/import/wise-parser.ts` — extracts text, splits into transaction blocks using the consistent Wise format:
- Header → currency, date range
- Each transaction → description, date, incoming/outgoing amount, reference

**Output type:**

```ts
interface WiseTransaction {
  description: string;      // "Card transaction of 29.43 USD issued by Backblaze Inc"
  date: string;             // "2025-11-27"
  incoming: number | null;
  outgoing: number | null;
  amount: number;           // absolute value
  reference: string;        // "CARD-3166196743"
  currency: string;         // "EUR"
}

interface WiseParseResult {
  currency: string;
  dateRange: { from: string; to: string };
  transactions: WiseTransaction[];
}
```

## API Design

### `POST /api/import/wise/parse`

- Accepts: `multipart/form-data` with PDF file
- Validates: file is PDF, size < 5MB
- Returns: `WiseParseResult`
- No database interaction

### `POST /api/import/wise/generate`

- Accepts JSON:
  ```json
  {
    "transactions": [
      {
        "description": "...",
        "date": "2025-11-27",
        "amount": 25.51,
        "currency": "EUR",
        "reference": "CARD-3166196743",
        "businessProfileId": "...",
        "clientId": "..."
      }
    ]
  }
  ```
- Validates with Zod, checks IDs exist in DB
- Creates all invoices in a single DB transaction (all-or-nothing)
- Auto-generates sequential invoice numbers
- Returns: `{ created: [{ id, invoiceNumber }] }`

### Data Mapping

| Wise field | Invoice field |
|---|---|
| transaction date | `issueDate` |
| description | `invoiceItems[0].description` |
| absolute amount | `invoiceItems[0].amount`, `invoice.subtotal`, `invoice.total` |
| currency | `invoice.currency` |
| reference | `invoice.notes` (for duplicate detection) |
| — | `invoice.status` = "draft" |
| — | `invoiceItems[0].quantity` = 1 |
| — | `invoiceItems[0].unitPrice` = amount |

## Frontend Components

```
components/import/PdfUploadZone.tsx   # Drag-and-drop file upload
components/import/TransactionTable.tsx # Table of parsed transactions
components/import/TransactionRow.tsx   # Single row: checkbox + data + dropdowns
components/import/ImportActionBar.tsx  # Sticky bottom: count + generate button
```

Page component at `app/dashboard/invoices/import/page.tsx` manages all state with `useState`:
- Parsed transactions
- Selection state (checked/unchecked per row)
- Assignment state (businessProfileId + clientId per row)
- Business profiles and clients lists (fetched on mount)

## Error Handling

- **Non-PDF file:** client-side rejection before upload
- **PDF > 5MB:** rejected with size message
- **Unrecognizable PDF:** API returns 422 — "Could not parse as a Wise balance statement"
- **Zero transactions:** "No transactions found in this statement"
- **Generation failure:** single DB transaction — all or nothing, user can retry
- **Duplicate detection:** checks invoice `notes` for existing Wise references, warns but doesn't block

## Edge Cases

- Dropdown selections preserved when unchecking a row
- Long descriptions truncated in UI, stored in full on the invoice
- Amounts always stored as positive values regardless of incoming/outgoing
- Multi-currency: parser reads currency from header, fails gracefully on unrecognized format

## File Structure

**New files:**
```
lib/import/wise-parser.ts
lib/import/wise-types.ts
app/api/import/wise/parse/route.ts
app/api/import/wise/generate/route.ts
app/dashboard/invoices/import/page.tsx
components/import/PdfUploadZone.tsx
components/import/TransactionTable.tsx
components/import/TransactionRow.tsx
components/import/ImportActionBar.tsx
```

**Modified files:**
```
app/dashboard/invoices/page.tsx   # Add "Import from Wise" button
package.json                      # Add pdf-parse dependency
```

**New dependency:** `pdf-parse`, `@types/pdf-parse`

**No database schema changes.**

## Out of Scope

- CSV/Excel import
- Auto-matching descriptions to existing clients
- Recurring import scheduling
- Other bank statement formats
- Editing parsed data (description/amount) before generation
