-- Migration 006: Add Event Details

-- 1. Alter events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS is_multi_location BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS locations JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Alter teams table
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS location TEXT;

