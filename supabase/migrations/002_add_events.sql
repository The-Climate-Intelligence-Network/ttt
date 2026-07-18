-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter teams table to add event_id (checks if column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name='teams' AND column_name='event_id'
  ) THEN
    ALTER TABLE teams ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add unique constraint to teams for unique team name per event (checks if constraint exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'teams_name_event_id_key'
  ) THEN
    ALTER TABLE teams ADD CONSTRAINT teams_name_event_id_key UNIQUE (name, event_id);
  END IF;
END $$;

-- Enable Row Level Security (RLS) for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow public select/insert/update/delete (public all) on events (safely replaces policy)
DROP POLICY IF EXISTS "Allow public all on events" ON events;
CREATE POLICY "Allow public all on events" ON events FOR ALL USING (true) WITH CHECK (true);
