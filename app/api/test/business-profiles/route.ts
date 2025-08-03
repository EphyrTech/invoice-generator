import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';

// Test-only endpoint for business profile creation (bypasses auth)
// Only available in test environment
export async function POST(request: NextRequest) {
  // Only allow in test environment
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints not available' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!body.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const profileId = uuidv4();
    const userId = 'test-user-1'; // Fixed test user ID
    const now = new Date();

    // Insert the business profile
    const result = await query(
      `INSERT INTO business_profiles (
        id, user_id, name, email, phone, address, city, state, 
        postal_code, country, tax_id, logo_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        profileId,
        userId,
        body.name,
        body.email,
        body.phone || null,
        body.address || null,
        body.city || null,
        body.state || null,
        body.postalCode || null,
        body.country || null,
        body.taxId || null,
        body.logoUrl || null,
        now,
        now
      ]
    );

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating test business profile:', error);
    return NextResponse.json(
      { error: 'Failed to create business profile' },
      { status: 500 }
    );
  }
}

// Test endpoint to get all business profiles
export async function GET() {
  // Only allow in test environment
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints not available' },
      { status: 404 }
    );
  }

  try {
    const result = await query('SELECT * FROM business_profiles ORDER BY created_at DESC');
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching test business profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch business profiles' },
      { status: 500 }
    );
  }
}

// Test endpoint to delete all business profiles (cleanup)
export async function DELETE() {
  // Only allow in test environment
  if (process.env.NODE_ENV !== 'test' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints not available' },
      { status: 404 }
    );
  }

  try {
    await query('DELETE FROM business_profiles WHERE user_id = $1', ['test-user-1']);
    return NextResponse.json({ message: 'Test business profiles deleted' });
  } catch (error) {
    console.error('Error deleting test business profiles:', error);
    return NextResponse.json(
      { error: 'Failed to delete business profiles' },
      { status: 500 }
    );
  }
}
