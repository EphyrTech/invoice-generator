import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';

// GET /api/invoices
export async function GET() {
  try {
    const invoices = await query(
      'SELECT * FROM invoices ORDER BY created_at DESC'
    );
    
    return NextResponse.json(invoices);
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
    
    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
