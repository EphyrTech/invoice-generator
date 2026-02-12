# Public Invoice Links + PDF Themes + QR Codes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shareable public invoice links with QR codes, 4 PDF themes, and per-invoice visibility controls (logo/status).

**Architecture:** Additive DB columns on `invoices` and `business_profiles` tables (no breaking changes). New public API endpoint + unauthenticated page route. PDF themes as separate `@react-pdf/renderer` component files with a registry. QR codes generated as base64 PNGs via `qrcode` library.

**Tech Stack:** Next.js 14, @react-pdf/renderer, nanoid (URL-friendly tokens), qrcode (QR generation), existing pg raw SQL queries via `query()` from `lib/db/db-client.ts`.

**Design doc:** `docs/plans/2026-02-11-public-links-pdf-themes-design.md`

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install nanoid and qrcode**

```bash
yarn add nanoid@3 qrcode
yarn add -D @types/qrcode
```

Note: nanoid v3 is used because v4+ is ESM-only and won't work with Next.js 14's CJS require. nanoid v3 exports a `nanoid()` function that generates URL-friendly random strings.

**Step 2: Verify installation**

```bash
node -e "const { nanoid } = require('nanoid'); console.log(nanoid(12))"
```

Expected: A 12-character random string like `V1StGXR8_Z5j`

**Step 3: Commit**

```bash
git add package.json yarn.lock .pnp.cjs .pnp.loader.mjs .yarn/
git commit -m "chore: add nanoid and qrcode dependencies"
```

---

## Task 2: Database Schema Migration

Add new columns to `invoices` and `business_profiles` tables. All columns are nullable with defaults — zero impact on existing rows.

**Files:**
- Modify: `lib/db/schema/invoice-schema.ts`

**Step 1: Add columns to invoices table in schema**

In `lib/db/schema/invoice-schema.ts`, add these columns to the `invoices` pgTable definition, after the `nextIssueDate` field:

```typescript
  publicToken: text('public_token').unique(),
  showLogoPublic: boolean('show_logo_public').default(false),
  showStatusPublic: boolean('show_status_public').default(false),
  pdfTheme: text('pdf_theme').default('clean'),
```

**Step 2: Add columns to business_profiles table in schema**

In the same file, add these columns to the `businessProfiles` pgTable definition, after the `logoUrl` field:

```typescript
  defaultShowLogo: boolean('default_show_logo').default(false),
  defaultShowStatus: boolean('default_show_status').default(false),
  defaultPdfTheme: text('default_pdf_theme').default('clean'),
```

**Step 3: Create the migration SQL manually**

Since we can't risk `db:push` on prod, create a migration file at `drizzle/0001_add_public_sharing.sql`:

```sql
-- Add public sharing columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_logo_public BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_status_public BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_theme TEXT DEFAULT 'clean';

-- Add default sharing settings to business_profiles
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_show_logo BOOLEAN DEFAULT false;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_show_status BOOLEAN DEFAULT false;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_pdf_theme TEXT DEFAULT 'clean';
```

**Step 4: Apply to local dev DB**

```bash
yarn db:push
```

Expected: Schema changes applied without errors. Existing rows unaffected.

**Step 5: Verify columns exist**

```bash
psql postgresql://postgres:postgres@localhost:5432/invoice_db -c "\d invoices" | grep -E "public_token|show_logo|show_status|pdf_theme"
```

Expected: All 4 new columns visible with correct types and defaults.

**Step 6: Commit**

```bash
git add lib/db/schema/invoice-schema.ts drizzle/0001_add_public_sharing.sql
git commit -m "feat: add schema columns for public sharing, themes, and visibility"
```

---

## Task 3: Share API Endpoints

Create endpoints to generate and revoke public tokens for invoices.

**Files:**
- Create: `app/api/invoices/[id]/share/route.ts`
- Create: `__tests__/app/api/invoices/share.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/app/api/invoices/share.test.ts`:

