import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { generateInvoiceNumber, InvoiceNumberPattern } from '@/lib/utils/invoice-number-generator';

// POST /api/invoice-templates/[id]/generate-invoice-number
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    // Get the template with its current pattern configuration
    const templates = await query(
      'SELECT * FROM invoice_templates WHERE id = $1',
      [templateId]
    );

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = templates[0];

    // Create pattern configuration from template data
    const pattern: InvoiceNumberPattern = {
      pattern: template.invoice_number_pattern || 'INV-{YYYY}-{####}',
      nextValue: template.invoice_number_next_value || 1,
      prefix: template.invoice_number_prefix || 'INV',
      suffix: template.invoice_number_suffix || '',
      dateFormat: template.invoice_number_date_format || 'YYYY',
      counterDigits: template.invoice_number_counter_digits || 4,
      resetFrequency: template.invoice_number_reset_frequency || 'never',
      lastResetDate: template.invoice_number_last_reset_date
    };

    // Generate the next invoice number
    const result = generateInvoiceNumber(pattern);

    // Update the template with the new next value and reset date if needed
    const now = new Date();
    const shouldUpdateResetDate = pattern.resetFrequency !== 'never' && 
      (!pattern.lastResetDate || 
       pattern.lastResetDate !== now.toISOString().split('T')[0]);

    await query(
      `UPDATE invoice_templates 
       SET invoice_number_next_value = $1,
           invoice_number_last_reset_date = $2,
           updated_at = $3
       WHERE id = $4`,
      [
        result.nextValue,
        shouldUpdateResetDate ? now.toISOString().split('T')[0] : pattern.lastResetDate,
        now,
        templateId
      ]
    );

    return NextResponse.json({
      invoiceNumber: result.invoiceNumber,
      nextValue: result.nextValue,
      pattern: pattern.pattern
    });

  } catch (error) {
    console.error('Error generating invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice number' },
      { status: 500 }
    );
  }
}

// GET /api/invoice-templates/[id]/generate-invoice-number - Preview without updating
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;

    // Get the template with its current pattern configuration
    const templates = await query(
      'SELECT * FROM invoice_templates WHERE id = $1',
      [templateId]
    );

    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const template = templates[0];

    // Create pattern configuration from template data
    const pattern: InvoiceNumberPattern = {
      pattern: template.invoice_number_pattern || 'INV-{YYYY}-{####}',
      nextValue: template.invoice_number_next_value || 1,
      prefix: template.invoice_number_prefix || 'INV',
      suffix: template.invoice_number_suffix || '',
      dateFormat: template.invoice_number_date_format || 'YYYY',
      counterDigits: template.invoice_number_counter_digits || 4,
      resetFrequency: template.invoice_number_reset_frequency || 'never',
      lastResetDate: template.invoice_number_last_reset_date
    };

    // Generate preview without updating the template
    const result = generateInvoiceNumber(pattern);

    return NextResponse.json({
      preview: result.invoiceNumber,
      currentNextValue: pattern.nextValue,
      pattern: pattern.pattern,
      resetFrequency: pattern.resetFrequency
    });

  } catch (error) {
    console.error('Error previewing invoice number:', error);
    return NextResponse.json(
      { error: 'Failed to preview invoice number' },
      { status: 500 }
    );
  }
}
