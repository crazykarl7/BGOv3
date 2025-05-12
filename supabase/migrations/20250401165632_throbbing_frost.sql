/*
  # Team Management Schema

  1. New Tables
    - `teams`: Store team information
      - `id` (uuid, primary key)
      - `name` (text)
      - `olympic_id` (uuid, references olympic)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references profiles)
    
    - `team_members`: Track team membership
      - `team_id` (uuid, references teams)
      - `player_id` (uuid, references profiles)
      - `joined_at` (timestamptz)

    - `team_event_assignments`: Track player assignments to events
      - `team_id` (uuid, references teams)
      - `event_id` (uuid, references event)
      - `player_id` (uuid, references profiles)
      - `locked_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Non-recursive policies using direct auth.uid() checks
    - Separate policies by operation type
*/

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
  -- User can view teams if they're registered for the olympic
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
  -- User can create teams if they're registered for the olympic
  -- and aren't already in a team for this olympic
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
  -- Ensure created_by is set to the current user
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
  -- User can view team members if they're registered for the olympic
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
  -- User can only join teams in olympics they're registered for
  EXISTS (
    SELECT 1 FROM teams
    JOIN olympic_player ON olympic_player.olympic_id = teams.olympic_id
    WHERE teams.id = team_id
    AND olympic_player.player_id = auth.uid()
  )
  -- User can only join one team per olympic
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    JOIN teams current_team ON current_team.id = team_id
    WHERE tm.player_id = player_id
    AND t.olympic_id = current_team.olympic_id
  )
  -- User can only add themselves or be added by team creator
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
  OR player_id = auth.uid() -- Players can remove themselves
);

-- Team event assignments policies
CREATE POLICY "Users can view team event assignments"
ON team_event_assignments
FOR SELECT
TO authenticated
USING (
  -- User can view assignments if they're in the team or created the team
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
  -- Only team creator can manage assignments
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_id
    AND teams.created_by = auth.uid()
  )
  -- Can't modify locked assignments
  AND locked_at IS NULL
)
WITH CHECK (
  -- Only team creator can manage assignments
  EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = team_id
    AND teams.created_by = auth.uid()
  )
  -- Can't modify locked assignments
  AND locked_at IS NULL
  -- Player must be a team member
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