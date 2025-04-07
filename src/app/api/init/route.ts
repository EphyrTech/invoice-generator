import { NextResponse } from 'next/server';
import { initializeDatabaseWithSQL } from '@/lib/db/init-db-sql';

// This route will initialize the database with sample data
export async function GET() {
  try {
    const result = await initializeDatabaseWithSQL();
    if (result.success) {
      return NextResponse.json({ success: true, message: 'Database initialized successfully' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
