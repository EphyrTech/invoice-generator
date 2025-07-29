import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/invoice-schema';
import * as authSchema from './schema/auth-schema';

// Lazy database connection to avoid build-time connection attempts
let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  // Skip database connection during build time
  if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true') {
    throw new Error('Database not available during build time');
  }

  if (!_db || !_client) {
    const connectionString = process.env.DATABASE_URL || '';
    _client = postgres(connectionString, { max: 1 });
    _db = drizzle(_client, {
      schema: { ...schema, ...authSchema },
    });
  }
  return _db;
}

// Export the lazy database instance
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const dbInstance = getDb();
    return dbInstance[prop as keyof typeof dbInstance];
  }
});

// Run migrations (in development)
export const runMigrations = async () => {
  // Skip migrations during build time
  if (process.env.SKIP_BUILD_STATIC_GENERATION === 'true') {
    console.log('Skipping migrations during build time');
    return;
  }

  if (process.env.NODE_ENV === 'development') {
    try {
      console.log('Running migrations...');
      const connectionString = process.env.DATABASE_URL || '';
      const migrationClient = postgres(connectionString, { max: 1 });
      await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }
};
