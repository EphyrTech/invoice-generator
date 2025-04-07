import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

export async function initializeDatabaseWithSQL() {
  try {
    // Use environment variables for database connection
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_db';
    
    // Create postgres connection
    const sql = postgres(connectionString, { max: 1 });
    
    // Read the SQL file
    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the SQL
    await sql.unsafe(schemaSQL);
    
    console.log('Database initialized with SQL schema');
    
    // Close the connection
    await sql.end();
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing database with SQL:', error);
    return { success: false, error };
  }
}
