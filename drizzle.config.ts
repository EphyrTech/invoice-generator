import type { Config } from 'drizzle-kit';

// Read DATABASE_URL from .env file or environment variables
var databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_db';

export default {
  schema: './src/lib/db/schema/*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: databaseUrl,
  },
} satisfies Config;
