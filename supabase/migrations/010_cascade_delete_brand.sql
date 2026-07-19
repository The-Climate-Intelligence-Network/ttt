-- Drop existing foreign key constraint on audit_items if it exists
ALTER TABLE audit_items 
DROP CONSTRAINT IF EXISTS audit_items_brand_id_fkey;

-- Re-create the foreign key constraint with ON DELETE CASCADE
ALTER TABLE audit_items 
ADD CONSTRAINT audit_items_brand_id_fkey 
FOREIGN KEY (brand_id) 
REFERENCES brands(id) 
ON DELETE CASCADE;
