/*
  # Fix Olympic Player RLS and Policies

  1. Changes
    - Enable RLS on olympic_player table
    - Add comprehensive policies for all operations
    - Fix policy structure to prevent recursion
    - Separate policies by operation type

  2. Security
    - Enable RLS
    - Policies for:
      - SELECT: All authenticated users can view
      - INSERT: Users can register before deadline
      - UPDATE/DELETE: Admin only
*/

-- First ensure RLS is enabled
ALTER TABLE olympic_player ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read olympic players" ON olympic_player;
DROP POLICY IF EXISTS "Users can register for olympics" ON olympic_player;
DROP POLICY IF EXISTS "Admins can manage olympic players" ON olympic_player;

-- Read policy - Anyone authenticated can read
CREATE POLICY "Anyone can read olympic players"
ON olympic_player
FOR SELECT
TO authenticated
USING (true);

-- Registration policy - Users can register themselves before deadline
CREATE POLICY "Users can register for olympics"
ON olympic_player
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = player_id 
  AND 
  EXISTS (
    SELECT 1 
    FROM olympic 
    WHERE olympic.id = olympic_id 
    AND olympic.registration_deadline >= CURRENT_TIMESTAMP
  )
);

-- Admin management policies - Separate by operation
CREATE POLICY "Admins can insert olympic players"
ON olympic_player
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update olympic players"
ON olympic_player
FOR UPDATE
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

CREATE POLICY "Admins can delete olympic players"
ON olympic_player
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);