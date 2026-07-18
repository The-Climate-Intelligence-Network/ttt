-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create brands table
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  ('Marlborough');

-- Create audits table
-- status can be 'in_progress' or 'completed'
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create audit_items table
CREATE TABLE audit_items (
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

CREATE POLICY "Allow public select on brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Allow public insert on brands" ON brands FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public all on teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on audits" ON audits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all on audit_items" ON audit_items FOR ALL USING (true) WITH CHECK (true);
