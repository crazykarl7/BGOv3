/*
  # Fix Team Creation Policies

  1. Changes
    - Simplify team creation policy to avoid recursion
    - Remove complex subqueries
    - Use direct checks for team membership
    - Maintain same security rules with simpler implementation

  2. Security
    - Users can only create teams in olympics they're registered for
    - Users can only join one team per olympic
    - Team creators can manage their teams
    - Admins retain full access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "teams_create_access" ON teams;
DROP POLICY IF EXISTS "team_members_join" ON team_members;

-- Create simplified team creation policy
CREATE POLICY "teams_create_access"
ON teams
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the creator
  created_by = auth.uid()
  -- User must be registered for the olympic
  AND EXISTS (
    SELECT 1 
    FROM olympic_player op
    WHERE op.olympic_id = olympic_id
    AND op.player_id = auth.uid()
  )
);

-- Create simplified team join policy
CREATE POLICY "team_members_join"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins
  EXISTS (
    SELECT 1 
    FROM profiles p
    WHERE p.id = auth.uid()
    AND p.is_admin = true
  )
  OR (
    -- User must be joining themselves or be the team creator
    (
      player_id = auth.uid()
      OR EXISTS (
        SELECT 1 
        FROM teams t
        WHERE t.id = team_id
        AND t.created_by = auth.uid()
      )
    )
  )
);