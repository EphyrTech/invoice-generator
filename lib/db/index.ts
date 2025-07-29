import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/invoice-schema';
import * as authSchema from './schema/auth-schema';

// Use environment variables for database connection
const connectionString = process.env.DATABASE_URL || '';

// Create postgres connection only if not in build mode
let client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

if (process.env.SKIP_BUILD_STATIC_GENERATION !== 'true') {
  client = postgres(connectionString, { max: 1 });
  _db = drizzle(client, {
    schema: { ...schema, ...authSchema },
  });
}

// Create a mock database for build time
const mockDb = {
  query: {
    users: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
    },
    businessProfiles: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
    },
    clients: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
    },
    invoices: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
    },
    invoiceTemplates: {
      findMany: () => Promise.resolve([]),
      findFirst: () => Promise.resolve(null),
    },
  },
  select: () => ({ from: () => Promise.resolve([]) }),
  insert: () => ({ values: () => Promise.resolve([]) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
  delete: () => ({ where: () => Promise.resolve([]) }),
} as any;

// Export the database instance
export const db = process.env.SKIP_BUILD_STATIC_GENERATION === 'true' ? mockDb : _db!;

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
      const migrationClient = postgres(connectionString, { max: 1 });
      await migrate(drizzle(migrationClient), { migrationsFolder: './drizzle' });
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  }
};