```typescript
import { POST, DELETE } from '@/app/api/invoices/[id]/share/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-token-12'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/invoices/[id]/share', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST - generate share token', () => {
    it('should generate a public token for an invoice', async () => {
      // Invoice exists
      mockQuery
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: null }])
        // Update returns updated row
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: 'test-token-12' }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      const response = await POST(
        {} as NextRequest,
        { params: { id: 'inv-1' } }
      )

      expect(mockQuery).toHaveBeenCalledTimes(2)
      // First call: check invoice exists
      expect(mockQuery.mock.calls[0][0]).toContain('SELECT')
      // Second call: update with token
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE')
      expect(mockQuery.mock.calls[1][1]).toContain('test-token-12')
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ publicToken: 'test-token-12' })
      )
    })

    it('should return existing token if already shared', async () => {
      mockQuery.mockResolvedValueOnce([{ id: 'inv-1', public_token: 'existing-tok' }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await POST({} as NextRequest, { params: { id: 'inv-1' } })

      // Should only query once (no update needed)
      expect(mockQuery).toHaveBeenCalledTimes(1)
      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ publicToken: 'existing-tok' })
      )
    })

    it('should return 404 if invoice not found', async () => {
      mockQuery.mockResolvedValueOnce([])

      const mockResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await POST({} as NextRequest, { params: { id: 'nonexistent' } })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    })
  })

  describe('DELETE - revoke share token', () => {
    it('should revoke the public token', async () => {
      mockQuery
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: 'some-token' }])
        .mockResolvedValueOnce([{ id: 'inv-1', public_token: null }])

      const mockResponse = { status: 200 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await DELETE({} as NextRequest, { params: { id: 'inv-1' } })

      expect(mockQuery).toHaveBeenCalledTimes(2)
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE')
      expect(mockQuery.mock.calls[1][1]).toContain(null)
    })

    it('should return 404 if invoice not found', async () => {
      mockQuery.mockResolvedValueOnce([])

      const mockResponse = { status: 404 }
      ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

      await DELETE({} as NextRequest, { params: { id: 'nonexistent' } })

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    })
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
yarn test __tests__/app/api/invoices/share.test.ts
```

Expected: FAIL — module `@/app/api/invoices/[id]/share/route` not found.

**Step 3: Implement the share route**

Create `app/api/invoices/[id]/share/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { nanoid } from 'nanoid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const invoices = await query(
      'SELECT id, public_token FROM invoices WHERE id = $1',
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    // Return existing token if already shared
    if (invoice.public_token) {
      return NextResponse.json({
        publicToken: invoice.public_token,
        publicUrl: `/i/${invoice.public_token}`,
      });
    }

    // Generate new token
    const token = nanoid(12);
    await query(
      'UPDATE invoices SET public_token = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [token, new Date(), id]
    );

    return NextResponse.json({
      publicToken: token,
      publicUrl: `/i/${token}`,
    });
  } catch (error) {
    console.error('Error sharing invoice:', error);
    return NextResponse.json(
      { error: 'Failed to share invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const invoices = await query(
      'SELECT id FROM invoices WHERE id = $1',
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await query(
      'UPDATE invoices SET public_token = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [null, new Date(), id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
yarn test __tests__/app/api/invoices/share.test.ts
```

Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add app/api/invoices/\[id\]/share/route.ts __tests__/app/api/invoices/share.test.ts
git commit -m "feat: add share/unshare API endpoints for public invoice tokens"
```

---

## Task 4: Public Invoice API Endpoint

A public (no-auth) API that returns invoice data by public token.

**Files:**
- Create: `app/api/public/invoices/[token]/route.ts`
- Create: `__tests__/app/api/public/invoices/route.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/app/api/public/invoices/route.test.ts`:

```typescript
import { GET } from '@/app/api/public/invoices/[token]/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('/api/public/invoices/[token]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return invoice data for a valid public token', async () => {
    const mockInvoice = {
      id: 'inv-1',
      invoice_number: 'INV-001',
      public_token: 'abc123token',
      business_profile_id: 'bp-1',
      client_id: 'cl-1',
      show_logo_public: true,
      show_status_public: false,
      pdf_theme: 'clean',
      status: 'issued',
      total: 1000,
    }
    const mockItems = [{ id: 'item-1', description: 'Service', amount: 1000 }]
    const mockProfile = { id: 'bp-1', name: 'My Business', logo_url: 'https://example.com/logo.png' }
    const mockClient = { id: 'cl-1', name: 'Client Corp' }

    mockQuery
      .mockResolvedValueOnce([mockInvoice])  // invoice by token
      .mockResolvedValueOnce(mockItems)       // invoice items
      .mockResolvedValueOnce([mockProfile])   // business profile
      .mockResolvedValueOnce([mockClient])    // client

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'abc123token' } })

    expect(mockQuery.mock.calls[0][1]).toContain('abc123token')
    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice_number: 'INV-001',
        items: mockItems,
        businessProfile: expect.objectContaining({ name: 'My Business' }),
        client: expect.objectContaining({ name: 'Client Corp' }),
      })
    )
  })

  it('should return 404 for invalid token', async () => {
    mockQuery.mockResolvedValueOnce([])

    const mockResponse = { status: 404 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'bad-token' } })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Invoice not found' },
      { status: 404 }
    )
  })

  it('should strip sensitive fields from response', async () => {
    const mockInvoice = {
      id: 'inv-1',
      user_id: 'user-1',
      invoice_number: 'INV-001',
      public_token: 'abc123token',
      business_profile_id: 'bp-1',
      client_id: 'cl-1',
      show_logo_public: false,
      show_status_public: false,
      pdf_theme: 'clean',
      status: 'issued',
      total: 1000,
    }

    mockQuery
      .mockResolvedValueOnce([mockInvoice])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'bp-1', name: 'Biz' }])
      .mockResolvedValueOnce([{ id: 'cl-1', name: 'Client' }])

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await GET({} as NextRequest, { params: { token: 'abc123token' } })

    const responseData = (NextResponse.json as jest.Mock).mock.calls[0][0]
    expect(responseData.user_id).toBeUndefined()
  })
})
```

**Step 2: Run tests to verify they fail**

```bash
yarn test __tests__/app/api/public/invoices/route.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement the public invoice endpoint**

