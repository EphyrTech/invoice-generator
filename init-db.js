const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initializeDatabase() {
  try {
    // Use environment variables for database connection
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/invoice_db';
    
    // Create postgres connection
    const client = new Client({ connectionString });
    await client.connect();
    
    // Read the SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the SQL
    await client.query(schemaSQL);
    
    console.log('Database initialized with SQL schema');
    
    // Close the connection
    await client.end();
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing database with SQL:', error);
    return { success: false, error };
  }
}

initializeDatabase().then(result => {
  if (result.success) {
    console.log('Database initialization completed successfully');
    process.exit(0);
  } else {
    console.error('Database initialization failed');
    process.exit(1);
  }
});
