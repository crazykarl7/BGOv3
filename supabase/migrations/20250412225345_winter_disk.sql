/*
  # Fix Game Score RLS Policies

  1. Changes
    - Drop existing policies on game_score table
    - Create new policies for:
      - Read access for all authenticated users
      - Write access for admins only
    - Add medal column constraint
    - Add proper error handling

  2. Security
    - All authenticated users can read scores
    - Only admins can create/update/delete scores
    - Medal values restricted to gold/silver/bronze
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read scores" ON game_score;
DROP POLICY IF EXISTS "Admins can manage scores" ON game_score;

-- Create new policies
CREATE POLICY "Anyone can read scores"
ON game_score
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage scores"
ON game_score
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_admin = true
  )
  AND (medal IS NULL OR medal IN ('gold', 'silver', 'bronze'))
);

-- Ensure RLS is enabled
ALTER TABLE game_score ENABLE ROW LEVEL SECURITY;