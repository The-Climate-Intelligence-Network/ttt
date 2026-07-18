-- Explicitly set policies to allow updating and deleting events
DROP POLICY IF EXISTS "Allow public all on events" ON events;

CREATE POLICY "Allow public select on events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on events" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on events" ON events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on events" ON events FOR DELETE USING (true);
