import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';

// GET /api/invoices/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the invoice
    const invoices = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Get the invoice items
    const items = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    const invoice = invoices[0];
    invoice.items = items;
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    
    // Validate required fields
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
    
    // Check if invoice exists
    const existingInvoices = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Calculate totals
    const subtotal = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const discountRate = body.discountRate || 0;
    const discountAmount = (subtotal * discountRate) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxRate = body.taxRate || 0;
    const taxAmount = (taxableAmount * taxRate) / 100;
    const total = taxableAmount + taxAmount;
    
    // Update the invoice
    const now = new Date();
    const status = body.action === 'draft' ? 'draft' : (body.status || 'issued');
    
    const result = await query(
      `UPDATE invoices SET 
        business_profile_id = $1, 
        client_id = $2, 
        invoice_number = $3, 
        issue_date = $4, 
        due_date = $5, 
        status = $6, 
        subtotal = $7, 
        tax_rate = $8, 
        tax_amount = $9, 
        discount_rate = $10, 
        discount_amount = $11, 
        total = $12, 
        notes = $13, 
        terms = $14, 
        currency = $15, 
        updated_at = $16 
      WHERE id = $17 
      RETURNING *`,
      [
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
        now,
        id
      ]
    );
    
    // Update invoice items
    if (body.items && body.items.length > 0) {
      // Delete existing items
      await query(
        'DELETE FROM invoice_items WHERE invoice_id = $1',
        [id]
      );
      
      // Insert new items
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
              id,
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
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Check if invoice exists
    const existingInvoices = await query(
      'SELECT * FROM invoices WHERE id = $1',
      [id]
    );
    
    if (existingInvoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Delete invoice items (cascade will handle this, but let's be explicit)
    await query(
      'DELETE FROM invoice_items WHERE invoice_id = $1',
      [id]
    );
    
    // Delete the invoice
    await query(
      'DELETE FROM invoices WHERE id = $1',
      [id]
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
