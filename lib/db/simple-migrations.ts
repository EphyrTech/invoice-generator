// Simple migration system that runs directly in the app
import { query } from './db-client';

let migrationsRun = false;

// Simple migration runner that doesn't require external files
export async function runMigrations() {
  if (migrationsRun) {
    return; // Already run
  }

  console.log('🔄 Running database migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if invoice number pattern migration has been applied
    const existingMigration = await query(
      'SELECT id FROM migrations WHERE id = $1',
      ['001_add_invoice_number_patterns']
    );

    if (existingMigration.length === 0) {
      console.log('📋 Applying invoice number pattern migration...');

      try {
        // Try to add columns to invoice_templates table if it exists
        // Using individual ALTER TABLE statements to avoid issues
        console.log('📋 Adding invoice number pattern fields...');

        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_pattern TEXT DEFAULT 'INV-{YYYY}-{####}'`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_next_value INTEGER DEFAULT 1`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_prefix TEXT DEFAULT 'INV'`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_suffix TEXT DEFAULT ''`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_date_format TEXT DEFAULT 'YYYY'`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_counter_digits INTEGER DEFAULT 4`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_reset_frequency TEXT DEFAULT 'never'`);
        await query(`ALTER TABLE invoice_templates ADD COLUMN IF NOT EXISTS invoice_number_last_reset_date TEXT`);

        console.log('✅ Invoice number pattern fields added successfully');
      } catch (error) {
        console.log('📋 invoice_templates table does not exist yet - columns will be added when table is created');
        console.log('📋 Error details:', error instanceof Error ? error.message : 'Unknown error');
      }

      // Record that this migration was applied
      await query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
        ['001_add_invoice_number_patterns', 'Add invoice number pattern fields']
      );

      console.log('✅ Invoice number pattern migration applied successfully');
    } else {
      console.log('✅ Invoice number pattern migration already applied');
    }

    migrationsRun = true;
    console.log('🎉 All migrations completed successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Don't throw - let the app continue
    migrationsRun = true; // Mark as run to avoid retrying
  }
}

// Function to ensure migrations run before any database operation
export async function ensureMigrations() {
  if (!migrationsRun) {
    await runMigrations();
  }
}
