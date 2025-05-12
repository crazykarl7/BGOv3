/*
  # Restrict Team Membership

  1. Changes
    - Update team_members policies to enforce single team per olympic rule
    - Add check constraints to prevent multiple team memberships
    - Update team creation policy to check existing memberships

  2. Security
    - Users can only be on one team per olympic
    - Maintain existing admin access
    - Keep other security rules intact
*/

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "team_members_join" ON team_members;
DROP POLICY IF EXISTS "teams_create_access" ON teams;

-- Update teams creation policy to check for existing team membership
CREATE POLICY "teams_create_access"
ON teams
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the creator
  created_by = auth.uid()
  -- User must be registered for the olympic
  AND EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = olympic_id
    AND olympic_player.player_id = auth.uid()
  )
  -- User must not be in another team in this olympic
  AND NOT EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE t.olympic_id = olympic_id
    AND tm.player_id = auth.uid()
  )
);

-- Update team members join policy
CREATE POLICY "team_members_join"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to manage team members
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
  OR
  (
    -- User must be joining themselves or be the team creator
    (
      player_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE id = team_id
        AND created_by = auth.uid()
      )
    )
    -- Player must not be in another team in the same olympic
    AND NOT EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      JOIN teams current_team ON current_team.id = team_id
      WHERE tm.player_id = player_id
      AND t.olympic_id = current_team.olympic_id
    )
  )
);