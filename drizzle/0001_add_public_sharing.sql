-- Add public sharing columns to invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_logo_public BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_status_public BOOLEAN DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_theme TEXT DEFAULT 'clean';

-- Add default sharing settings to business_profiles
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_show_logo BOOLEAN DEFAULT false;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_show_status BOOLEAN DEFAULT false;
ALTER TABLE business_profiles ADD COLUMN IF NOT EXISTS default_pdf_theme TEXT DEFAULT 'clean';
