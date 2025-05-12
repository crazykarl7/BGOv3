/*
  # Fix Olympic Player Registration Policy

  1. Changes
    - Add policy to allow users to register themselves for olympics
    - Keep existing policies for reading and admin management

  2. Security
    - Users can only register themselves
    - Registration only allowed before deadline
    - Maintain existing security model
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read olympic players" ON olympic_player;
DROP POLICY IF EXISTS "Admins can manage olympic players" ON olympic_player;
DROP POLICY IF EXISTS "Users can register for olympics" ON olympic_player;

-- Recreate policies with proper permissions
CREATE POLICY "Anyone can read olympic players"
ON olympic_player
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can register for olympics"
ON olympic_player
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only register themselves
  auth.uid() = player_id
  -- Registration must be open
  AND EXISTS (
    SELECT 1 FROM olympic
    WHERE olympic.id = olympic_id
    AND olympic.registration_deadline >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  )
);

CREATE POLICY "Admins can manage olympic players"
ON olympic_player
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);