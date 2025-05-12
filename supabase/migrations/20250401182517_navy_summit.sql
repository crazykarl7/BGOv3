/*
  # Update Team Policies

  1. Changes
    - Drop existing policies
    - Create new policies for teams, team members, and team event assignments
    - Fix policy naming conflicts
    - Ensure proper access control

  2. Security
    - Maintain admin access
    - Allow team creation by registered players
    - Control team membership
    - Manage event assignments
*/

-- Drop all existing policies to start fresh
DO $$ 
BEGIN
  -- Drop teams policies
  DROP POLICY IF EXISTS "admin_access_teams" ON teams;
  DROP POLICY IF EXISTS "view_teams" ON teams;
  DROP POLICY IF EXISTS "create_teams" ON teams;
  DROP POLICY IF EXISTS "manage_own_teams" ON teams;
  DROP POLICY IF EXISTS "delete_own_teams" ON teams;
  
  -- Drop team members policies
  DROP POLICY IF EXISTS "admin_access_team_members" ON teams;
  DROP POLICY IF EXISTS "view_team_members" ON team_members;
  DROP POLICY IF EXISTS "join_team" ON team_members;
  DROP POLICY IF EXISTS "leave_team" ON team_members;
  
  -- Drop team event assignments policies
  DROP POLICY IF EXISTS "admin_access_team_assignments" ON team_event_assignments;
  DROP POLICY IF EXISTS "view_team_assignments" ON team_event_assignments;
  DROP POLICY IF EXISTS "manage_team_assignments" ON team_event_assignments;
END $$;

-- Create new policies with unique names
CREATE POLICY "teams_admin_access"
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

CREATE POLICY "teams_view_access"
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

CREATE POLICY "teams_create_access"
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

CREATE POLICY "teams_update_own"
ON teams
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "teams_delete_own"
ON teams
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Team members policies
CREATE POLICY "team_members_admin_access"
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

CREATE POLICY "team_members_view"
ON team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "team_members_join"
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

CREATE POLICY "team_members_leave"
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
CREATE POLICY "team_assignments_admin_access"
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

CREATE POLICY "team_assignments_view"
ON team_event_assignments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "team_assignments_manage"
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