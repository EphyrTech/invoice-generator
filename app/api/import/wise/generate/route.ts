import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db/db-client'
import { v4 as uuidv4 } from 'uuid'
import { generateRequestSchema } from '@/lib/import/wise-types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate request body
    const parsed = generateRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request: ' + parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { transactions } = parsed.data

    // Get the next invoice number
    const existing = await query(
      "SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'INV-%' ORDER BY invoice_number DESC LIMIT 1"
    )

    let nextNumber = 1
    if (existing.length > 0) {
      const lastNumber = existing[0].invoice_number
      const match = lastNumber.match(/^INV-(\d+)$/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }

    const created: { id: string; invoiceNumber: string }[] = []

    // Use a database transaction
    await query('BEGIN')

    try {
      for (const tx of transactions) {
        const invoiceId = uuidv4()
        const invoiceNumber = `INV-${String(nextNumber).padStart(4, '0')}`
        const now = new Date()

        // Create invoice
        await query(
          `INSERT INTO invoices (
            id, user_id, business_profile_id, client_id, invoice_number,
            issue_date, status, subtotal, tax_rate, tax_amount,
            total, notes, currency, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            invoiceId,
            'user-1',
            tx.businessProfileId,
            tx.clientId,
            invoiceNumber,
            tx.date,
            'draft',
            tx.amount,
            0,
            0,
            tx.amount,
            `Wise ref: ${tx.reference}`,
            tx.currency,
            now,
            now,
          ]
        )

        // Create invoice item
        await query(
          `INSERT INTO invoice_items (
            id, invoice_id, description, quantity, unit_price, amount, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            invoiceId,
            tx.description,
            1,
            tx.amount,
            tx.amount,
            now,
            now,
          ]
        )

        created.push({ id: invoiceId, invoiceNumber })
        nextNumber++
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
