-- Add invoice number pattern fields to invoice_templates table
-- This migration adds the new fields for automatic invoice number generation

-- Add the new columns to invoice_templates table
ALTER TABLE invoice_templates 
ADD COLUMN IF NOT EXISTS invoice_number_pattern TEXT DEFAULT 'INV-{YYYY}-{####}',
ADD COLUMN IF NOT EXISTS invoice_number_next_value INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS invoice_number_prefix TEXT DEFAULT 'INV',
ADD COLUMN IF NOT EXISTS invoice_number_suffix TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS invoice_number_date_format TEXT DEFAULT 'YYYY',
ADD COLUMN IF NOT EXISTS invoice_number_counter_digits INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS invoice_number_reset_frequency TEXT DEFAULT 'never',
ADD COLUMN IF NOT EXISTS invoice_number_last_reset_date TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN invoice_templates.invoice_number_pattern IS 'Pattern for generating invoice numbers (e.g., INV-{YYYY}-{####})';
COMMENT ON COLUMN invoice_templates.invoice_number_next_value IS 'Next number to use in the sequence';
COMMENT ON COLUMN invoice_templates.invoice_number_prefix IS 'Prefix for invoice numbers';
COMMENT ON COLUMN invoice_templates.invoice_number_suffix IS 'Suffix for invoice numbers';
COMMENT ON COLUMN invoice_templates.invoice_number_date_format IS 'Date format to use in patterns';
COMMENT ON COLUMN invoice_templates.invoice_number_counter_digits IS 'Number of digits for the counter';
COMMENT ON COLUMN invoice_templates.invoice_number_reset_frequency IS 'How often to reset the counter (never, yearly, monthly, daily)';
COMMENT ON COLUMN invoice_templates.invoice_number_last_reset_date IS 'Last date when the counter was reset';
