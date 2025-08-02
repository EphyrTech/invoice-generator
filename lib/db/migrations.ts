// Database migration system
import { query } from './db-client';
import fs from 'fs';
import path from 'path';

interface Migration {
  id: string;
  name: string;
  sql: string;
  applied_at?: Date;
}

// Create migrations table if it doesn't exist
async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

// Get list of applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  try {
    const result = await query('SELECT id FROM migrations ORDER BY applied_at');
    return result.map((row: any) => row.id);
  } catch (error) {
    console.log('Migrations table does not exist yet, will create it');
    return [];
  }
}

// Apply a single migration
async function applyMigration(migration: Migration) {
  console.log(`Applying migration: ${migration.id} - ${migration.name}`);
  
  try {
    // Execute the migration SQL
    await query(migration.sql);
    
    // Record that this migration was applied
    await query(
      'INSERT INTO migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
    
    console.log(`✅ Migration ${migration.id} applied successfully`);
  } catch (error) {
    console.error(`❌ Failed to apply migration ${migration.id}:`, error);
    throw error;
  }
}

// Get all migration files
function getMigrationFiles(): Migration[] {
  const migrationsDir = path.join(process.cwd(), 'lib/db/migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order
  
  return files.map(file => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const id = file.replace('.sql', '');
    const name = id.replace(/^\d+_/, '').replace(/_/g, ' ');
    
    return { id, name, sql };
  });
}

// Run all pending migrations
export async function runMigrations() {
  console.log('🔄 Checking for database migrations...');
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable();
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Get all migration files
    const allMigrations = getMigrationFiles();
    
    // Find pending migrations
    const pendingMigrations = allMigrations.filter(
      migration => !appliedMigrations.includes(migration.id)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pendingMigrations.length} pending migration(s)`);
    
    // Apply each pending migration
    for (const migration of pendingMigrations) {
      await applyMigration(migration);
    }
    
    console.log('🎉 All migrations applied successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

// Initialize database with base schema if no migrations exist
export async function initializeDatabase() {
  console.log('🔄 Initializing database...');
  
  try {
    // Check if any tables exist
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name != 'migrations'
    `);
    
    if (result.length > 0) {
      console.log('✅ Database already initialized');
      return;
    }
    
    console.log('📋 No tables found, applying base schema...');
    
    // Read and apply the base schema
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await query(schemaSql);
      console.log('✅ Base schema applied successfully');
    } else {
      console.log('⚠️ No schema.sql file found, skipping base schema');
    }
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    throw error;
  }
}

// Main function to run on app startup
export async function runDatabaseSetup() {
  console.log('🚀 Starting database setup...');
  
  try {
    // First, initialize database with base schema if needed
    await initializeDatabase();
    
    // Then run any pending migrations
    await runMigrations();
    
    console.log('✅ Database setup completed successfully');
    
  } catch (error) {
    console.error('💥 Database setup failed:', error);
    // Don't throw here - let the app start even if migrations fail
    // This prevents the app from crashing on startup
    console.error('⚠️ App will continue but database may be in inconsistent state');
  }
}
