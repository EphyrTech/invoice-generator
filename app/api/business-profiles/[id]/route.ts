import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';

// GET /api/business-profiles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const profiles = await query(
      'SELECT * FROM business_profiles WHERE id = $1',
      [id]
    );

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profiles[0]);
  } catch (error) {
    console.error('Error fetching business profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business profile' },
      { status: 500 }
    );
  }
}

// PUT /api/business-profiles/[id]
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
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const existingProfiles = await query(
      'SELECT * FROM business_profiles WHERE id = $1',
      [id]
    );

    if (existingProfiles.length === 0) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      );
    }

    const existingProfile = existingProfiles[0];

    // Update the profile
    const now = new Date();

    const result = await query(
      `UPDATE business_profiles SET
        name = $1,
        email = $2,
        phone = $3,
        address = $4,
        city = $5,
        state = $6,
        postal_code = $7,
        country = $8,
        tax_id = $9,
        logo_url = $10,
        updated_at = $11
      WHERE id = $12
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
        body.logoUrl || null,
        now,
        id
      ]
    );

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating business profile:', error);
    return NextResponse.json(
      { error: 'Failed to update business profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/business-profiles/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if profile exists
    const existingProfiles = await query(
      'SELECT * FROM business_profiles WHERE id = $1',
      [id]
    );

    if (existingProfiles.length === 0) {
      return NextResponse.json(
        { error: 'Business profile not found' },
        { status: 404 }
      );
    }

    // Delete the profile
    await query(
      'DELETE FROM business_profiles WHERE id = $1',
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting business profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete business profile' },
      { status: 500 }
    );
  }
}
