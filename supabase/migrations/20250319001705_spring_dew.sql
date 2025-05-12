/*
  # Simplify Admin Access Policies

  1. Changes
    - Remove materialized view approach with CASCADE
    - Simplify admin access checks
    - Update profile policies
    - Update related table policies

  2. Security
    - Maintain same security level with simpler implementation
    - Direct checks against profiles table
*/

-- Drop the materialized view and related objects with CASCADE
DROP MATERIALIZED VIEW IF EXISTS admin_users CASCADE;
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
DROP FUNCTION IF EXISTS refresh_admin_users();

-- Create simplified policies for profiles
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.is_admin = true
  )
);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.is_admin = true
  )
)
WITH CHECK (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.is_admin = true
  )
);

CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.is_admin = true
  )
);

-- Update policies for game table
CREATE POLICY "Allow all access to admin users"
ON game
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Update policies for event table
CREATE POLICY "Allow all access to admin users"
ON event
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Update policies for olympic table
CREATE POLICY "Allow all access to admin users"
ON olympic
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Update policies for event_game table
CREATE POLICY "Allow all access to admin users"
ON event_game
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);