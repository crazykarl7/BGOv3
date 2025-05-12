/*
  # Update RLS policies for better data visibility

  1. Changes
    - Update RLS policies to allow all authenticated users to read all data
    - Maintain write restrictions for data integrity
    - Add policies for game_score table
    - Add policies for olympic_player table
    - Add policies for olympic_event table

  2. Security
    - All authenticated users can read all data
    - Users can only modify their own data
    - Admins retain full access
*/

-- Update profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Anyone can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Update game_score policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON game_score;
DROP POLICY IF EXISTS "Allow all access to admin users" ON game_score;

CREATE POLICY "Anyone can read scores"
  ON game_score
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage scores"
  ON game_score
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

-- Update olympic_player policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON olympic_player;
DROP POLICY IF EXISTS "Allow all access to admin users" ON olympic_player;

CREATE POLICY "Anyone can read olympic players"
  ON olympic_player
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage olympic players"
  ON olympic_player
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));

-- Update olympic_event policies
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON olympic_event;
DROP POLICY IF EXISTS "Allow all access to admin users" ON olympic_event;

CREATE POLICY "Anyone can read olympic events"
  ON olympic_event
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage olympic events"
  ON olympic_event
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  ));