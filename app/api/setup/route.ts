import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { v4 as uuidv4 } from 'uuid';

// This route will create sample data if none exists
export async function POST() {
  try {
    // Check if we already have users
    const existingUsers = await query('SELECT COUNT(*) as count FROM users');
    
    if (existingUsers[0].count > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Database already has data, skipping setup' 
      });
    }

    // Create a default user
    const userId = uuidv4();
    await query(
      'INSERT INTO users (id, name, email, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, 'Demo User', 'demo@example.com', new Date(), new Date(), new Date()]
    );

    // Create a default business profile
    const businessProfileId = uuidv4();
    await query(
      'INSERT INTO business_profiles (id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
      [businessProfileId, userId, 'My Company', 'info@mycompany.com', '+1 (555) 123-4567', '123 Business St', 'City', 'State', '12345', 'USA', '123456789', new Date(), new Date()]
    );

    // Create a default client
    const clientId = uuidv4();
    await query(
      'INSERT INTO clients (id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, is_business_profile, business_profile_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [clientId, userId, 'Client Company', 'contact@clientcompany.com', '+1 (555) 987-6543', '456 Client Ave', 'City', 'State', '54321', 'USA', '987654321', false, null, new Date(), new Date()]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Sample data created successfully' 
    });
  } catch (error) {
    console.error('Error setting up sample data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup sample data' },
      { status: 500 }
    );
  }
}
