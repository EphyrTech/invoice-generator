import { Pool } from 'pg';

// Create a singleton database connection pool
let pool: Pool | null = null;

export function getDbPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_db';
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getDbPool();
  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
