-- Migration 012: Add Scan Products brand and its sub-brands
-- 1. Insert parent brand Scan Products
INSERT INTO brands (name) VALUES ('Scan Products') ON CONFLICT (lower(name)) DO NOTHING;

-- 2. Insert child brands referencing parent Scan Products
DO $$
DECLARE
  parent_uuid UUID;
BEGIN
  SELECT id INTO parent_uuid FROM brands WHERE lower(name) = 'scan products';
  
  IF parent_uuid IS NOT NULL THEN
    INSERT INTO brands (name, parent_id) VALUES
      ('Sunquick', parent_uuid),
      ('Scan Jumbo Peanuts', parent_uuid),
      ('Scan Bottled Water', parent_uuid),
      ('Scan Jack Mackerel', parent_uuid),
      ('N-Joy Coconut Oil', parent_uuid),
      ('Ocean Fresh', parent_uuid),
      ('Kotagala Kahata', parent_uuid),
      ('Star', parent_uuid),
      ('Delish', parent_uuid),
      ('Forest Farm', parent_uuid),
      ('KVC', parent_uuid),
      ('Ovaltine', parent_uuid)
    ON CONFLICT (lower(name)) DO NOTHING;
  END IF;
END $$;