Create `app/api/public/invoices/[token]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    // Find invoice by public token
    const invoices = await query(
      'SELECT * FROM invoices WHERE public_token = $1',
      [token]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    // Fetch items, business profile, and client
    const items = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
      [invoice.id]
    );

    const profiles = await query(
      'SELECT * FROM business_profiles WHERE id = $1',
      [invoice.business_profile_id]
    );

    const clients = await query(
      'SELECT * FROM clients WHERE id = $1',
      [invoice.client_id]
    );

    // Strip sensitive fields
    const { user_id, ...safeInvoice } = invoice;

    return NextResponse.json({
      ...safeInvoice,
      items,
      businessProfile: profiles[0] || null,
      client: clients[0] || null,
    });
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
yarn test __tests__/app/api/public/invoices/route.test.ts
```

Expected: All 3 tests PASS.

**Step 5: Commit**

```bash
git add app/api/public/invoices/\[token\]/route.ts __tests__/app/api/public/invoices/route.test.ts
git commit -m "feat: add public API endpoint to fetch invoice by share token"
```

---

## Task 5: Middleware — Allow Public Routes

Add `/i/*` and `/api/public/*` to the public route allowlist.

**Files:**
- Modify: `middleware.ts`

**Step 1: Update middleware authorized callback**

In `middleware.ts`, add two new conditions to the `authorized` callback, before the `return !!token` line:

```typescript
if (req.nextUrl.pathname.startsWith('/i/')) {
  return true;
}
if (req.nextUrl.pathname.startsWith('/api/public/')) {
  return true;
}
```

The full `authorized` callback should now be:

```typescript
authorized: ({ token, req }) => {
  if (req.nextUrl.pathname.startsWith('/login') ||
      req.nextUrl.pathname.startsWith('/api/auth') ||
      req.nextUrl.pathname === '/api/health') {
    return true;
  }
  if (req.nextUrl.pathname.startsWith('/i/')) {
    return true;
  }
  if (req.nextUrl.pathname.startsWith('/api/public/')) {
    return true;
  }
  return !!token;
},
```

**Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: allow /i/* and /api/public/* routes without auth"
```

---

## Task 6: Public Invoice Page

The unauthenticated page at `/i/[token]` that displays the invoice and offers PDF download.

**Files:**
- Create: `app/i/[token]/page.tsx`
- Create: `app/i/[token]/layout.tsx`

**Step 1: Create the layout with noindex meta**

Create `app/i/[token]/layout.tsx`:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PublicInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Create the public invoice page**

Create `app/i/[token]/page.tsx`:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { InvoiceDownloadLink } from '@/lib/pdf/invoice-generator';
import type { InvoiceData } from '@/lib/pdf/invoice-generator';

type PublicInvoiceData = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  show_logo_public: boolean;
  show_status_public: boolean;
  pdf_theme: string;
  items: {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_rate: number;
    tax_amount: number;
  }[];
  businessProfile: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tax_id: string | null;
    logo_url: string | null;
  } | null;
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    tax_id: string | null;
  } | null;
};

function toPdfData(data: PublicInvoiceData): InvoiceData {
  return {
    invoiceNumber: data.invoice_number,
    issueDate: data.issue_date,
    dueDate: data.due_date || undefined,
    status: data.show_status_public ? data.status : undefined,
    currency: data.currency,
    subtotal: data.subtotal,
    taxRate: data.tax_rate,
    taxAmount: data.tax_amount,
    discountRate: data.discount_rate,
    discountAmount: data.discount_amount,
    total: data.total,
    notes: data.notes || undefined,
    terms: data.terms || undefined,
    businessProfile: {
      name: data.businessProfile?.name || '',
      email: data.businessProfile?.email || '',
      phone: data.businessProfile?.phone || '',
      address: data.businessProfile?.address || '',
      city: data.businessProfile?.city || '',
      state: data.businessProfile?.state || '',
      postalCode: data.businessProfile?.postal_code || '',
      country: data.businessProfile?.country || '',
      taxId: data.businessProfile?.tax_id || '',
      logoUrl: data.show_logo_public ? (data.businessProfile?.logo_url || '') : '',
    },
    client: {
      name: data.client?.name || '',
      email: data.client?.email || '',
      phone: data.client?.phone || '',
      address: data.client?.address || '',
      city: data.client?.city || '',
      state: data.client?.state || '',
      postalCode: data.client?.postal_code || '',
      country: data.client?.country || '',
      taxId: data.client?.tax_id || '',
    },
    items: data.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      amount: item.amount,
      taxRate: item.tax_rate,
      taxAmount: item.tax_amount,
    })),
  };
}

export default function PublicInvoicePage({ params }: { params: { token: string } }) {
  const [invoice, setInvoice] = useState<PublicInvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const response = await fetch(`/api/public/invoices/${params.token}`);
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setInvoice(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [params.token]);

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-16">
        <p className="text-gray-500">Loading invoice...</p>
      </div>
    );
  }

  if (notFound || !invoice) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center py-16">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          This invoice is no longer available
        </h1>
        <p className="text-gray-500">
          The link may have expired or been revoked.
        </p>
      </div>
    );
  }

  const pdfData = toPdfData(invoice);

  const formatAddress = (entity: { address?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null }) => {
    const parts = [entity.address, entity.city, entity.state, entity.postal_code, entity.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Invoice {invoice.invoice_number}
          </h1>
          <p className="text-sm text-gray-500">
            From {invoice.businessProfile?.name}
          </p>
        </div>
        <InvoiceDownloadLink data={pdfData}>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded">
            Download PDF
          </button>
        </InvoiceDownloadLink>
      </div>

      <div className="p-6">
        {/* Business + Client info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">From</h2>
            <p className="font-semibold text-gray-900">{invoice.businessProfile?.name}</p>
            <p className="text-sm text-gray-600">{formatAddress(invoice.businessProfile || {})}</p>
            {invoice.businessProfile?.email && <p className="text-sm text-gray-600">{invoice.businessProfile.email}</p>}
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 mb-2">Bill To</h2>
            <p className="font-semibold text-gray-900">{invoice.client?.name}</p>
            <p className="text-sm text-gray-600">{formatAddress(invoice.client || {})}</p>
            {invoice.client?.email && <p className="text-sm text-gray-600">{invoice.client.email}</p>}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div>
            <p className="text-xs text-gray-500">Issue Date</p>
            <p className="text-sm font-medium">{invoice.issue_date}</p>
          </div>
          {invoice.due_date && (
            <div>
              <p className="text-xs text-gray-500">Due Date</p>
              <p className="text-sm font-medium">{invoice.due_date}</p>
            </div>
          )}
          {invoice.show_status_public && (
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="text-sm font-medium capitalize">{invoice.status}</p>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="overflow-x-auto mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.currency} {item.unit_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">{invoice.currency} {item.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.discount_rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount ({invoice.discount_rate}%)</span>
                <span>-{invoice.currency} {invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                <span>{invoice.currency} {invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
              <span>Total</span>
              <span>{invoice.currency} {invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes/Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {invoice.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
                <p className="text-sm text-gray-600">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Terms</h3>
                <p className="text-sm text-gray-600">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Verify the page builds**

```bash
yarn build
```

Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add app/i/
git commit -m "feat: add public invoice page at /i/[token] with PDF download"
```

---

## Task 7: Extract Current PDF as Clean Theme + Theme Registry

Refactor the current `InvoicePDF` component into a theme under `lib/pdf/themes/clean.tsx`, then create a theme registry.

**Files:**
- Create: `lib/pdf/themes/clean.tsx`
- Create: `lib/pdf/themes/index.ts`
- Modify: `lib/pdf/invoice-generator.tsx`

**Step 1: Create clean theme**

Create `lib/pdf/themes/clean.tsx` — copy the `InvoicePDF` component (the `styles` + component, lines 59-341) from `lib/pdf/invoice-generator.tsx` into this file. The component should be named `CleanTheme` and accept the same `{ data: InvoiceData }` props. Add `export default CleanTheme`.

Import `InvoiceData` from `../invoice-generator`.

**Step 2: Create theme registry**

Create `lib/pdf/themes/index.ts`:

```typescript
import React from 'react';
import type { InvoiceData } from '../invoice-generator';
import CleanTheme from './clean';

export type ThemeComponent = React.FC<{ data: InvoiceData }>;

const themes: Record<string, ThemeComponent> = {
  clean: CleanTheme,
};

export function getTheme(name: string): ThemeComponent {
  return themes[name] || themes.clean;
}

export function getThemeNames(): string[] {
  return Object.keys(themes);
}
```

**Step 3: Update invoice-generator.tsx to use the registry**

In `lib/pdf/invoice-generator.tsx`:

1. Keep the `InvoiceData` type export and the `InvoiceDownloadLink` component.
2. Replace the inline `InvoicePDF` component and `generateInvoicePDF` function with:

```typescript
import { getTheme } from './themes';

// Create PDF Document component using theme
const InvoicePDF: React.FC<{ data: InvoiceData; theme?: string }> = ({ data, theme = 'clean' }) => {
  const ThemeComponent = getTheme(theme);
  return <ThemeComponent data={data} />;
};

export const generateInvoicePDF = (data: InvoiceData, theme?: string) => {
  return <InvoicePDF data={data} theme={theme} />;
};
```

3. Update `InvoiceDownloadLink` to accept an optional `theme` prop:

```typescript
export const InvoiceDownloadLink: React.FC<{
  data: InvoiceData;
  fileName?: string;
  theme?: string;
  children: React.ReactNode;
}> = ({ data, fileName, theme, children }) => {
  const defaultFileName = `Invoice-${data.invoiceNumber}.pdf`;
  return (
    <PDFDownloadLink
      document={<InvoicePDF data={data} theme={theme} />}
      fileName={fileName || defaultFileName}
      style={{ textDecoration: 'none' }}
    >
      {children}
    </PDFDownloadLink>
  );
};
```

**Step 4: Run existing PDF tests to verify no regression**

```bash
yarn test __tests__/lib/pdf/
```

Expected: All existing tests PASS (the default theme is "clean" which is the same component).

**Step 5: Commit**

```bash
git add lib/pdf/themes/ lib/pdf/invoice-generator.tsx
git commit -m "refactor: extract PDF into theme system with clean as default"
```

---

## Task 8: Create Classic, Bold, and Compact Themes

Create the remaining 3 PDF themes. Each is a `@react-pdf/renderer` component that receives `{ data: InvoiceData }`.

**Files:**
- Create: `lib/pdf/themes/classic.tsx`
- Create: `lib/pdf/themes/bold.tsx`
- Create: `lib/pdf/themes/compact.tsx`
- Modify: `lib/pdf/themes/index.ts`

**Step 1: Create classic theme**

Create `lib/pdf/themes/classic.tsx` — based on clean theme but with:
- Serif font (Times-Roman) for headers
- Heavier table borders (2px solid black for header, 1px for rows)
- Larger invoice title (28pt)
- More traditional layout spacing

**Step 2: Create bold theme**

Create `lib/pdf/themes/bold.tsx` — based on clean theme but with:
- Strong color accent (#1a56db — blue) for header background and table header
- White text on colored backgrounds
- Thick dividers between sections (3px)
- Bolder fonts throughout

**Step 3: Create compact theme**

Create `lib/pdf/themes/compact.tsx` — based on clean theme but with:
- Smaller fonts (8pt body, 10pt headers)
- Tighter padding (20px page, 4px row padding)
- Narrower margins between sections
- Designed to fit more items per page

**Step 4: Register all themes in index.ts**

Update `lib/pdf/themes/index.ts`:

```typescript
import CleanTheme from './clean';
import ClassicTheme from './classic';
import BoldTheme from './bold';
import CompactTheme from './compact';

const themes: Record<string, ThemeComponent> = {
  clean: CleanTheme,
  classic: ClassicTheme,
  bold: BoldTheme,
  compact: CompactTheme,
};
```

**Step 5: Write theme tests**

Create `__tests__/lib/pdf/themes.test.tsx`:

```typescript
import React from 'react';
import { getTheme, getThemeNames } from '@/lib/pdf/themes';

// @react-pdf/renderer is mocked globally in jest.setup.js

describe('PDF Themes', () => {
  it('should return all 4 theme names', () => {
    expect(getThemeNames()).toEqual(['clean', 'classic', 'bold', 'compact']);
  });

  it('should return a component for each theme', () => {
    for (const name of getThemeNames()) {
      const Theme = getTheme(name);
      expect(Theme).toBeDefined();
      expect(typeof Theme).toBe('function');
    }
  });

  it('should fall back to clean for unknown theme name', () => {
    const fallback = getTheme('nonexistent');
    const clean = getTheme('clean');
    expect(fallback).toBe(clean);
  });
});
```

**Step 6: Run tests**

```bash
yarn test __tests__/lib/pdf/
```

Expected: All tests PASS.

**Step 7: Commit**

```bash
git add lib/pdf/themes/ __tests__/lib/pdf/themes.test.tsx
git commit -m "feat: add classic, bold, and compact PDF themes"
```

---

## Task 9: QR Code Utility

Create a utility to generate QR code as a base64 data URL for embedding in PDFs.

**Files:**
- Create: `lib/pdf/qr-code.ts`
- Create: `__tests__/lib/pdf/qr-code.test.ts`

**Step 1: Write the failing test**

Create `__tests__/lib/pdf/qr-code.test.ts`:

```typescript
import { generateQrDataUrl } from '@/lib/pdf/qr-code';

describe('QR Code Generation', () => {
  it('should generate a base64 PNG data URL', async () => {
    const url = 'https://example.com/i/abc123';
    const dataUrl = await generateQrDataUrl(url);

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(dataUrl.length).toBeGreaterThan(100);
  });

  it('should generate different QR codes for different URLs', async () => {
    const url1 = await generateQrDataUrl('https://example.com/i/abc');
    const url2 = await generateQrDataUrl('https://example.com/i/xyz');

    expect(url1).not.toEqual(url2);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
yarn test __tests__/lib/pdf/qr-code.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement QR code utility**

Create `lib/pdf/qr-code.ts`:

```typescript
import QRCode from 'qrcode';

export async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 160,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
```

**Step 4: Run test to verify it passes**

```bash
yarn test __tests__/lib/pdf/qr-code.test.ts
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add lib/pdf/qr-code.ts __tests__/lib/pdf/qr-code.test.ts
git commit -m "feat: add QR code generation utility"
```

---

## Task 10: Add QR Code to PDF Themes

Add a QR code footer section to all 4 theme components. The QR code renders when a `qrCodeDataUrl` prop is provided.

**Files:**
- Modify: `lib/pdf/invoice-generator.tsx` — add `qrCodeDataUrl?: string` to `InvoiceData`
- Modify: `lib/pdf/themes/clean.tsx`
- Modify: `lib/pdf/themes/classic.tsx`
- Modify: `lib/pdf/themes/bold.tsx`
- Modify: `lib/pdf/themes/compact.tsx`

**Step 1: Add `qrCodeDataUrl` to InvoiceData type**

In `lib/pdf/invoice-generator.tsx`, add to the `InvoiceData` type:

```typescript
  // QR code for public link
  qrCodeDataUrl?: string;
```

**Step 2: Add QR code section to each theme**

In each theme file, after the footer section (notes/terms), add this block before the closing `</Page>`:

```tsx
{/* QR Code */}
{data.qrCodeDataUrl && (
  <View style={{ position: 'absolute', bottom: 30, right: 30, alignItems: 'center' }}>
    <Image src={data.qrCodeDataUrl} style={{ width: 80, height: 80 }} />
    <Text style={{ fontSize: 7, color: '#999999', marginTop: 2 }}>Scan to view online</Text>
  </View>
)}
```

**Step 3: Run PDF tests to verify no regression**

```bash
yarn test __tests__/lib/pdf/
```

Expected: All tests PASS. Existing tests pass `undefined` for `qrCodeDataUrl` so the QR section doesn't render.

**Step 4: Commit**

```bash
git add lib/pdf/invoice-generator.tsx lib/pdf/themes/
git commit -m "feat: add QR code rendering to all PDF themes"
```

---

## Task 11: Business Profile Defaults + Invoice Creation Cascade

Update the invoice creation API to copy defaults from the business profile.

**Files:**
- Modify: `app/api/invoices/route.ts`
- Modify: `app/api/business-profiles/[id]/route.ts`
- Modify: `app/api/business-profiles/route.ts`

**Step 1: Update invoice POST to copy defaults from business profile**

In `app/api/invoices/route.ts` POST handler, after validating required fields but before the INSERT, add:

```typescript
// Fetch business profile defaults
const profiles = await query(
  'SELECT default_show_logo, default_show_status, default_pdf_theme FROM business_profiles WHERE id = $1',
  [body.businessProfileId]
);
const profileDefaults = profiles[0] || {};
const showLogoPublic = body.showLogoPublic ?? profileDefaults.default_show_logo ?? false;
const showStatusPublic = body.showStatusPublic ?? profileDefaults.default_show_status ?? false;
const pdfTheme = body.pdfTheme ?? profileDefaults.default_pdf_theme ?? 'clean';
```

Then add `show_logo_public`, `show_status_public`, and `pdf_theme` to the INSERT query with the values above.

**Step 2: Update business profile PUT to handle new fields**

In `app/api/business-profiles/[id]/route.ts` PUT handler, add the 3 new fields to the UPDATE query:

```sql
default_show_logo = $N, default_show_status = $N, default_pdf_theme = $N
```

**Step 3: Update business profile POST similarly**

In `app/api/business-profiles/route.ts` POST handler, add the 3 new fields to the INSERT.

**Step 4: Run existing tests**

```bash
yarn test
```

Expected: All tests PASS. Existing tests don't send these fields, so they default to `false`/`'clean'`.

**Step 5: Commit**

```bash
git add app/api/invoices/route.ts app/api/business-profiles/
git commit -m "feat: cascade business profile defaults to new invoices"
```

---

## Task 12: Invoice Edit Page — Share, Theme, Visibility Controls

Add share button, theme picker, and visibility toggles to the invoice edit page.

**Files:**
- Modify: `app/dashboard/invoices/edit/[id]/page.tsx`

**Step 1: Add new state and form fields**

Add to the component state:

```typescript
const [publicToken, setPublicToken] = useState<string | null>(null);
const [sharing, setSharing] = useState(false);
```

Add to `formData`:

```typescript
showLogoPublic: false,
showStatusPublic: false,
pdfTheme: 'clean',
```

**Step 2: Load sharing state from invoice data**

In the `fetchData` effect, after setting formData, add:

```typescript
setPublicToken(invoiceData.public_token || null);
setFormData(prev => ({
  ...prev,
  showLogoPublic: invoiceData.show_logo_public || false,
  showStatusPublic: invoiceData.show_status_public || false,
  pdfTheme: invoiceData.pdf_theme || 'clean',
}));
```

**Step 3: Add share/unshare handlers**

```typescript
const handleShare = async () => {
  setSharing(true);
  try {
    const response = await fetch(`/api/invoices/${params.id}/share`, { method: 'POST' });
    const data = await response.json();
    setPublicToken(data.publicToken);
  } catch (err) {
    console.error('Error sharing invoice:', err);
  } finally {
    setSharing(false);
  }
};

