import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';
import { serializeDbResult, serializeDbRow } from '@/lib/utils/serialize';

// GET /api/invoice-templates/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Get the template with related data
    const templates = await query(`
      SELECT 
        t.*,
        bp.name as business_profile_name,
        c.name as client_name
      FROM invoice_templates t
      LEFT JOIN business_profiles bp ON t.business_profile_id = bp.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = $1
    `, [id]);
    
    if (templates.length === 0) {
      return NextResponse.json(
        { error: 'Invoice template not found' },
        { status: 404 }
      );
    }
    
    // Get the template items
    const items = await query(
      'SELECT * FROM invoice_template_items WHERE template_id = $1 ORDER BY created_at ASC',
      [id]
    );
    
    const template = serializeDbRow(templates[0]);
    template.items = serializeDbResult(items);
    
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching invoice template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice template' },
      { status: 500 }
    );
  }
}

// PUT /api/invoice-templates/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
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
    
    // Check if template exists
    const existingTemplates = await query(
      'SELECT * FROM invoice_templates WHERE id = $1',
      [id]
    );
    
    if (existingTemplates.length === 0) {
      return NextResponse.json(
        { error: 'Invoice template not found' },
        { status: 404 }
      );
    }
    
    // Update the template
    const now = new Date();
    
    const result = await query(
      `UPDATE invoice_templates SET 
        name = $1, 
        business_profile_id = $2, 
        client_id = $3, 
        invoice_number = $4, 
        tax_rate = $5, 
        discount_rate = $6, 
        notes = $7, 
        terms = $8, 
        currency = $9, 
        updated_at = $10 
      WHERE id = $11 
      RETURNING *`,
      [
        body.name,
        body.businessProfileId,
        body.clientId,
        body.invoiceNumber || null,
        body.taxRate || 0,
        body.discountRate || 0,
        body.notes || null,
        body.terms || null,
        body.currency || 'USD',
        now,
        id
      ]
    );
    
    // Update template items if provided
    if (body.items) {
      // Delete existing items
      await query(
        'DELETE FROM invoice_template_items WHERE template_id = $1',
        [id]
      );
      
      // Insert new items
      for (const item of body.items) {
        if (item.description) {
          await query(
            `INSERT INTO invoice_template_items (
              id, template_id, description, quantity, unit_price, tax_rate, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidv4(),
              id,
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
    
    return NextResponse.json(serializeDbRow(result[0]));
  } catch (error) {
    console.error('Error updating invoice template:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice template' },
      { status: 500 }
    );
  }
}

// DELETE /api/invoice-templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    // Check if template exists
    const existingTemplates = await query(
      'SELECT * FROM invoice_templates WHERE id = $1',
      [id]
    );
    
    if (existingTemplates.length === 0) {
      return NextResponse.json(
        { error: 'Invoice template not found' },
        { status: 404 }
      );
    }
    
    // Delete template items (cascade will handle this, but let's be explicit)
    await query(
      'DELETE FROM invoice_template_items WHERE template_id = $1',
      [id]
    );
    
    // Delete the template
    await query(
      'DELETE FROM invoice_templates WHERE id = $1',
      [id]
    );
    
    return NextResponse.json({ message: 'Invoice template deleted successfully' });
  } catch (error) {
    console.error('Error deleting invoice template:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice template' },
      { status: 500 }
    );
  }
}
