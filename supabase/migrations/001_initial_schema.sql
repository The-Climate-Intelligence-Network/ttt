-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure brands table has a unique constraint on name (in case the table already existed without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'brands_name_key'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_name_key UNIQUE (name);
  END IF;
END $$;

-- Insert default brands provided by user
INSERT INTO brands (name) VALUES 
  ('Coca-Cola'),
  ('Pepsi'),
  ('Nestlé'),
  ('Maliban'),
  ('Milo'),
  ('Unilever'),
  ('Munchee'),
  ('Cargills'),
  ('Keells'),
  ('Elephant House'),
  ('Kotmale'),
  ('Lion Brewery'),
  ('Marlborough')
ON CONFLICT (name) DO NOTHING;

-- Create audits table
-- status can be 'in_progress' or 'completed'
CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create audit_items table
CREATE TABLE IF NOT EXISTS audit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(audit_id, brand_id)
);

-- Enable Row Level Security (RLS) but allow anonymous inserts/updates since we don't have auth for users.
-- In a real production app with auth, we would restrict this. 
-- For this prototype, we'll allow all operations on these tables for anon role.
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on brands" ON brands;
CREATE POLICY "Allow public select on brands" ON brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on brands" ON brands;
CREATE POLICY "Allow public insert on brands" ON brands FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on teams" ON teams;
CREATE POLICY "Allow public all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on audits" ON audits;
CREATE POLICY "Allow public all on audits" ON audits FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public all on audit_items" ON audit_items;
CREATE POLICY "Allow public all on audit_items" ON audit_items FOR ALL USING (true) WITH CHECK (true);
