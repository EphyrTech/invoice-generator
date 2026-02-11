# Wise PDF Import — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Import Wise balance statement PDFs, let the user select transactions, assign business profiles and clients, and bulk-generate invoices.

**Architecture:** Server-side PDF parsing via `pdf-parse`, two API endpoints (parse + generate), single-page React UI with upload zone, transaction table with inline dropdowns, and a generate button. No schema changes.

**Tech Stack:** pdf-parse, Zod, Next.js API routes (raw SQL via `query()`), React client components, Tailwind CSS.

**Design doc:** `docs/plans/2026-02-11-wise-import-design.md`

---

### Task 1: Install pdf-parse dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the dependency**

Run: `yarn add pdf-parse`

**Step 2: Verify installation**

Run: `yarn info pdf-parse version`
Expected: version number prints without error.

**Step 3: Commit**

```bash
git add package.json yarn.lock .pnp.cjs .yarn
git commit -m "chore: add pdf-parse dependency for Wise import"
```

---

### Task 2: Types and Zod schemas

**Files:**
- Create: `lib/import/wise-types.ts`
- Test: `__tests__/lib/import/wise-types.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/lib/import/wise-types.test.ts
import { generateTransactionSchema, WiseTransaction, WiseParseResult } from '@/lib/import/wise-types'

describe('wise-types', () => {
  describe('generateTransactionSchema', () => {
    it('should validate a correct transaction', () => {
      const valid = {
        description: 'Card transaction of 29.43 USD issued by Backblaze Inc',
        date: '2025-11-27',
        amount: 25.51,
        currency: 'EUR',
        reference: 'CARD-3166196743',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
      }
      const result = generateTransactionSchema.safeParse(valid)
      expect(result.success).toBe(true)
    })

    it('should reject missing businessProfileId', () => {
      const invalid = {
        description: 'Test',
        date: '2025-11-27',
        amount: 25.51,
        currency: 'EUR',
        reference: 'CARD-123',
        clientId: 'client-1',
      }
      const result = generateTransactionSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject negative amount', () => {
      const invalid = {
        description: 'Test',
        date: '2025-11-27',
        amount: -10,
        currency: 'EUR',
        reference: 'CARD-123',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
      }
      const result = generateTransactionSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })

    it('should reject empty description', () => {
      const invalid = {
        description: '',
        date: '2025-11-27',
        amount: 25.51,
        currency: 'EUR',
        reference: 'CARD-123',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
      }
      const result = generateTransactionSchema.safeParse(invalid)
      expect(result.success).toBe(false)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `yarn test __tests__/lib/import/wise-types.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
// lib/import/wise-types.ts
import { z } from 'zod'

export interface WiseTransaction {
  description: string
  date: string          // ISO format: YYYY-MM-DD
  incoming: number | null
  outgoing: number | null
  amount: number        // absolute value
  reference: string
  currency: string
}

export interface WiseParseResult {
  currency: string
  dateRange: { from: string; to: string }
  transactions: WiseTransaction[]
}

export const generateTransactionSchema = z.object({
  description: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  reference: z.string().min(1),
  businessProfileId: z.string().min(1),
  clientId: z.string().min(1),
})

export const generateRequestSchema = z.object({
  transactions: z.array(generateTransactionSchema).min(1),
})

export type GenerateTransaction = z.infer<typeof generateTransactionSchema>
export type GenerateRequest = z.infer<typeof generateRequestSchema>
```

**Step 4: Run test to verify it passes**

Run: `yarn test __tests__/lib/import/wise-types.test.ts`
Expected: PASS — all 4 tests green.

**Step 5: Commit**

```bash
git add lib/import/wise-types.ts __tests__/lib/import/wise-types.test.ts
git commit -m "feat: add Wise import types and Zod schemas"
```

---

### Task 3: Wise PDF parser

**Files:**
- Create: `lib/import/wise-parser.ts`
- Test: `__tests__/lib/import/wise-parser.test.ts`

This is the most complex task. The parser reads raw text output from `pdf-parse` and extracts structured transaction data.

**Wise PDF text format (from real PDF):**

Each transaction block in the extracted text looks like:
```
[Description — possibly multi-line]
[DD Month YYYY] [details...] Transaction: [REFERENCE]
[incoming_or_outgoing_amount] [running_balance]
```

Key observations from the real PDF:
- Header contains: `EUR statement` and `1 November 2025 [GMT] - 30 November 2025 [GMT]`
- Table header: `Description Incoming Outgoing Amount`
- Footer: `Wise is the trading name of Wise Europe SA`
- Outgoing amounts are negative (e.g., `-25.51`)
- Incoming amounts are positive (e.g., `6,788.00`)
- Running balance follows the amount on the same line
- Descriptions can wrap across lines
- All dates follow `DD Month YYYY` format
- References follow `Transaction:` keyword

**Step 1: Write the failing test**

```ts
// __tests__/lib/import/wise-parser.test.ts
import { parseWiseText, parseWiseDate, parseWiseDateRange } from '@/lib/import/wise-parser'

