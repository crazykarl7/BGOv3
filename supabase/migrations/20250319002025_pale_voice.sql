/*
  # Fix Profile Policies - Final Version

  1. Changes
    - Remove all existing profile policies
    - Create simplified non-recursive policies
    - Use direct auth.uid() checks where possible
    - Separate policies by operation type
    - Avoid any recursive lookups

  2. Security
    - Anyone authenticated can read profiles
    - Users can update their own profiles
    - Admins can manage all profiles
    - No recursive policy checks
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "anyone_can_read_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admins_can_manage_profiles" ON profiles;

-- Create new simplified policies
CREATE POLICY "anyone_can_read_profiles"
ON profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_can_update_own_profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Split admin policies by operation for better control
CREATE POLICY "admins_can_insert_profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1)
);

CREATE POLICY "admins_can_update_profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1)
)
WITH CHECK (
  (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1)
);

CREATE POLICY "admins_can_delete_profiles"
ON profiles
FOR DELETE
TO authenticated
USING (
  (SELECT p.is_admin FROM profiles p WHERE p.id = auth.uid() LIMIT 1)
);

-- Refresh RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;