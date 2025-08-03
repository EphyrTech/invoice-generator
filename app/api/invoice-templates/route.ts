import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';
import { serializeDbResult, serializeDbRow } from '@/lib/utils/serialize';

// GET /api/invoice-templates
export async function GET() {
  try {
    const templates = await query(`
      SELECT 
        t.*,
        bp.name as business_profile_name,
        c.name as client_name
      FROM invoice_templates t
      LEFT JOIN business_profiles bp ON t.business_profile_id = bp.id
      LEFT JOIN clients c ON t.client_id = c.id
      ORDER BY t.created_at DESC
    `);
    
    return NextResponse.json(serializeDbResult(templates));
  } catch (error) {
    console.error('Error fetching invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice templates' },
      { status: 500 }
    );
  }
}

// POST /api/invoice-templates
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
    const now = new Date();

    // Get or create a default user
    const userId = 'user-1';
    try {
      // Check if default user exists, if not create one
      const existingUsers = await query('SELECT id FROM users WHERE id = $1', [userId]);
      if (existingUsers.length === 0) {
        await query(
          'INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, 'admin@invoice.app', 'hashed_password', now, now]
        );
      }
    } catch (error) {
      console.error('Error handling user:', error);
      // Continue with the template creation anyway
    }

    // Insert the template (using production schema structure)

    const result = await query(
      `INSERT INTO invoice_templates (
        id, user_id, name, business_profile_id, client_id, invoice_number,
        issue_date, due_date, status, tax_rate, discount_rate, notes, terms, currency, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        templateId,
        userId,
        body.name,
        body.businessProfileId,
        body.clientId,
        body.invoiceNumber || null,
        body.issueDate || null,
        body.dueDate || null,
        body.status || 'draft',
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

// PUT /api/invoice-templates (for bulk operations or future use)
export async function PUT(_request: NextRequest) {
  try {
    // This could be used for bulk updates in the future
    return NextResponse.json(
      { error: 'Bulk template updates not implemented yet' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error updating invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice templates' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoice-templates (for bulk operations or future use)
export async function DELETE(_request: NextRequest) {
  try {
    // This could be used for bulk deletes in the future
    return NextResponse.json(
      { error: 'Bulk template deletion not implemented yet' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error deleting invoice templates:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice templates' },
      { status: 500 }
    );
  }
}
