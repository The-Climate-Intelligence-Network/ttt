-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter teams table to add event_id
ALTER TABLE teams ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Add unique constraint to teams for unique team name per event
ALTER TABLE teams ADD CONSTRAINT teams_name_event_id_key UNIQUE (name, event_id);

-- Enable Row Level Security (RLS) for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public select/insert/update/delete (public all) on events
CREATE POLICY "Allow public all on events" ON events FOR ALL USING (true) WITH CHECK (true);
