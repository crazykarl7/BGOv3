/*
  # Add registration deadline to olympics

  1. Changes
    - Add registration_deadline column to olympic table
    - Update RLS policies to handle registration visibility
    - Add index for better query performance

  2. Security
    - Update policies to handle registration deadline visibility
*/

-- Add registration_deadline column
ALTER TABLE olympic
ADD COLUMN IF NOT EXISTS registration_deadline timestamptz;

-- Add index for registration deadline queries
CREATE INDEX IF NOT EXISTS idx_olympic_registration_deadline 
ON olympic(registration_deadline);

-- Update olympic policies
DROP POLICY IF EXISTS "Anyone can read olympics" ON olympic;

CREATE POLICY "Anyone can read olympics"
ON olympic
FOR SELECT
TO authenticated
USING (
  -- Users can see olympics if:
  -- 1. They are registered for it
  -- 2. Registration is still open
  -- 3. They are an admin
  EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = id
    AND olympic_player.player_id = auth.uid()
  )
  OR registration_deadline >= CURRENT_TIMESTAMP
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can manage olympics"
ON olympic
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Add function to automatically set registration deadline if not provided
CREATE OR REPLACE FUNCTION set_default_registration_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_deadline IS NULL THEN
    NEW.registration_deadline := NEW.date - INTERVAL '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to set default registration deadline
DROP TRIGGER IF EXISTS set_olympic_registration_deadline ON olympic;
CREATE TRIGGER set_olympic_registration_deadline
  BEFORE INSERT OR UPDATE ON olympic
  FOR EACH ROW
  EXECUTE FUNCTION set_default_registration_deadline();