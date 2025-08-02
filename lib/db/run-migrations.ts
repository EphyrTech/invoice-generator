#!/usr/bin/env tsx

// Script to run database migrations
import { runDatabaseSetup } from './migrations';

async function main() {
  try {
    await runDatabaseSetup();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
