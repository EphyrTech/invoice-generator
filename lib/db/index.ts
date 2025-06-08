import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/invoice-schema';
import * as authSchema from './schema/auth-schema';

// Use environment variables for database connection
const connectionString = process.env.DATABASE_URL || '';

// Create postgres connection
const client = postgres(connectionString, { max: 1 });
const migrationClient = postgres(connectionString, { max: 1 });

// Create drizzle database instance with query capability
export const db = drizzle(client, {
  schema: { ...schema, ...authSchema },
});

// Run migrations (in development)
export const runMigrations = async () => {
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Running migrations...');
      await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }
};