const handleUnshare = async () => {
  setSharing(true);
  try {
    await fetch(`/api/invoices/${params.id}/share`, { method: 'DELETE' });
    setPublicToken(null);
  } catch (err) {
    console.error('Error unsharing invoice:', err);
  } finally {
    setSharing(false);
  }
};
```

**Step 4: Add UI sections to the form**

After the "Additional Information" section (notes/terms), before the "Save as Template" section, add:

```tsx
{/* Public Sharing & Display */}
<div className="border-t border-gray-200 pt-6">
  <h2 className="text-lg font-medium text-gray-900 mb-3">Public Sharing</h2>

  {/* Share button */}
  <div className="mb-4">
    {publicToken ? (
      <div className="flex items-center space-x-3">
        <input
          type="text"
          readOnly
          value={`${window.location.origin}/i/${publicToken}`}
          className="flex-1 bg-gray-50 border border-gray-300 rounded-md py-2 px-3 text-sm text-gray-600"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/i/${publicToken}`)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded text-sm"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={handleUnshare}
          disabled={sharing}
          className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded text-sm"
        >
          {sharing ? 'Revoking...' : 'Revoke'}
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded text-sm"
      >
        {sharing ? 'Creating link...' : 'Create Public Link'}
      </button>
    )}
  </div>

  {/* Theme picker */}
  <div className="mb-4">
    <label htmlFor="pdfTheme" className="block text-sm font-medium text-gray-700 mb-1">
      PDF Theme
    </label>
    <select
      id="pdfTheme"
      name="pdfTheme"
      value={formData.pdfTheme}
      onChange={handleChange}
      className="block w-full sm:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    >
      <option value="clean">Clean (Default)</option>
      <option value="classic">Classic</option>
      <option value="bold">Bold</option>
      <option value="compact">Compact</option>
    </select>
  </div>

  {/* Visibility toggles */}
  <div className="space-y-2">
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={formData.showLogoPublic}
        onChange={(e) => setFormData(prev => ({ ...prev, showLogoPublic: e.target.checked }))}
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
      <span className="ml-2 text-sm text-gray-700">Show logo on public link & PDF</span>
    </label>
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={formData.showStatusPublic}
        onChange={(e) => setFormData(prev => ({ ...prev, showStatusPublic: e.target.checked }))}
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
      <span className="ml-2 text-sm text-gray-700">Show status on public link & PDF</span>
    </label>
  </div>
</div>
```

**Step 5: Include new fields in PUT request body**

Update the `handleSubmit` fetch body to include the new fields:

```typescript
body: JSON.stringify({
  ...formData,
  items: items.filter(item => item.description.trim() !== ''),
  saveAsTemplate,
  action
}),
```

Since `formData` now contains `showLogoPublic`, `showStatusPublic`, and `pdfTheme`, they'll be sent automatically.

**Step 6: Update the invoice PUT API to handle new fields**

In `app/api/invoices/[id]/route.ts` PUT handler, add the 3 new columns to the UPDATE query:

```sql
show_logo_public = $N, show_status_public = $N, pdf_theme = $N
```

**Step 7: Verify the page works**

```bash
yarn dev
```

Navigate to an invoice edit page and verify the new section renders.

**Step 8: Commit**

```bash
git add app/dashboard/invoices/edit/\[id\]/page.tsx app/api/invoices/\[id\]/route.ts
git commit -m "feat: add share, theme, and visibility controls to invoice edit page"
```

---

## Task 13: Invoice View Page — Share Button + Theme-Aware PDF

Update the view page to show the share link and generate themed PDFs with QR codes.

**Files:**
- Modify: `app/dashboard/invoices/view/[id]/page.tsx`

**Step 1: Add sharing state and QR generation**

Add imports:

```typescript
import { generateQrDataUrl } from '@/lib/pdf/qr-code';
```

Add state:

```typescript
const [publicToken, setPublicToken] = useState<string | null>(null);
const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
const [sharing, setSharing] = useState(false);
```

**Step 2: Auto-create token and generate QR on load**

In the `fetchInvoice` effect, after setting the invoice data, add:

```typescript
// Auto-create public token if missing (for QR code on PDF)
let token = invoiceData.public_token;
if (!token) {
  const shareResponse = await fetch(`/api/invoices/${params.id}/share`, { method: 'POST' });
  if (shareResponse.ok) {
    const shareData = await shareResponse.json();
    token = shareData.publicToken;
  }
}
if (token) {
  setPublicToken(token);
  const publicUrl = `${window.location.origin}/i/${token}`;
  const qr = await generateQrDataUrl(publicUrl);
  setQrDataUrl(qr);
}
```

**Step 3: Pass QR and theme to PDF data**

Update the `pdfInvoiceData` object to include:

```typescript
qrCodeDataUrl: qrDataUrl || undefined,
```

Update the `InvoiceDownloadLink` to pass theme:

```tsx
<InvoiceDownloadLink data={pdfInvoiceData} theme={invoice.pdf_theme || 'clean'}>
```

**Step 4: Add share link display to the header buttons area**

After the existing Download PDF button, add:

```tsx
{publicToken && (
  <button
    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/i/${publicToken}`)}
    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded"
  >
    Copy Public Link
  </button>
)}
```

**Step 5: Add `pdf_theme` to the Invoice type**

Add to the `Invoice` type at the top of the file:

```typescript
public_token: string | null;
show_logo_public: boolean;
show_status_public: boolean;
pdf_theme: string;
```

**Step 6: Verify the view page works**

```bash
yarn dev
```

Navigate to an invoice view page, download the PDF, and verify QR code appears in the footer.

**Step 7: Commit**

```bash
git add app/dashboard/invoices/view/\[id\]/page.tsx
git commit -m "feat: add QR code and theme support to invoice view page PDF download"
```

---

## Task 14: Business Profile Defaults UI

Add default public sharing settings to the business profile edit page.

**Files:**
- Modify: `app/dashboard/business-profiles/edit/[id]/page.tsx`
- Modify: `app/dashboard/business-profiles/new/page.tsx`

**Step 1: Add default fields to formData state**

In the edit page, add to `formData`:

```typescript
defaultShowLogo: false,
defaultShowStatus: false,
defaultPdfTheme: 'clean',
```

**Step 2: Populate from fetched data**

In the fetchBusinessProfile effect, add:

```typescript
defaultShowLogo: data.default_show_logo || false,
defaultShowStatus: data.default_show_status || false,
defaultPdfTheme: data.default_pdf_theme || 'clean',
```

**Step 3: Add UI section before the submit button**

```tsx
{/* Public Invoice Defaults */}
<div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
  <h3 className="text-sm font-medium text-gray-900 mb-3">Public Invoice Defaults</h3>
  <p className="text-xs text-gray-500 mb-3">These defaults apply to new invoices created with this profile.</p>

  <div className="space-y-2 mb-4">
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={formData.defaultShowLogo}
        onChange={(e) => setFormData(prev => ({ ...prev, defaultShowLogo: e.target.checked }))}
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
      <span className="ml-2 text-sm text-gray-700">Show logo on public invoices by default</span>
    </label>
    <label className="flex items-center">
      <input
        type="checkbox"
        checked={formData.defaultShowStatus}
        onChange={(e) => setFormData(prev => ({ ...prev, defaultShowStatus: e.target.checked }))}
        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
      />
      <span className="ml-2 text-sm text-gray-700">Show status on public invoices by default</span>
    </label>
  </div>

  <div>
    <label htmlFor="defaultPdfTheme" className="block text-sm font-medium text-gray-700 mb-1">
      Default PDF Theme
    </label>
    <select
      id="defaultPdfTheme"
      value={formData.defaultPdfTheme}
      onChange={(e) => setFormData(prev => ({ ...prev, defaultPdfTheme: e.target.value }))}
      className="block w-full sm:w-1/3 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    >
      <option value="clean">Clean (Default)</option>
      <option value="classic">Classic</option>
      <option value="bold">Bold</option>
      <option value="compact">Compact</option>
    </select>
  </div>
