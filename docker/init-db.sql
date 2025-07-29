-- Database initialization script for PostgreSQL
-- This ensures the database is ready for the application

-- Create database if it doesn't exist (PostgreSQL will handle this via POSTGRES_DB)
-- But we can ensure proper permissions and settings

-- Set timezone
SET timezone = 'UTC';

-- Ensure proper encoding
ALTER DATABASE invoice_db SET timezone TO 'UTC';

-- Grant necessary permissions to the user
GRANT ALL PRIVILEGES ON DATABASE invoice_db TO invoice_user;

-- Create extensions if needed (uncomment if required)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Log successful initialization
SELECT 'Database initialized successfully' as status;
