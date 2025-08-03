-- Production Database Initialization Script
-- Run this script to ensure all required tables exist

-- Set timezone
SET timezone = 'UTC';

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table for NextAuth
CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Create verification tokens table for NextAuth
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Create business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  tax_id TEXT,
  logo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  tax_id TEXT,
  notes TEXT,
  is_business_profile BOOLEAN DEFAULT FALSE,
  business_profile_id TEXT REFERENCES business_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  business_profile_id TEXT REFERENCES business_profiles(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  due_days INTEGER DEFAULT 30,
  tax_rate REAL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  invoice_number_pattern TEXT DEFAULT 'INV-{YYYY}-{####}',
  invoice_number_next_value INTEGER DEFAULT 1,
  invoice_number_prefix TEXT DEFAULT 'INV',
  invoice_number_suffix TEXT DEFAULT '',
  invoice_number_date_format TEXT DEFAULT 'YYYY',
  invoice_number_counter_digits INTEGER DEFAULT 4,
  invoice_number_reset_frequency TEXT DEFAULT 'never',
  invoice_number_last_reset_date TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  business_profile_id TEXT REFERENCES business_profiles(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  template_id TEXT REFERENCES invoice_templates(id) ON DELETE SET NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create invoice template items table
CREATE TABLE IF NOT EXISTS invoice_template_items (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES invoice_templates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default user if none exists
INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
SELECT 
  'user-1', 
  'Demo User', 
  'demo@example.com', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Insert a default business profile if none exists
INSERT INTO business_profiles (id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, created_at, updated_at)
SELECT 
  'bp-1', 
  'user-1', 
  'My Company', 
  'info@mycompany.com', 
  '+1 (555) 123-4567', 
  '123 Business St', 
  'City', 
  'State', 
  '12345', 
  'USA', 
  '123456789', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM business_profiles LIMIT 1);

-- Insert a default client if none exists
INSERT INTO clients (id, user_id, name, email, phone, address, city, state, postal_code, country, created_at, updated_at)
SELECT 
  'client-1', 
  'user-1', 
  'Sample Client', 
  'client@example.com', 
  '+1 (555) 987-6543', 
  '456 Client Ave', 
  'Client City', 
  'Client State', 
  '67890', 
  'USA', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM clients LIMIT 1);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_profile_id ON invoices(business_profile_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_user_id ON invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_template_items_template_id ON invoice_template_items(template_id);

-- Display success message
SELECT 'Database initialization completed successfully!' as message;