// Subset of real Wise PDF text for testing
const sampleWiseText = `Wise Europe SA
Rue du Trône 100, 3rd floor
Brussels
1050
Belgium
EUR statement
1 November 2025 [GMT] - 30 November 2025 [GMT]
Generated on: 11 December 2025
Account Holder
EphyrTech OÜ
Masina tn 22
Kesklinna district, Tallinn city, Harju county
10113
Estonia
IBAN
BE61 9051 1531 4617
Swift/BIC
TRWIBEB1XXX
EUR on 30 November 2025 [GMT] 697.15 EUR
Description Incoming Outgoing Amount
Card transaction of 29.43 USD issued by Backblaze Inc BACKBLAZE.COM
27 November 2025 Card ending in 9924 Bohdan-Volodymyr Lesiv Transaction: CARD-3166196743
-25.51 697.15
Sent money to BUSINESS PROFESSIONAL CONSULTATIONS OÜ
10 November 2025 Transaction: TRANSFER-1813429851 Reference: Arve nr. 300
-300.00 1,832.93
Cashback
6 November 2025 Transaction: BALANCE_CASHBACK-694c8a28-22ae-4410-eba1-ade3459fcceb
0.59 2,100.93
Received money from NIUM * Ciba Health Inc with reference RT3772376495
3 November 2025 Transaction: TRANSFER-1801587256 Reference: RT3772376495
6,788.00 6,987.15
Wise is the trading name of Wise Europe SA, a Payment Institution authorised by the National Bank of Belgium.`

