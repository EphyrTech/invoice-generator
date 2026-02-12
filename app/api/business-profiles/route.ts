import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';
import { serializeDbResult, serializeDbRow } from '@/lib/utils/serialize';

// GET /api/business-profiles
export async function GET() {
  try {
    const profiles = await query(
      'SELECT * FROM business_profiles ORDER BY created_at DESC'
    );

    return NextResponse.json(serializeDbResult(profiles));
  } catch (error) {
    console.error('Error fetching business profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business profiles' },
      { status: 500 }
    );
  }
}

// POST /api/business-profiles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Create a new business profile
    const id = uuidv4();
    const userId = 'user-1'; // In a real app, get this from the authenticated user
    const now = new Date();

    const result = await query(
      `INSERT INTO business_profiles (
        id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, logo_url, created_at, updated_at,
        default_show_logo, default_show_status, default_pdf_theme
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
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
        body.logoUrl || null,
        now,
        now,
        body.defaultShowLogo ?? false,
        body.defaultShowStatus ?? false,
        body.defaultPdfTheme ?? 'clean'
      ]
    );

    const newProfile = result[0];

    return NextResponse.json(serializeDbRow(newProfile), { status: 201 });
  } catch (error) {
    console.error('Error creating business profile:', error);
    return NextResponse.json(
      { error: 'Failed to create business profile' },
      { status: 500 }
    );
  }
}
