import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { rateLimit } from '@/lib/utils/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    const token = params.token;

    const invoices = await query(
      'SELECT * FROM invoices WHERE public_token = $1',
      [token]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    const items = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC',
      [invoice.id]
    );

    const profiles = await query(
      'SELECT * FROM business_profiles WHERE id = $1',
      [invoice.business_profile_id]
    );

    const clients = await query(
      'SELECT * FROM clients WHERE id = $1',
      [invoice.client_id]
    );

    // Strip sensitive fields
    const { user_id, ...safeInvoice } = invoice;

    return NextResponse.json({
      ...safeInvoice,
      items,
      businessProfile: profiles[0] || null,
      client: clients[0] || null,
    });
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}
