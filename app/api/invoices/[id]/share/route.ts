import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';
import { nanoid } from 'nanoid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const invoices = await query(
      'SELECT id, public_token FROM invoices WHERE id = $1',
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const invoice = invoices[0];

    if (invoice.public_token) {
      return NextResponse.json({
        publicToken: invoice.public_token,
        publicUrl: `/i/${invoice.public_token}`,
      });
    }

    const token = nanoid(12);
    await query(
      'UPDATE invoices SET public_token = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [token, new Date(), id]
    );

    return NextResponse.json({
      publicToken: token,
      publicUrl: `/i/${token}`,
    });
  } catch (error) {
    console.error('Error sharing invoice:', error);
    return NextResponse.json(
      { error: 'Failed to share invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    const invoices = await query(
      'SELECT id FROM invoices WHERE id = $1',
      [id]
    );

    if (invoices.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    await query(
      'UPDATE invoices SET public_token = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [null, new Date(), id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking share:', error);
    return NextResponse.json(
      { error: 'Failed to revoke share' },
      { status: 500 }
    );
  }
}
