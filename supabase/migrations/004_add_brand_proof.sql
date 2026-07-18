-- Alter audit_items table to add proof_photo_url column
ALTER TABLE audit_items ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;
