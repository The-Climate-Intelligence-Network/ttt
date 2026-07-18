-- Add parent_id to brands table to support sub-brands
ALTER TABLE brands 
ADD COLUMN parent_id UUID REFERENCES brands(id) ON DELETE SET NULL;
