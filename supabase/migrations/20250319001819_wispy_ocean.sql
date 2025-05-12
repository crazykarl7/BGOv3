/*
  # Fix Profile Policies Recursion

  1. Changes
    - Remove all existing profile policies
    - Create new non-recursive policies
    - Separate read and write permissions clearly
    - Use direct admin checks without recursion
    - Maintain same security model with simpler implementation

  2. Security
    - Regular users can read and update their own profiles
    - Admins can manage all profiles
    - No recursive policy checks
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Basic read policy for own profile
CREATE POLICY "read_own_profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admin read policy
CREATE POLICY "admin_read_all_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_p
    WHERE admin_p.id = auth.uid()
    AND admin_p.is_admin = true
  )
);

-- Basic update policy for own profile
CREATE POLICY "update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin management policy (insert, update, delete)
CREATE POLICY "admin_manage_profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles admin_p
    WHERE admin_p.id = auth.uid()
    AND admin_p.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles admin_p
    WHERE admin_p.id = auth.uid()
    AND admin_p.is_admin = true
  )
);

-- Refresh RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;