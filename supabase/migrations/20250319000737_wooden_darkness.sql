/*
  # Fix Recursive Policies for Olympic Player Registration

  1. Changes
    - Remove recursive policy references
    - Simplify policy structure
    - Add clear registration deadline check
    - Maintain security model

  2. Security
    - Enable RLS on olympic_player table
    - Add policies for:
      - Read access for authenticated users
      - Self-registration before deadline
      - Full admin access
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can read olympic players" ON olympic_player;
DROP POLICY IF EXISTS "Users can register for olympics" ON olympic_player;
DROP POLICY IF EXISTS "Admins can manage olympic players" ON olympic_player;

-- Create new policies without recursion
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
  -- Users can only register themselves
  auth.uid() = player_id 
  AND 
  -- Check registration deadline directly
  EXISTS (
    SELECT 1 
    FROM olympic 
    WHERE id = olympic_id 
    AND registration_deadline >= CURRENT_TIMESTAMP
  )
);

CREATE POLICY "Admins can manage olympic players"
ON olympic_player
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);