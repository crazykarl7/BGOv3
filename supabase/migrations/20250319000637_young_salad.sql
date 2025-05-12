/*
  # Fix Recursive Policies

  1. Changes
    - Remove recursive policy references
    - Simplify policy structure
    - Maintain security model

  2. Security
    - Users can only register themselves
    - Registration only allowed before deadline
    - Admins maintain full control
    - Everyone can read registrations
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read olympic players" ON olympic_player;
DROP POLICY IF EXISTS "Users can register for olympics" ON olympic_player;
DROP POLICY IF EXISTS "Admins can manage olympic players" ON olympic_player;

-- Create simplified policies
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
  -- Registration must be open (using direct timestamp comparison)
  AND EXISTS (
    SELECT 1 
    FROM olympic 
    WHERE olympic.id = olympic_id 
    AND olympic.registration_deadline >= CURRENT_TIMESTAMP
  )
);

-- Admin policy for full access
CREATE POLICY "Admins can manage olympic players"
ON olympic_player
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);