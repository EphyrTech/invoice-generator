# Public Invoice Links + PDF Themes + QR Codes

## Problem

Competitor invoice tools are bloated, produce ugly PDFs, and lock users in. We need shareable, beautiful invoices that work without recipient accounts.

## Target Users

Freelancers, solopreneurs, and small businesses (2-10 people).

## Design

### Public Invoice Links

Each invoice can be shared via a unique URL (`/i/[token]`). Recipients view and download the invoice without logging in.

**Schema change on `invoices`:**

- `public_token` — text, unique, nullable. When null, invoice is private. When populated, a 12-char nanoid forming the public URL.

**API endpoints:**

- `POST /api/invoices/[id]/share` — generates a `publicToken`, returns the public URL
- `DELETE /api/invoices/[id]/share` — sets `publicToken` to null (revokes access)

**Public route:**

- `GET /i/[token]` — unauthenticated page rendering invoice data with a "Download PDF" button
- Mobile-friendly, styled with the invoice's selected theme
- Added to middleware public route allowlist alongside `/login` and `/api/health`

### QR Code on PDFs

Every generated PDF includes a QR code in the footer (bottom-right, ~80x80px) linking to `/i/[token]`.

- Generated using the `qrcode` library (pure JS, base64 PNG data URL)
- Caption below: "Scan to view online"
- If the invoice has no `publicToken`, one is auto-created on PDF generation (so every PDF always has a working QR code)
- User can revoke the token later if desired

### Visibility Controls

Two aspects of the public page/PDF can be toggled: logo and status badge.

**Schema change on `invoices`:**

- `show_logo_public` — boolean, default false
- `show_status_public` — boolean, default false

**Schema change on `business_profiles`:**

- `default_show_logo` — boolean, default false
- `default_show_status` — boolean, default false

**Cascade behavior:**

1. Business profile holds global defaults
2. On invoice creation, defaults are copied into invoice fields
3. User can override per-invoice
4. Changing profile defaults only affects new invoices

**UI:** Checkboxes on business profile edit page ("Public invoice defaults") and on invoice edit page ("Public display" section).

### PDF Themes

4 built-in themes, each a separate `@react-pdf/renderer` component:

| Theme | Description |
|-------|------------|
| **Clean** (default) | Minimal, lots of whitespace, thin borders, sans-serif |
| **Classic** | Traditional, serif headers, heavier table lines |
| **Bold** | Strong color accents from business profile, thick dividers |
| **Compact** | Dense layout, smaller fonts, fits more items per page |

**Schema change on `invoices`:**

- `pdf_theme` — text, default `'clean'`

**Schema change on `business_profiles`:**

- `default_pdf_theme` — text, default `'clean'`

Same copy-on-create cascade as visibility flags.

**File structure:**

```
lib/pdf/themes/
  clean.tsx
  classic.tsx
  bold.tsx
  compact.tsx
  index.ts       # theme registry / lookup
```

All theme components receive identical props: invoice data, business profile, client, items, visibility flags.

### Error Handling & Edge Cases

- **Bad/revoked token:** `/i/[token]` shows "This invoice is no longer available" — no details leaked
- **Deleted invoice:** Token gone via cascade, same "no longer available" page
- **Drafts:** Still get QR code and token on PDF generation (user can revoke)
- **Rate limiting:** 30 req/min/IP on public routes, in-memory (no Redis)
- **SEO:** `<meta name="robots" content="noindex, nofollow">` on all public invoice pages
- **OG tags:** Minimal — "Invoice #INV-001 from Business Name" (no amounts or client info)

## Out of Scope

- Recipient accounts / login portal
- Payment integration
- Email sending from the app
- Data export (future feature)
- Dashboard analytics (future feature)
