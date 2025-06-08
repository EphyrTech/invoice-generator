import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';

// GET /api/clients
export async function GET() {
  try {
    const allClients = await query(
      'SELECT * FROM clients ORDER BY created_at DESC'
    );

    return NextResponse.json(allClients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/clients
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      );
    }

    // Create a new client
    const id = uuidv4();
    const userId = 'user-1'; // In a real app, get this from the authenticated user
    const now = new Date();
    const isBusinessProfile = body.isBusinessProfile || false;

    const result = await query(
      `INSERT INTO clients (
        id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, notes,
        is_business_profile, business_profile_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        id,
        userId,
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
        now
      ]
    );

    const newClient = result[0];

    return NextResponse.json(newClient, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}
