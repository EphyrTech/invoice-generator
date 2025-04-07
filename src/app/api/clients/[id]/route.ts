import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';

// GET /api/clients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const clients = await query(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );

    if (clients.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(clients[0]);
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id]
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
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Check if client exists
    const existingClients = await query(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );

    if (existingClients.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Update the client
    const now = new Date();
    const isBusinessProfile = body.isBusinessProfile || false;

    const result = await query(
      `UPDATE clients SET
        name = $1,
        email = $2,
        phone = $3,
        address = $4,
        city = $5,
        state = $6,
        postal_code = $7,
        country = $8,
        tax_id = $9,
        notes = $10,
        is_business_profile = $11,
        business_profile_id = $12,
        updated_at = $13
      WHERE id = $14
      RETURNING *`,
      [
        body.name,
        body.email || null,
        body.phone || null,
        body.address || null,
        body.city || null,
        body.state || null,
        body.postalCode || null,
        body.country || null,
        body.taxId || null,
        body.notes || null,
        isBusinessProfile,
        body.businessProfileId || null,
        now,
        id
      ]
    );

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if client exists
    const existingClients = await query(
      'SELECT * FROM clients WHERE id = $1',
      [id]
    );

    if (existingClients.length === 0) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Delete the client
    await query(
      'DELETE FROM clients WHERE id = $1',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}
