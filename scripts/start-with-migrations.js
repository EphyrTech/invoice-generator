#!/usr/bin/env node

// Startup script that runs database migrations before starting the Next.js app
const { spawn } = require('child_process');

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  return new Promise((resolve) => {
    // Run migrations using tsx
    const migrationProcess = spawn('npx', ['tsx', 'lib/db/run-migrations.ts'], {
      stdio: 'inherit',
      env: process.env
    });

    migrationProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database migrations completed');
      } else {
        console.error('❌ Migration failed with code:', code);
        console.log('⚠️ Continuing with app startup despite migration issues');
      }
      resolve();
    });

    migrationProcess.on('error', (error) => {
      console.error('❌ Migration error:', error);
      console.log('⚠️ Continuing with app startup despite migration issues');
      resolve();
    });
  });
}

async function startApp() {
  console.log('🚀 Starting Next.js application...');

  // Start the Next.js app using the standalone server
  const nextStart = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env
  });
  
  nextStart.on('error', (error) => {
    console.error('Failed to start Next.js app:', error);
    process.exit(1);
  });
  
  nextStart.on('close', (code) => {
    console.log(`Next.js app exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    nextStart.kill('SIGTERM');
  });
  
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    nextStart.kill('SIGINT');
  });
}

async function main() {
  try {
    // Run migrations first
    await runMigrations();
    
    // Then start the app
    await startApp();
  } catch (error) {
    console.error('Startup failed:', error);
    process.exit(1);
  }
}

// Run the startup sequence
main();
