/*
  # Fix Olympic Visibility Policy

  1. Changes
    - Update RLS policy for olympic table to fix visibility issues
    - Ensure registration_deadline comparison handles timezone correctly

  2. Security
    - Maintain existing security model while fixing visibility
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read olympics" ON olympic;
DROP POLICY IF EXISTS "Admins can manage olympics" ON olympic;

-- Create updated policies
CREATE POLICY "Anyone can read olympics"
ON olympic
FOR SELECT
TO authenticated
USING (
  -- Users can see olympics if:
  -- 1. They are registered for it
  -- 2. Registration is still open (using timezone-aware comparison)
  -- 3. They are an admin
  EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = id
    AND olympic_player.player_id = auth.uid()
  )
  OR registration_deadline >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Recreate admin management policy
CREATE POLICY "Admins can manage olympics"
ON olympic
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Update the default registration deadline function to use UTC
CREATE OR REPLACE FUNCTION set_default_registration_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_deadline IS NULL THEN
    -- Set default deadline to 1 day before the event at 23:59:59 UTC
    NEW.registration_deadline := (NEW.date - INTERVAL '1 day' + INTERVAL '23 hours 59 minutes 59 seconds') AT TIME ZONE 'UTC';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;