-- Drop existing policies
DROP POLICY IF EXISTS "teams_create_access" ON teams;
DROP POLICY IF EXISTS "team_members_join" ON team_members;

-- Create simplified team creation policy without recursion
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
  -- User must not be a team creator in this olympic
  AND NOT EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.olympic_id = olympic_id
    AND t.created_by = auth.uid()
  )
);

-- Create simplified team join policy without recursion
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
    -- Check olympic_id directly from teams table
    AND NOT EXISTS (
      SELECT 1
      FROM teams t1
      JOIN team_members tm ON tm.team_id = t1.id
      WHERE t1.olympic_id = (
        SELECT t2.olympic_id 
        FROM teams t2 
        WHERE t2.id = team_id
      )
      AND tm.player_id = auth.uid()
    )
  )
);