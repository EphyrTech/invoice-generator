import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';

export async function GET() {
  try {
    // Check database connectivity
    await query('SELECT 1');

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'invoice-pdf',
        database: 'connected'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        database: 'disconnected'
      },
      { status: 503 }
    );
  }
}
