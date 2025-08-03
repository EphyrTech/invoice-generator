import { NextResponse } from 'next/server';
import { query } from '@/lib/db/db-client';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check basic database connectivity
    await query('SELECT 1');

    // Check if all required tables exist
    const tableChecks = [
      'users',
      'business_profiles', 
      'clients',
      'invoices',
      'invoice_items',
      'invoice_templates',
      'invoice_template_items'
    ];

    const tableResults = [];
    
    for (const tableName of tableChecks) {
      try {
        const result = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        const exists = result[0]?.exists || false;
        
        // If table exists, get row count
        let rowCount = 0;
        if (exists) {
          const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
          rowCount = parseInt(countResult[0]?.count || '0');
        }
        
        tableResults.push({
          table: tableName,
          exists,
          rowCount: exists ? rowCount : null
        });
      } catch (error) {
        tableResults.push({
          table: tableName,
          exists: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check if any critical tables are missing
    const missingTables = tableResults.filter(t => !t.exists);
    const isHealthy = missingTables.length === 0;

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'invoice-pdf',
        database: {
          connected: true,
          tables: tableResults,
          missingTables: missingTables.map(t => t.table),
          summary: `${tableResults.filter(t => t.exists).length}/${tableResults.length} tables exist`
        }
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'invoice-pdf',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown database error'
        }
      },
      { status: 503 }
    );
  }
}
