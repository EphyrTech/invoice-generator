import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';
import { generateInvoiceNumber, InvoiceNumberPattern } from '@/lib/utils/invoice-number-generator';
import { serializeDbResult, serializeDbRow } from '@/lib/utils/serialize';

// GET /api/invoices
export async function GET() {
  try {
    const invoices = await query(
      'SELECT * FROM invoices ORDER BY created_at DESC'
    );
    
    return NextResponse.json(serializeDbResult(invoices));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

// POST /api/invoices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle creating invoice from template
    if (body.templateId) {
      return await createInvoiceFromTemplate(body);
    }

    // Validate required fields for manual invoice creation
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

    if (!body.invoiceNumber) {
      return NextResponse.json(
        { error: 'Invoice number is required' },
        { status: 400 }
      );
    }
    
    if (!body.issueDate) {
      return NextResponse.json(
        { error: 'Issue date is required' },
        { status: 400 }
      );
    }
    
    // Create a new invoice
    const invoiceId = uuidv4();
    const userId = 'user-1'; // In a real app, get this from the authenticated user
    const now = new Date();
    const status = body.action === 'draft' ? 'draft' : 'issued';
    
    // Calculate totals
    const subtotal = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const discountRate = body.discountRate || 0;
    const discountAmount = (subtotal * discountRate) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxRate = body.taxRate || 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;
    
    // Insert the invoice
    const result = await query(
      `INSERT INTO invoices (
        id, user_id, business_profile_id, client_id, invoice_number, 
        issue_date, due_date, status, subtotal, tax_rate, tax_amount, 
        discount_rate, discount_amount, total, notes, terms, currency, 
        is_recurring, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [
        invoiceId,
        userId,
        body.businessProfileId,
        body.clientId,
        body.invoiceNumber,
        body.issueDate,
        body.dueDate || null,
        status,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        body.notes || null,
        body.terms || null,
        body.currency || 'USD',
        false, // is_recurring
        now,
        now
      ]
    );
    
    // Insert invoice items
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        if (item.description) {
          const amount = item.quantity * item.unitPrice;
          const itemTaxRate = item.taxRate || 0;
          const itemTaxAmount = (amount * itemTaxRate) / 100;
          
          await query(
            `INSERT INTO invoice_items (
              id, invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              uuidv4(),
              invoiceId,
              item.description,
              item.quantity || 1,
              item.unitPrice || 0,
              amount,
              itemTaxRate,
              itemTaxAmount,
              now,
              now
            ]
          );
        }
      }
    }
    
    // If saving as template
    if (body.saveAsTemplate && body.templateName) {
      const templateId = uuidv4();
      
      // Insert the template
      await query(
        `INSERT INTO invoice_templates (
          id, user_id, name, business_profile_id, client_id, invoice_number, 
          tax_rate, discount_rate, notes, terms, currency, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          templateId,
          userId,
          body.templateName,
          body.businessProfileId,
          body.clientId,
          body.invoiceNumber,
          taxRate,
          discountRate,
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
    }
    
    return NextResponse.json(serializeDbRow(result[0]), { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}

// Helper function to create invoice from template
async function createInvoiceFromTemplate(body: any) {
  try {
    const { templateId, issueDate, dueDate, action = 'draft' } = body;

    // Get the template with its pattern configuration
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

    // Generate invoice number using the template's pattern
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

    const invoiceNumberResult = generateInvoiceNumber(pattern);

    // Get template items
    const templateItems = await query(
      'SELECT * FROM invoice_template_items WHERE template_id = $1',
      [templateId]
    );

    // Calculate totals from template items
    const subtotal = templateItems.reduce((sum: number, item: any) =>
      sum + (item.quantity * item.unit_price), 0);
    const discountRate = template.discount_rate || 0;
    const discountAmount = (subtotal * discountRate) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxRate = template.tax_rate || 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;

    // Create the invoice
    const invoiceId = uuidv4();
    const userId = 'user-1'; // In a real app, get this from the authenticated user
    const now = new Date();
    const status = action === 'draft' ? 'draft' : 'issued';

    const result = await query(
      `INSERT INTO invoices (
        id, user_id, business_profile_id, client_id, invoice_number,
        issue_date, due_date, status, subtotal, tax_rate, tax_amount,
        discount_rate, discount_amount, total, notes, terms, currency,
        is_recurring, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [
        invoiceId,
        userId,
        template.business_profile_id,
        template.client_id,
        invoiceNumberResult.invoiceNumber,
        issueDate,
        dueDate || null,
        status,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        template.notes || null,
        template.terms || null,
        template.currency || 'USD',
        false, // is_recurring
        now,
        now
      ]
    );

    // Insert invoice items from template
    for (const templateItem of templateItems) {
      await query(
        `INSERT INTO invoice_items (
          id, invoice_id, description, quantity, unit_price, tax_rate, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          uuidv4(),
          invoiceId,
          templateItem.description,
          templateItem.quantity,
          templateItem.unit_price,
          templateItem.tax_rate || 0,
          now,
          now
        ]
      );
    }

    // Update the template's next invoice number
    await query(
      `UPDATE invoice_templates
       SET invoice_number_next_value = $1,
           invoice_number_last_reset_date = $2,
           updated_at = $3
       WHERE id = $4`,
      [
        invoiceNumberResult.nextValue,
        pattern.resetFrequency !== 'never' ? now.toISOString().split('T')[0] : pattern.lastResetDate,
        now,
        templateId
      ]
    );

    return NextResponse.json(serializeDbRow(result[0]), { status: 201 });

  } catch (error) {
    console.error('Error creating invoice from template:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice from template' },
      { status: 500 }
    );
  }
}
