/*
  # Fix Profile Policies

  1. Changes
    - Remove all existing profile policies
    - Create simplified non-recursive policies
    - Separate policies for different operations
    - Use direct auth.uid() checks where possible
    - Avoid querying the profiles table within its own policies

  2. Security
    - Users can read and update their own profiles
    - Admins can manage all profiles
    - No recursive policy checks
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "read_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_manage_profiles" ON profiles;

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

CREATE POLICY "admins_can_manage_profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  -- Check if the current user is an admin by direct lookup
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  -- Check if the current user is an admin by direct lookup
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

-- Refresh RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;