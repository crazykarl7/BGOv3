/*
  # Board Game Olympics Schema

  1. New Tables
    - `game`: Store board game information
    - `event`: Store event information
    - `olympic`: Store olympics information
    - `event_game`: Many-to-many relationship between events and games
    - `olympic_event`: Many-to-many relationship between olympics and events
    - `olympic_player`: Many-to-many relationship between olympics and players (profiles)
    - `game_score`: Store game scores and points

  2. Security
    - Enable RLS on all tables
    - Admin users have full access
    - Regular users have read-only access to olympics they participate in
*/

-- Create game table
CREATE TABLE IF NOT EXISTS game (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_players integer NOT NULL,
  max_players integer NOT NULL,
  weight numeric(3,1) NOT NULL,
  description text,
  bgg_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event table
CREATE TABLE IF NOT EXISTS event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create olympic table
CREATE TABLE IF NOT EXISTS olympic (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_game junction table
CREATE TABLE IF NOT EXISTS event_game (
  event_id uuid REFERENCES event(id) ON DELETE CASCADE,
  game_id uuid REFERENCES game(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, game_id)
);

-- Create olympic_event junction table
CREATE TABLE IF NOT EXISTS olympic_event (
  olympic_id uuid REFERENCES olympic(id) ON DELETE CASCADE,
  event_id uuid REFERENCES event(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (olympic_id, event_id)
);

-- Create olympic_player junction table
CREATE TABLE IF NOT EXISTS olympic_player (
  olympic_id uuid REFERENCES olympic(id) ON DELETE CASCADE,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (olympic_id, player_id)
);

-- Create game_score table
CREATE TABLE IF NOT EXISTS game_score (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  olympic_id uuid REFERENCES olympic(id) ON DELETE CASCADE,
  event_id uuid REFERENCES event(id) ON DELETE CASCADE,
  game_id uuid REFERENCES game(id) ON DELETE CASCADE,
  player_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  score integer NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE game ENABLE ROW LEVEL SECURITY;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE olympic ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_game ENABLE ROW LEVEL SECURITY;
ALTER TABLE olympic_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE olympic_player ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_score ENABLE ROW LEVEL SECURITY;

-- Create policies for game table
CREATE POLICY "Allow read access to all authenticated users" ON game
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON game
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for event table
CREATE POLICY "Allow read access to all authenticated users" ON event
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON event
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for olympic table
CREATE POLICY "Allow read access to all authenticated users" ON olympic
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON olympic
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for event_game table
CREATE POLICY "Allow read access to all authenticated users" ON event_game
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON event_game
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for olympic_event table
CREATE POLICY "Allow read access to all authenticated users" ON olympic_event
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON olympic_event
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for olympic_player table
CREATE POLICY "Allow read access to all authenticated users" ON olympic_player
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON olympic_player
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Create policies for game_score table
CREATE POLICY "Allow read access to all authenticated users" ON game_score
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow all access to admin users" ON game_score
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_name ON game(name);
CREATE INDEX IF NOT EXISTS idx_event_name ON event(name);
CREATE INDEX IF NOT EXISTS idx_olympic_date ON olympic(date);
CREATE INDEX IF NOT EXISTS idx_game_score_olympic_id ON game_score(olympic_id);
CREATE INDEX IF NOT EXISTS idx_game_score_player_id ON game_score(player_id);