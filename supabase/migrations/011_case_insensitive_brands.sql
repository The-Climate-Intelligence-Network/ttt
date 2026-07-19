-- Migration 011: Make brands case-insensitive and clean up duplicates
DO $$
DECLARE
    r RECORD;
    primary_id UUID;
    duplicate_id UUID;
BEGIN
    -- Loop through all names that have duplicates when lowercased
    FOR r IN 
        SELECT lower(name) as lower_name, count(*) 
        FROM brands 
        GROUP BY lower(name) 
        HAVING count(*) > 1
    LOOP
        -- Find the primary brand id (prefer non-custom, then by created_at ascending)
        SELECT id INTO primary_id 
        FROM brands 
        WHERE lower(name) = r.lower_name 
        ORDER BY is_custom ASC, created_at ASC 
        LIMIT 1;

        -- Loop through the other duplicate brand ids
        FOR duplicate_id IN 
            SELECT id 
            FROM brands 
            WHERE lower(name) = r.lower_name AND id <> primary_id
        LOOP
            -- 1. Update brands that have this duplicate as parent
            UPDATE brands 
            SET parent_id = primary_id 
            WHERE parent_id = duplicate_id;

            -- 2. Update audit_items that reference this duplicate
            DECLARE
                ai_rec RECORD;
                existing_ai_id UUID;
            BEGIN
                FOR ai_rec IN 
                    SELECT id, audit_id, count, proof_photo_url 
                    FROM audit_items 
                    WHERE brand_id = duplicate_id
                LOOP
                    -- Check if primary brand already has an audit_item in this audit
                    SELECT id INTO existing_ai_id 
                    FROM audit_items 
                    WHERE audit_id = ai_rec.audit_id AND brand_id = primary_id;

                    IF FOUND THEN
                        -- Merge counts and proof photo
                        UPDATE audit_items 
                        SET count = count + ai_rec.count,
                            proof_photo_url = COALESCE(proof_photo_url, ai_rec.proof_photo_url)
                        WHERE id = existing_ai_id;

                        -- Delete the duplicate audit_item
                        DELETE FROM audit_items WHERE id = ai_rec.id;
                    ELSE
                        -- Just update the brand_id to primary_id
                        UPDATE audit_items 
                        SET brand_id = primary_id 
                        WHERE id = ai_rec.id;
                    END IF;
                END FOR;
            END;

            -- 3. Finally, delete the duplicate brand
            DELETE FROM brands WHERE id = duplicate_id;
        END LOOP;
    END LOOP;
END $$;

-- Drop case-sensitive constraint and create case-insensitive unique index
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_name_key;
DROP INDEX IF EXISTS brands_name_lower_idx;
CREATE UNIQUE INDEX brands_name_lower_idx ON brands (lower(name));
