import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema/*',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_db',
  },
} satisfies Config;
