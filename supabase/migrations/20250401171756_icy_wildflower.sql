/*
  # Fix Team Tables Migration

  1. Changes
    - Drop policies before dropping tables
    - Recreate tables and policies in correct order
    - Add proper constraints and indexes
    - Enable RLS with proper policies

  2. Security
    - Enable RLS on all tables
    - Add policies for team management
    - Add policies for team membership
    - Add policies for event assignments
*/

-- First drop all policies to avoid dependency issues
DROP POLICY IF EXISTS "Users can create teams in their olympics" ON teams;
DROP POLICY IF EXISTS "Users can view teams in their olympics" ON teams;
DROP POLICY IF EXISTS "Team creators can update their teams" ON teams;
DROP POLICY IF EXISTS "Team creators can delete their teams" ON teams;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Users can join teams in their olympics" ON team_members;
DROP POLICY IF EXISTS "Team creators can remove members" ON team_members;
DROP POLICY IF EXISTS "Users can view team event assignments" ON team_event_assignments;
DROP POLICY IF EXISTS "Team creators can manage event assignments" ON team_event_assignments;

-- Now drop tables in correct order
DROP TABLE IF EXISTS team_event_assignments;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS teams;

-- Create teams table
CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  olympic_id uuid NOT NULL REFERENCES olympic(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(name, olympic_id)
);

-- Create team_members table
CREATE TABLE team_members (
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (team_id, player_id)
);

-- Create team_event_assignments table
CREATE TABLE team_event_assignments (
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES event(id) ON DELETE CASCADE,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  locked_at timestamptz,
  PRIMARY KEY (team_id, event_id, player_id)
);

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_event_assignments ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view teams in their olympics"
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

CREATE POLICY "Users can create teams in their olympics"
ON teams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM olympic_player
    WHERE olympic_player.olympic_id = olympic_id
    AND olympic_player.player_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM team_members
    JOIN teams t ON t.id = team_members.team_id
    WHERE t.olympic_id = olympic_id
    AND team_members.player_id = auth.uid()
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Team creators can update their teams"
ON teams
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team creators can delete their teams"
ON teams
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Team members policies
CREATE POLICY "Users can view team members"
ON team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    JOIN olympic_player ON olympic_player.olympic_id = teams.olympic_id
    WHERE teams.id = team_members.team_id
    AND olympic_player.player_id = auth.uid()
  )
);

CREATE POLICY "Users can join teams in their olympics"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    JOIN olympic_player ON olympic_player.olympic_id = teams.olympic_id
    WHERE teams.id = team_id
    AND olympic_player.player_id = auth.uid()
  )
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN teams current_team ON current_team.id = team_id
    WHERE tm.player_id = player_id
    AND t.olympic_id = current_team.olympic_id
  )
  AND (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams
      WHERE teams.id = team_id
      AND teams.created_by = auth.uid()
    )
  )
);

CREATE POLICY "Team creators can remove members"
ON team_members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_id
    AND teams.created_by = auth.uid()
  )
  OR player_id = auth.uid()
);

-- Team event assignments policies
CREATE POLICY "Users can view team event assignments"
ON team_event_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    LEFT JOIN team_members ON team_members.team_id = teams.id
    WHERE teams.id = team_event_assignments.team_id
    AND (
      teams.created_by = auth.uid()
      OR team_members.player_id = auth.uid()
    )
  )
);

CREATE POLICY "Team creators can manage event assignments"
ON team_event_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_id
    AND teams.created_by = auth.uid()
  )
  AND locked_at IS NULL
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_id
    AND teams.created_by = auth.uid()
  )
  AND locked_at IS NULL
  AND EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = team_id
    AND team_members.player_id = player_id
  )
);

-- Create indexes for better query performance
CREATE INDEX idx_teams_olympic_id ON teams(olympic_id);
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_team_members_player_id ON team_members(player_id);
CREATE INDEX idx_team_event_assignments_event_id ON team_event_assignments(event_id);
CREATE INDEX idx_team_event_assignments_player_id ON team_event_assignments(player_id);