</div>
```

**Step 4: Include new fields in the PUT request body**

The fields are already in `formData`, so they'll be sent automatically if the PUT endpoint reads them (done in Task 11).

**Step 5: Repeat for the new page**

Apply the same changes to `app/dashboard/business-profiles/new/page.tsx`.

**Step 6: Commit**

```bash
git add app/dashboard/business-profiles/
git commit -m "feat: add public invoice defaults UI to business profile pages"
```

---

## Task 15: Rate Limiting for Public Routes

Add basic in-memory rate limiting to the public API endpoint.

**Files:**
- Create: `lib/utils/rate-limit.ts`
- Modify: `app/api/public/invoices/[token]/route.ts`

**Step 1: Create rate limiter**

Create `lib/utils/rate-limit.ts`:

```typescript
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, maxRequests = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
```

**Step 2: Apply to public invoice API**

In `app/api/public/invoices/[token]/route.ts`, at the top of the GET handler:

```typescript
import { rateLimit } from '@/lib/utils/rate-limit';

// Inside GET handler, before the query:
const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
if (!rateLimit(ip)) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  );
}
```

**Step 3: Commit**

```bash
git add lib/utils/rate-limit.ts app/api/public/invoices/\[token\]/route.ts
git commit -m "feat: add rate limiting to public invoice API"
```

---

## Task 16: Final Integration Test + Cleanup

Run full test suite, verify build, and clean up.

**Step 1: Run all tests**

```bash
yarn test
```

Expected: All tests PASS.

**Step 2: Run linting**

```bash
yarn lint
```

Expected: No errors.

**Step 3: Run type check**

```bash
yarn type-check
```

Expected: No errors.

**Step 4: Run production build**

```bash
yarn build
```

Expected: Build succeeds.

**Step 5: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup for public links + PDF themes feature"
```
