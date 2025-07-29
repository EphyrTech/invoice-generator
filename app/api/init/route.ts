import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db/init-db';

// This route will initialize the database with sample data
export async function GET() {
  try {
    // Skip database operations during build time
    if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true') {
      return NextResponse.json({
        success: true,
        message: 'Database initialization skipped during build time'
      });
    }

    const result = await initializeDatabase();
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
