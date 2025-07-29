import { Pool } from 'pg';

// Create a singleton database connection pool
let pool: Pool | null = null;

export function getDbPool() {
  // Skip database connection during build time (but not at runtime)
  if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true' && process.env.NODE_ENV !== 'production') {
    return null;
  }

  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.warn('DATABASE_URL not provided, skipping database connection');
      return null;
    }
    try {
      pool = new Pool({ connectionString });
      console.log('Database pool created successfully');
    } catch (error) {
      console.error('Failed to create database pool:', error);
      return null;
    }
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getDbPool();

  // Return empty array during build time or when database is not available
  if (!pool) {
    console.log('Database not available, returning empty result');
    return [];
  }

  try {
    const result = await pool.query(text, params);
    return result.rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
