import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';
import { serializeDbResult, serializeDbRow } from '@/lib/utils/serialize';

// GET /api/templates
export async function GET() {
  try {
    const templates = await query(
      'SELECT * FROM invoice_templates ORDER BY created_at DESC'
    );
    
    return NextResponse.json(serializeDbResult(templates));
  } catch (error) {
    console.error('Error fetching invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }
    
    if (!body.businessProfileId) {
      return NextResponse.json(
        { error: 'Business profile is required' },
        { status: 400 }
      );
    }
    
    if (!body.clientId) {
      return NextResponse.json(
        { error: 'Client is required' },
        { status: 400 }
      );
    }
    
    // Create a new invoice template
    const templateId = uuidv4();
    const userId = 'user-1'; // In a real app, get this from the authenticated user
    const now = new Date();
    
    // Insert the template with invoice number pattern configuration
    const result = await query(
      `INSERT INTO invoice_templates (
        id, user_id, name, business_profile_id, client_id, invoice_number,
        invoice_number_pattern, invoice_number_next_value, invoice_number_prefix,
        invoice_number_suffix, invoice_number_date_format, invoice_number_counter_digits,
        invoice_number_reset_frequency, invoice_number_last_reset_date,
        tax_rate, discount_rate, notes, terms, currency, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING *`,
      [
        templateId,
        userId,
        body.name,
        body.businessProfileId,
        body.clientId,
        body.invoiceNumber || null,
        body.invoiceNumberPattern || 'INV-{YYYY}-{####}',
        body.invoiceNumberNextValue || 1,
        body.invoiceNumberPrefix || 'INV',
        body.invoiceNumberSuffix || '',
        body.invoiceNumberDateFormat || 'YYYY',
        body.invoiceNumberCounterDigits || 4,
        body.invoiceNumberResetFrequency || 'never',
        body.invoiceNumberLastResetDate || null,
        body.taxRate || 0,
        body.discountRate || 0,
        body.notes || null,
        body.terms || null,
        body.currency || 'USD',
        now,
        now
      ]
    );
    
    // Insert template items
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        if (item.description) {
          await query(
            `INSERT INTO invoice_template_items (
              id, template_id, description, quantity, unit_price, tax_rate, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              templateId,
              item.description,
              item.quantity || 1,
              item.unitPrice || 0,
              item.taxRate || 0,
              now,
              now
            ]
          );
        }
      }
    }
    
    return NextResponse.json(serializeDbRow(result[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating invoice template:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice template' },
      { status: 500 }
    );
  }
}
