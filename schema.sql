-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified TIMESTAMP,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  session_token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Create verification tokens table
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

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal REAL NOT NULL DEFAULT 0,
  tax_rate REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_rate REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  currency TEXT DEFAULT 'USD',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT,
  next_issue_date TEXT,
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

-- Create invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_profile_id TEXT NOT NULL REFERENCES business_profiles(id) ON DELETE RESTRICT,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  invoice_number TEXT,
  issue_date TEXT,
  due_date TEXT,
  status TEXT DEFAULT 'draft',
  tax_rate REAL DEFAULT 0,
  discount_rate REAL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  currency TEXT DEFAULT 'USD',
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
  tax_rate REAL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
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

-- Insert a default business profile
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

-- Insert a default client
INSERT INTO clients (id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, is_business_profile, business_profile_id, created_at, updated_at)
SELECT 
  'client-1', 
  'user-1', 
  'Client Company', 
  'contact@clientcompany.com', 
  '+1 (555) 987-6543', 
  '456 Client Ave', 
  'City', 
  'State', 
  '54321', 
  'USA', 
  '987654321', 
  FALSE, 
  NULL, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 'client-1');

-- Insert a client that is also a business profile
INSERT INTO clients (id, user_id, name, email, phone, address, city, state, postal_code, country, tax_id, is_business_profile, business_profile_id, created_at, updated_at)
SELECT 
  'client-2', 
  'user-1', 
  'My Company (as Client)', 
  'info@mycompany.com', 
  '+1 (555) 123-4567', 
  '123 Business St', 
  'City', 
  'State', 
  '12345', 
  'USA', 
  '123456789', 
  TRUE, 
  'bp-1', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE id = 'client-2');

-- Insert a sample invoice
INSERT INTO invoices (id, user_id, business_profile_id, client_id, invoice_number, issue_date, due_date, status, subtotal, tax_rate, tax_amount, total, notes, terms, currency, created_at, updated_at)
SELECT 
  'inv-1', 
  'user-1', 
  'bp-1', 
  'client-1', 
  'INV-001', 
  '2023-04-01', 
  '2023-05-01', 
  'paid', 
  1200, 
  10, 
  120, 
  1320, 
  'Thank you for your business!', 
  'Payment due within 30 days.', 
  'USD', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE id = 'inv-1');

-- Insert invoice items
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount, created_at, updated_at)
SELECT 
  'item-1', 
  'inv-1', 
  'Consulting Services', 
  10, 
  100, 
  1000, 
  10, 
  100, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM invoice_items WHERE id = 'item-1');

INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount, tax_rate, tax_amount, created_at, updated_at)
SELECT 
  'item-2', 
  'inv-1', 
  'Software License', 
  1, 
  200, 
  200, 
  10, 
  20, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM invoice_items WHERE id = 'item-2');

-- Insert a sample invoice template
INSERT INTO invoice_templates (id, user_id, name, business_profile_id, client_id, invoice_number, tax_rate, notes, terms, currency, created_at, updated_at)
SELECT 
  'template-1', 
  'user-1', 
  'Monthly Consulting Services', 
  'bp-1', 
  'client-1', 
  'INV-{YEAR}{MONTH}-{NUMBER}', 
  10, 
  'Thank you for your business!', 
  'Payment due within 30 days.', 
  'USD', 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM invoice_templates WHERE id = 'template-1');

-- Insert template items
INSERT INTO invoice_template_items (id, template_id, description, quantity, unit_price, tax_rate, created_at, updated_at)
SELECT 
  'template-item-1', 
  'template-1', 
  'Consulting Services', 
  10, 
  100, 
  10, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM invoice_template_items WHERE id = 'template-item-1');
