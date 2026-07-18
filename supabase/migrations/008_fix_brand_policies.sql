-- Fix policies for brands table to allow UPDATE and DELETE for admins
DROP POLICY IF EXISTS "Allow public update on brands" ON brands;
CREATE POLICY "Allow public update on brands" ON brands FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete on brands" ON brands;
CREATE POLICY "Allow public delete on brands" ON brands FOR DELETE USING (true);