describe('wise-parser', () => {
  describe('parseWiseDate', () => {
    it('should parse "27 November 2025" to "2025-11-27"', () => {
      expect(parseWiseDate('27 November 2025')).toBe('2025-11-27')
    })

    it('should parse "3 November 2025" to "2025-11-03"', () => {
      expect(parseWiseDate('3 November 2025')).toBe('2025-11-03')
    })

    it('should parse "1 January 2026" to "2026-01-01"', () => {
      expect(parseWiseDate('1 January 2026')).toBe('2026-01-01')
    })
  })

  describe('parseWiseDateRange', () => {
    it('should parse date range from header', () => {
      const result = parseWiseDateRange('1 November 2025 [GMT] - 30 November 2025 [GMT]')
      expect(result).toEqual({ from: '2025-11-01', to: '2025-11-30' })
    })
  })

  describe('parseWiseText', () => {
    it('should extract currency from header', () => {
      const result = parseWiseText(sampleWiseText)
      expect(result.currency).toBe('EUR')
    })

    it('should extract date range', () => {
      const result = parseWiseText(sampleWiseText)
      expect(result.dateRange).toEqual({ from: '2025-11-01', to: '2025-11-30' })
    })

    it('should parse all transactions', () => {
      const result = parseWiseText(sampleWiseText)
      expect(result.transactions).toHaveLength(4)
    })

    it('should parse an outgoing card transaction', () => {
      const result = parseWiseText(sampleWiseText)
      const backblaze = result.transactions[0]
      expect(backblaze.description).toContain('Backblaze')
      expect(backblaze.date).toBe('2025-11-27')
      expect(backblaze.outgoing).toBe(-25.51)
      expect(backblaze.incoming).toBeNull()
      expect(backblaze.amount).toBe(25.51)
      expect(backblaze.reference).toBe('CARD-3166196743')
      expect(backblaze.currency).toBe('EUR')
    })

    it('should parse an outgoing transfer', () => {
      const result = parseWiseText(sampleWiseText)
      const bpc = result.transactions[1]
      expect(bpc.description).toContain('BUSINESS PROFESSIONAL CONSULTATIONS')
      expect(bpc.date).toBe('2025-11-10')
      expect(bpc.outgoing).toBe(-300.00)
      expect(bpc.incoming).toBeNull()
      expect(bpc.amount).toBe(300.00)
      expect(bpc.reference).toBe('TRANSFER-1813429851')
    })

    it('should parse an incoming cashback', () => {
      const result = parseWiseText(sampleWiseText)
      const cashback = result.transactions[2]
      expect(cashback.description).toBe('Cashback')
      expect(cashback.date).toBe('2025-11-06')
      expect(cashback.incoming).toBe(0.59)
      expect(cashback.outgoing).toBeNull()
      expect(cashback.amount).toBe(0.59)
    })

    it('should parse a large incoming transfer', () => {
      const result = parseWiseText(sampleWiseText)
      const ciba = result.transactions[3]
      expect(ciba.description).toContain('NIUM * Ciba Health Inc')
      expect(ciba.date).toBe('2025-11-03')
      expect(ciba.incoming).toBe(6788.00)
      expect(ciba.outgoing).toBeNull()
      expect(ciba.amount).toBe(6788.00)
      expect(ciba.reference).toBe('TRANSFER-1801587256')
    })

    it('should throw on non-Wise text', () => {
      expect(() => parseWiseText('some random text')).toThrow('Could not parse as a Wise balance statement')
    })

    it('should throw on empty transactions', () => {
      const headerOnly = `EUR statement
1 November 2025 [GMT] - 30 November 2025 [GMT]
Description Incoming Outgoing Amount
Wise is the trading name of Wise Europe SA.`
      expect(() => parseWiseText(headerOnly)).toThrow('No transactions found')
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `yarn test __tests__/lib/import/wise-parser.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
// lib/import/wise-parser.ts
import type { WiseTransaction, WiseParseResult } from './wise-types'

const MONTHS: Record<string, string> = {
  January: '01', February: '02', March: '03', April: '04',
  May: '05', June: '06', July: '07', August: '08',
  September: '09', October: '10', November: '11', December: '12',
}

/**
 * Parse a Wise date string like "27 November 2025" into "2025-11-27"
 */
export function parseWiseDate(dateStr: string): string {
  const match = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (!match) throw new Error(`Cannot parse date: ${dateStr}`)
  const [, day, month, year] = match
  const mm = MONTHS[month]
  if (!mm) throw new Error(`Unknown month: ${month}`)
  return `${year}-${mm}-${day.padStart(2, '0')}`
}

/**
 * Parse the date range line like "1 November 2025 [GMT] - 30 November 2025 [GMT]"
 */
export function parseWiseDateRange(line: string): { from: string; to: string } {
  const parts = line.split(' - ')
  if (parts.length !== 2) throw new Error(`Cannot parse date range: ${line}`)
  // Strip [GMT] suffixes
  const fromStr = parts[0].replace(/\s*\[GMT\]\s*/, '').trim()
  const toStr = parts[1].replace(/\s*\[GMT\]\s*/, '').trim()
  return { from: parseWiseDate(fromStr), to: parseWiseDate(toStr) }
}

/**
 * Parse a number that may have commas: "6,788.00" -> 6788.00
 */
function parseAmount(str: string): number {
  return parseFloat(str.replace(/,/g, ''))
}

/**
 * Parse raw text extracted from a Wise balance statement PDF.
 */
export function parseWiseText(text: string): WiseParseResult {
  // 1. Extract currency from header
  const currencyMatch = text.match(/^(\w{3}) statement$/m)
  if (!currencyMatch) {
    throw new Error('Could not parse as a Wise balance statement')
  }
  const currency = currencyMatch[1]

  // 2. Extract date range
  const dateRangeMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4}\s*\[GMT\])\s*-\s*(\d{1,2}\s+\w+\s+\d{4}\s*\[GMT\])/)
  if (!dateRangeMatch) {
    throw new Error('Could not parse date range from statement')
  }
  const dateRange = parseWiseDateRange(dateRangeMatch[0])

  // 3. Find the transaction section
  const headerIndex = text.indexOf('Description Incoming Outgoing Amount')
  if (headerIndex === -1) {
    throw new Error('Could not parse as a Wise balance statement')
  }

  // Find footer (end of transactions)
  const footerIndex = text.indexOf('Wise is the trading name')
  const transactionText = footerIndex !== -1
    ? text.substring(headerIndex + 'Description Incoming Outgoing Amount'.length, footerIndex)
    : text.substring(headerIndex + 'Description Incoming Outgoing Amount'.length)

  // 4. Split into transaction blocks using "Transaction:" as anchor
  // Each block contains: description lines, date+reference line, amounts line
  const transactionRegex = /Transaction:\s*(\S+)/g
  const blocks: Array<{ text: string; reference: string; endIndex: number }> = []
  let match: RegExpExecArray | null

  const refs: Array<{ reference: string; index: number }> = []
  while ((match = transactionRegex.exec(transactionText)) !== null) {
    refs.push({ reference: match[1], index: match.index })
  }

  if (refs.length === 0) {
    throw new Error('No transactions found in this statement')
  }

  // 5. Parse each transaction
  const transactions: WiseTransaction[] = []

  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]

    // Find the start of this transaction block
    // It starts after the previous transaction's amounts line, or at the beginning
    const blockStart = i === 0 ? 0 : refs[i - 1].index
    const blockText = i === 0
      ? transactionText.substring(0, ref.index + ref.reference.length + 'Transaction: '.length)
      : transactionText.substring(refs[i - 1].index, ref.index + ref.reference.length + 'Transaction: '.length)

    // Get the text AFTER the Transaction: reference line (amounts)
    const afterRef = transactionText.substring(
      ref.index + 'Transaction: '.length + ref.reference.length
    )
    // The amounts are on the next line(s) before the next description starts
    const amountLines = afterRef.split('\n').filter(l => l.trim())
    const amountLine = amountLines[0]?.trim() || ''

    // Get lines before the Transaction: reference for this block
    let descBlock: string
    if (i === 0) {
      descBlock = transactionText.substring(0, ref.index)
    } else {
      // Find where the previous transaction's amount line ends
      const prevAfterRef = transactionText.substring(
        refs[i - 1].index + 'Transaction: '.length + refs[i - 1].reference.length
      )
      const prevAmountLine = prevAfterRef.split('\n').filter(l => l.trim())[0] || ''
      const prevAmountEnd = transactionText.indexOf(
        prevAmountLine,
        refs[i - 1].index + 'Transaction: '.length + refs[i - 1].reference.length
      ) + prevAmountLine.length

      descBlock = transactionText.substring(prevAmountEnd, ref.index)
    }

    // Extract date from the line containing Transaction:
    const transactionLineStart = transactionText.lastIndexOf('\n', ref.index)
    const transactionLine = transactionText.substring(
      Math.max(0, transactionLineStart),
      ref.index + 'Transaction: '.length + ref.reference.length
    ).trim()

    const dateMatch = transactionLine.match(/(\d{1,2}\s+\w+\s+\d{4})/)
    const date = dateMatch ? parseWiseDate(dateMatch[1]) : ''

    // Extract description: everything in descBlock before the date line
    const descLines = descBlock.split('\n').map(l => l.trim()).filter(l => l)
    // Remove lines that are just the date line (they'll be part of the Transaction: line)
    const description = descLines
      .filter(l => !l.match(/^\d{1,2}\s+\w+\s+\d{4}/))
      .join(' ')
      .trim()

    // Parse amounts from the amount line
    // Format: either "-25.51 697.15" (outgoing + balance) or "6,788.00 6,987.15" (incoming + balance)
    // or "100.00 2,132.93" (incoming refund + balance)
    const amountParts = amountLine.match(/-?[\d,]+\.\d{2}/g)

    let incoming: number | null = null
    let outgoing: number | null = null
    let amount = 0

    if (amountParts && amountParts.length >= 2) {
      const value = parseAmount(amountParts[0])
      if (value < 0) {
        outgoing = value
        amount = Math.abs(value)
      } else {
        incoming = value
        amount = value
      }
    } else if (amountParts && amountParts.length === 1) {
      const value = parseAmount(amountParts[0])
      if (value < 0) {
        outgoing = value
        amount = Math.abs(value)
      } else {
        incoming = value
        amount = value
      }
    }

    // Clean up reference (remove trailing "Reference: ..." if present)
    const cleanRef = ref.reference.replace(/\s+Reference:.*$/, '')

    if (description && date) {
      transactions.push({
        description,
        date,
        incoming,
        outgoing,
        amount,
        reference: cleanRef,
        currency,
      })
    }
  }

  if (transactions.length === 0) {
    throw new Error('No transactions found in this statement')
  }

  return { currency, dateRange, transactions }
}
```

**Step 4: Run test to verify it passes**

Run: `yarn test __tests__/lib/import/wise-parser.test.ts`
Expected: PASS — all tests green.

**Important:** The parser may need adjustments to match exact text output from `pdf-parse`. The tests use a text fixture matching the real PDF. If tests fail on specific assertions, debug by logging the parsed output and adjusting the parsing logic. The key anchors are `Transaction:` references and the date pattern `DD Month YYYY`.

**Step 5: Commit**

```bash
git add lib/import/wise-parser.ts __tests__/lib/import/wise-parser.test.ts
git commit -m "feat: add Wise PDF text parser with tests"
```

---

### Task 4: Parse API endpoint

**Files:**
- Create: `app/api/import/wise/parse/route.ts`
- Test: `__tests__/app/api/import/wise/parse/route.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/app/api/import/wise/parse/route.test.ts
import { POST } from '@/app/api/import/wise/parse/route'
import { NextRequest, NextResponse } from 'next/server'

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn()
})

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))

import pdfParse from 'pdf-parse'
const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>

const samplePdfText = `Wise Europe SA
EUR statement
1 November 2025 [GMT] - 30 November 2025 [GMT]
Generated on: 11 December 2025
EUR on 30 November 2025 [GMT] 697.15 EUR
Description Incoming Outgoing Amount
Cashback
6 November 2025 Transaction: BALANCE_CASHBACK-abc123
0.59 2,100.93
Wise is the trading name of Wise Europe SA.`

describe('POST /api/import/wise/parse', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should parse a valid Wise PDF and return transactions', async () => {
    mockPdfParse.mockResolvedValue({ text: samplePdfText } as any)

    const formData = new FormData()
    const pdfBlob = new Blob(['fake pdf content'], { type: 'application/pdf' })
    formData.append('file', pdfBlob, 'statement.pdf')

    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const mockResponse = { status: 200 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    const response = await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'EUR',
        dateRange: { from: '2025-11-01', to: '2025-11-30' },
        transactions: expect.arrayContaining([
          expect.objectContaining({
            description: 'Cashback',
            amount: 0.59,
          }),
        ]),
      })
    )
  })

  it('should return 400 when no file is provided', async () => {
    const formData = new FormData()
    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const mockResponse = { status: 400 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'No file provided' },
      { status: 400 }
    )
  })

  it('should return 422 when PDF is not a Wise statement', async () => {
    mockPdfParse.mockResolvedValue({ text: 'not a wise statement' } as any)

    const formData = new FormData()
    const pdfBlob = new Blob(['fake pdf'], { type: 'application/pdf' })
    formData.append('file', pdfBlob, 'other.pdf')

    const mockRequest = {
      formData: jest.fn().mockResolvedValue(formData),
    } as unknown as NextRequest

    const mockResponse = { status: 422 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 422 }
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `yarn test __tests__/app/api/import/wise/parse/route.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
// app/api/import/wise/parse/route.ts
import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse'
import { parseWiseText } from '@/lib/import/wise-parser'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Read file buffer and parse PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const pdfData = await pdfParse(buffer)

    // Parse the extracted text
    const result = parseWiseText(pdfData.text)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse PDF'
    console.error('Error parsing Wise PDF:', error)
    return NextResponse.json(
      { error: message },
      { status: 422 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `yarn test __tests__/app/api/import/wise/parse/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/import/wise/parse/route.ts __tests__/app/api/import/wise/parse/route.test.ts
git commit -m "feat: add Wise PDF parse API endpoint"
```

---

### Task 5: Generate API endpoint

**Files:**
- Create: `app/api/import/wise/generate/route.ts`
- Test: `__tests__/app/api/import/wise/generate/route.test.ts`

**Step 1: Write the failing test**

```ts
// __tests__/app/api/import/wise/generate/route.test.ts
import { POST } from '@/app/api/import/wise/generate/route'
import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'

jest.mock('@/lib/db/db-client')
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
  },
}))
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}))

const mockQuery = query as jest.MockedFunction<typeof query>

describe('POST /api/import/wise/generate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const validBody = {
    transactions: [
      {
        description: 'Card transaction Backblaze',
        date: '2025-11-27',
        amount: 25.51,
        currency: 'EUR',
        reference: 'CARD-3166196743',
        businessProfileId: 'profile-1',
        clientId: 'client-1',
      },
      {
        description: 'Received from Ciba Health',
        date: '2025-11-03',
        amount: 6788.00,
        currency: 'EUR',
        reference: 'TRANSFER-1801587256',
        businessProfileId: 'profile-1',
        clientId: 'client-2',
      },
    ],
  }

  it('should create invoices for all transactions', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue(validBody),
    } as unknown as NextRequest

    // Mock: get latest invoice number
    mockQuery.mockResolvedValueOnce([{ invoice_number: 'INV-0005' }])
    // Mock: BEGIN transaction
    mockQuery.mockResolvedValueOnce([])
    // Mock: insert invoice 1
    mockQuery.mockResolvedValueOnce([{ id: 'test-uuid', invoice_number: 'INV-0006' }])
    // Mock: insert invoice item 1
    mockQuery.mockResolvedValueOnce([])
    // Mock: insert invoice 2
    mockQuery.mockResolvedValueOnce([{ id: 'test-uuid', invoice_number: 'INV-0007' }])
    // Mock: insert invoice item 2
    mockQuery.mockResolvedValueOnce([])
    // Mock: COMMIT
    mockQuery.mockResolvedValueOnce([])

    const mockResponse = { status: 201 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        created: expect.arrayContaining([
          expect.objectContaining({ invoiceNumber: expect.any(String) }),
        ]),
      }),
      { status: 201 }
    )
  })

  it('should return 400 for empty transactions array', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({ transactions: [] }),
    } as unknown as NextRequest

    const mockResponse = { status: 400 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('should return 400 for missing required fields', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue({
        transactions: [{ description: 'Test' }],
      }),
    } as unknown as NextRequest

    const mockResponse = { status: 400 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    await POST(mockRequest)

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) }),
      { status: 400 }
    )
  })

  it('should rollback on database error', async () => {
    const mockRequest = {
      json: jest.fn().mockResolvedValue(validBody),
    } as unknown as NextRequest

    // Mock: get latest invoice number
    mockQuery.mockResolvedValueOnce([{ invoice_number: 'INV-0005' }])
    // Mock: BEGIN
    mockQuery.mockResolvedValueOnce([])
    // Mock: insert fails
    mockQuery.mockRejectedValueOnce(new Error('DB error'))
    // Mock: ROLLBACK
    mockQuery.mockResolvedValueOnce([])

    const mockResponse = { status: 500 }
    ;(NextResponse.json as jest.Mock).mockReturnValue(mockResponse)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    await POST(mockRequest)

    // Verify ROLLBACK was called
    const rollbackCall = mockQuery.mock.calls.find(call => call[0] === 'ROLLBACK')
    expect(rollbackCall).toBeDefined()

    consoleSpy.mockRestore()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `yarn test __tests__/app/api/import/wise/generate/route.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
// app/api/import/wise/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { query } from '@/lib/db/db-client'
import { generateRequestSchema } from '@/lib/import/wise-types'

/**
 * Get the next invoice number by finding the highest existing one
 * and incrementing. Format: INV-NNNN
 */
async function getNextInvoiceNumber(count: number): Promise<string[]> {
  const result = await query(
    `SELECT invoice_number FROM invoices
     WHERE invoice_number LIKE 'INV-%'
     ORDER BY invoice_number DESC LIMIT 1`
  )

  let nextNum = 1
  if (result.length > 0) {
    const lastNum = result[0].invoice_number
    const match = lastNum.match(/INV-(\d+)/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }

  const numbers: string[] = []
  for (let i = 0; i < count; i++) {
    numbers.push(`INV-${String(nextNum + i).padStart(4, '0')}`)
  }
  return numbers
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const parsed = generateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    const { transactions } = parsed.data
    const userId = 'user-1' // In a real app, get from authenticated session
    const now = new Date()

    // Generate invoice numbers
    const invoiceNumbers = await getNextInvoiceNumber(transactions.length)

    // Create all invoices in a transaction
    const created: Array<{ id: string; invoiceNumber: string }> = []

    await query('BEGIN')

    try {
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i]
        const invoiceId = uuidv4()
        const invoiceNumber = invoiceNumbers[i]

        // Insert invoice
        await query(
          `INSERT INTO invoices (
            id, user_id, business_profile_id, client_id, invoice_number,
            issue_date, due_date, status, subtotal, tax_rate, tax_amount,
            discount_rate, discount_amount, total, notes, terms, currency,
            is_recurring, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING id, invoice_number`,
          [
            invoiceId,
            userId,
            tx.businessProfileId,
            tx.clientId,
            invoiceNumber,
            tx.date,
            null,           // dueDate
            'draft',
            tx.amount,      // subtotal
            0,              // taxRate
            0,              // taxAmount
            0,              // discountRate
            0,              // discountAmount
            tx.amount,      // total
            `Wise ref: ${tx.reference}`, // notes (for duplicate detection)
            null,           // terms
            tx.currency,
            false,          // isRecurring
            now,
            now,
          ]
        )

        // Insert single invoice item
        await query(
          `INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, amount,
            tax_rate, tax_amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            invoiceId,
            tx.description,
            1,
            tx.amount,
            tx.amount,
            0,
            0,
            now,
            now,
          ]
        )

        created.push({ id: invoiceId, invoiceNumber })
      }

      await query('COMMIT')
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

    return NextResponse.json({ created }, { status: 201 })
  } catch (error) {
    console.error('Error generating invoices from Wise import:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
```

**Step 4: Run test to verify it passes**

Run: `yarn test __tests__/app/api/import/wise/generate/route.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/import/wise/generate/route.ts __tests__/app/api/import/wise/generate/route.test.ts
git commit -m "feat: add Wise import generate API endpoint"
```

---

### Task 6: Frontend — PdfUploadZone component

**Files:**
- Create: `components/import/PdfUploadZone.tsx`

**Step 1: Write the component**

```tsx
// components/import/PdfUploadZone.tsx
'use client'

import { useState, useRef, DragEvent } from 'react'

interface PdfUploadZoneProps {
  onFileSelected: (file: File) => void
  isUploading: boolean
  error: string | null
}

export default function PdfUploadZone({ onFileSelected, isUploading, error }: PdfUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) validateAndSelect(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
  }

  const validateAndSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5MB.')
      return
    }
    onFileSelected(file)
  }

  return (
    <div>
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        {isUploading ? (
          <p className="text-gray-500">Parsing PDF...</p>
        ) : (
          <>
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              Drop a Wise balance statement PDF here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">PDF only, max 5MB</p>
          </>
        )}
      </div>
      {error && (
        <div className="mt-3 bg-red-50 border-l-4 border-red-400 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/import/PdfUploadZone.tsx
git commit -m "feat: add PdfUploadZone component"
```

---

### Task 7: Frontend — TransactionTable and TransactionRow

**Files:**
- Create: `components/import/TransactionTable.tsx`
- Create: `components/import/TransactionRow.tsx`

**Step 1: Write TransactionRow**

```tsx
// components/import/TransactionRow.tsx
'use client'

interface TransactionRowProps {
  transaction: {
    description: string
    date: string
    incoming: number | null
    outgoing: number | null
    amount: number
    reference: string
    currency: string
  }
  checked: boolean
  businessProfileId: string
  clientId: string
  businessProfiles: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  onCheckChange: (checked: boolean) => void
  onBusinessProfileChange: (id: string) => void
  onClientChange: (id: string) => void
}

export default function TransactionRow({
  transaction,
  checked,
  businessProfileId,
  clientId,
  businessProfiles,
  clients,
  onCheckChange,
  onBusinessProfileChange,
  onClientChange,
}: TransactionRowProps) {
  const isIncoming = transaction.incoming !== null
  const displayAmount = transaction.amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <tr className={checked ? 'bg-blue-50' : ''}>
      <td className="px-4 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {transaction.date}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate" title={transaction.description}>
        {transaction.description}
      </td>
      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${isIncoming ? 'text-green-600' : 'text-red-600'}`}>
        {isIncoming ? '+' : '-'}{displayAmount} {transaction.currency}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <select
          value={businessProfileId}
          onChange={(e) => onBusinessProfileChange(e.target.value)}
          disabled={!checked}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
        >
          <option value="">Select profile</option>
          {businessProfiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <select
          value={clientId}
          onChange={(e) => onClientChange(e.target.value)}
          disabled={!checked}
          className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
        >
          <option value="">Select client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}
```

**Step 2: Write TransactionTable**

```tsx
// components/import/TransactionTable.tsx
'use client'

import TransactionRow from './TransactionRow'

interface Transaction {
  description: string
  date: string
  incoming: number | null
  outgoing: number | null
  amount: number
  reference: string
  currency: string
}

interface RowState {
  checked: boolean
  businessProfileId: string
  clientId: string
}

interface TransactionTableProps {
  transactions: Transaction[]
  rowStates: RowState[]
  businessProfiles: Array<{ id: string; name: string }>
  clients: Array<{ id: string; name: string }>
  onRowStateChange: (index: number, state: Partial<RowState>) => void
  onToggleAll: (checked: boolean) => void
}

export default function TransactionTable({
  transactions,
  rowStates,
  businessProfiles,
  clients,
  onRowStateChange,
  onToggleAll,
}: TransactionTableProps) {
  const allChecked = rowStates.length > 0 && rowStates.every((r) => r.checked)
  const someChecked = rowStates.some((r) => r.checked)

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked && !allChecked
                }}
                onChange={(e) => onToggleAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Profile</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx, i) => (
            <TransactionRow
              key={tx.reference}
              transaction={tx}
              checked={rowStates[i]?.checked ?? false}
              businessProfileId={rowStates[i]?.businessProfileId ?? ''}
              clientId={rowStates[i]?.clientId ?? ''}
              businessProfiles={businessProfiles}
              clients={clients}
              onCheckChange={(checked) => onRowStateChange(i, { checked })}
              onBusinessProfileChange={(businessProfileId) => onRowStateChange(i, { businessProfileId })}
              onClientChange={(clientId) => onRowStateChange(i, { clientId })}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add components/import/TransactionTable.tsx components/import/TransactionRow.tsx
git commit -m "feat: add TransactionTable and TransactionRow components"
```

---

### Task 8: Frontend — ImportActionBar component

**Files:**
- Create: `components/import/ImportActionBar.tsx`

**Step 1: Write the component**

```tsx
// components/import/ImportActionBar.tsx
'use client'

interface ImportActionBarProps {
  selectedCount: number
  totalCount: number
  canGenerate: boolean
  isGenerating: boolean
  onGenerate: () => void
}

export default function ImportActionBar({
  selectedCount,
  totalCount,
  canGenerate,
  isGenerating,
  onGenerate,
}: ImportActionBarProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between shadow-lg">
      <p className="text-sm text-gray-600">
        {selectedCount} of {totalCount} transactions selected
      </p>
      <button
        onClick={onGenerate}
        disabled={!canGenerate || isGenerating}
        className={`px-6 py-2 rounded-md text-sm font-medium text-white ${
          canGenerate && !isGenerating
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {isGenerating ? 'Generating...' : `Generate ${selectedCount} Invoice${selectedCount !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add components/import/ImportActionBar.tsx
git commit -m "feat: add ImportActionBar component"
```

---

### Task 9: Frontend — Import page

**Files:**
- Create: `app/dashboard/invoices/import/page.tsx`

**Step 1: Write the page**

```tsx
// app/dashboard/invoices/import/page.tsx
'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PdfUploadZone from '@/components/import/PdfUploadZone'
import TransactionTable from '@/components/import/TransactionTable'
import ImportActionBar from '@/components/import/ImportActionBar'

export const dynamic = 'force-dynamic'

interface WiseTransaction {
  description: string
  date: string
  incoming: number | null
  outgoing: number | null
  amount: number
  reference: string
  currency: string
}

interface RowState {
  checked: boolean
  businessProfileId: string
  clientId: string
}

export default function WiseImportPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<WiseTransaction[]>([])
  const [rowStates, setRowStates] = useState<RowState[]>([])
  const [businessProfiles, setBusinessProfiles] = useState<Array<{ id: string; name: string }>>([])
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // Fetch business profiles and clients on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [profilesRes, clientsRes] = await Promise.all([
          fetch('/api/business-profiles'),
          fetch('/api/clients'),
        ])
        if (profilesRes.ok) setBusinessProfiles(await profilesRes.json())
        if (clientsRes.ok) setClients(await clientsRes.json())
      } catch (err) {
        console.error('Error loading data:', err)
      }
    }
    fetchData()
  }, [])

  const handleFileSelected = async (file: File) => {
    setIsUploading(true)
    setUploadError(null)
    setTransactions([])
    setRowStates([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/import/wise/parse', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to parse PDF')
      }

      const result = await response.json()
      setTransactions(result.transactions)
      setRowStates(
        result.transactions.map(() => ({
          checked: false,
          businessProfileId: '',
          clientId: '',
        }))
      )
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse PDF')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRowStateChange = (index: number, partial: Partial<RowState>) => {
    setRowStates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], ...partial }
      return next
    })
  }

  const handleToggleAll = (checked: boolean) => {
    setRowStates((prev) => prev.map((r) => ({ ...r, checked })))
  }

  const selectedRows = rowStates.filter((r) => r.checked)
  const canGenerate =
    selectedRows.length > 0 &&
    selectedRows.every((r) => r.businessProfileId && r.clientId)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const selectedTransactions = transactions
        .map((tx, i) => ({ tx, state: rowStates[i] }))
        .filter(({ state }) => state.checked)
        .map(({ tx, state }) => ({
          description: tx.description,
          date: tx.date,
          amount: tx.amount,
          currency: tx.currency,
          reference: tx.reference,
          businessProfileId: state.businessProfileId,
          clientId: state.clientId,
        }))

      const response = await fetch('/api/import/wise/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: selectedTransactions }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate invoices')
      }

      router.push('/dashboard/invoices')
      router.refresh()
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate invoices')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Import from Wise</h1>
        <Link href="/dashboard/invoices" className="text-blue-600 hover:text-blue-800">
          Back to Invoices
        </Link>
      </div>

      <PdfUploadZone
        onFileSelected={handleFileSelected}
        isUploading={isUploading}
        error={uploadError}
      />

      {transactions.length > 0 && (
        <>
          <div className="mt-6">
            <TransactionTable
              transactions={transactions}
              rowStates={rowStates}
              businessProfiles={businessProfiles}
              clients={clients}
              onRowStateChange={handleRowStateChange}
              onToggleAll={handleToggleAll}
            />
          </div>

          {generateError && (
            <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-3">
              <p className="text-sm text-red-700">{generateError}</p>
            </div>
          )}

          <ImportActionBar
            selectedCount={selectedRows.length}
            totalCount={transactions.length}
            canGenerate={canGenerate}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
          />
        </>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add app/dashboard/invoices/import/page.tsx
git commit -m "feat: add Wise import page"
```

---

### Task 10: Add "Import from Wise" button to invoices list

**Files:**
- Modify: `app/dashboard/invoices/page.tsx`

**Step 1: Add the button**

In `app/dashboard/invoices/page.tsx`, find the button group (around line 133-146) and add a third Link:

```tsx
// After the "Create from Template" Link, add:
<Link
  href="/dashboard/invoices/import"
  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded"
>
  Import from Wise
</Link>
```

The button group should now have three links: "Create New Invoice", "Create from Template", and "Import from Wise".

**Step 2: Verify by visiting the page**

Run: `yarn dev`
Visit: `http://localhost:3000/dashboard/invoices`
Expected: Three buttons visible in the header. Clicking "Import from Wise" navigates to `/dashboard/invoices/import`.

**Step 3: Commit**

```bash
git add app/dashboard/invoices/page.tsx
git commit -m "feat: add Import from Wise button to invoices list"
```

---

### Task 11: End-to-end manual test

This is a manual verification task — no code to write.

**Step 1: Start dev server**

Run: `yarn dev`

**Step 2: Test the full flow**

1. Navigate to `/dashboard/invoices` — verify "Import from Wise" button appears
2. Click button — verify import page loads with upload zone
3. Upload a Wise balance statement PDF — verify transactions appear in the table
4. Check a few rows, assign business profiles and clients from dropdowns
5. Click "Generate Invoices" — verify redirect to invoices list with new draft invoices

**Step 3: Run all tests**

Run: `yarn test`
Expected: All existing tests pass + new tests for wise-types, wise-parser, parse route, generate route.

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Install pdf-parse | package.json |
| 2 | Types + Zod schemas | lib/import/wise-types.ts + test |
| 3 | Wise PDF parser | lib/import/wise-parser.ts + test |
| 4 | Parse API endpoint | app/api/import/wise/parse/route.ts + test |
| 5 | Generate API endpoint | app/api/import/wise/generate/route.ts + test |
| 6 | PdfUploadZone | components/import/PdfUploadZone.tsx |
| 7 | TransactionTable + Row | components/import/Transaction*.tsx |
| 8 | ImportActionBar | components/import/ImportActionBar.tsx |
| 9 | Import page | app/dashboard/invoices/import/page.tsx |
| 10 | Button on invoices list | app/dashboard/invoices/page.tsx |
| 11 | End-to-end manual test | — |
