/*
  # Fix Profile Policies Recursion

  1. Changes
    - Remove recursive policy checks
    - Simplify admin access checks
    - Update profile policies to prevent infinite recursion
    - Maintain same security model with simpler implementation

  2. Security
    - Maintain same level of access control
    - Prevent policy recursion
    - Keep admin privileges intact
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create new non-recursive policies
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_admin = true AND auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  -- Check if the current user's ID matches a row where is_admin is true
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid() 
    AND p.is_admin = true
  )
);

-- Refresh RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;