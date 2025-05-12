/*
  # Fix Team RLS Policies

  1. Changes
    - Simplify RLS policies to prevent recursion
    - Create separate admin and user policies
    - Remove complex subqueries
    - Maintain same security model with simpler implementation

  2. Security
    - Admins have full access
    - Users can only access teams in their olympics
    - Team creators can manage their teams
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view teams in their olympics" ON teams;
DROP POLICY IF EXISTS "Users can create teams in their olympics" ON teams;
DROP POLICY IF EXISTS "Team creators can update their teams" ON teams;
DROP POLICY IF EXISTS "Team creators can delete their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams in their olympics" ON team_members;
DROP POLICY IF EXISTS "Team creators can remove members" ON team_members;
DROP POLICY IF EXISTS "Users can view team event assignments" ON team_event_assignments;
DROP POLICY IF EXISTS "Team creators can manage event assignments" ON team_event_assignments;

-- Teams policies
CREATE POLICY "admin_access_teams"
ON teams
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "view_teams"
ON teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = teams.olympic_id
    AND olympic_player.player_id = auth.uid()
  )
);

CREATE POLICY "create_teams"
ON teams
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = olympic_id
    AND olympic_player.player_id = auth.uid()
  )
);

CREATE POLICY "manage_own_teams"
ON teams
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "delete_own_teams"
ON teams
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Team members policies
CREATE POLICY "admin_access_team_members"
ON team_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "view_team_members"
ON team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "join_team"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  player_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
    AND created_by = auth.uid()
  )
);

CREATE POLICY "leave_team"
ON team_members
FOR DELETE
TO authenticated
USING (
  player_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
    AND created_by = auth.uid()
  )
);

-- Team event assignments policies
CREATE POLICY "admin_access_team_assignments"
ON team_event_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
);

CREATE POLICY "view_team_assignments"
ON team_event_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "manage_team_assignments"
ON team_event_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
    AND created_by = auth.uid()
  )
  AND locked_at IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_id
    AND created_by = auth.uid()
  )
  AND locked_at IS NULL
);