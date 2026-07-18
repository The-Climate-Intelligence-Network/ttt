-- Alter audits table to add before and after photo URLs
ALTER TABLE audits ADD COLUMN IF NOT EXISTS before_photo_url TEXT;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS after_photo_url TEXT;
