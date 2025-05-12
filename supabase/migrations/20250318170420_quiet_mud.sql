/*
  # Fix Recursive Policy Issue

  1. Changes
    - Remove recursive policy check
    - Implement non-recursive admin access control
    - Maintain user self-access

  2. Security
    - Users can view their own profile
    - Admins can view all profiles
    - Users can only update their own profile
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create materialized view for admin users to avoid recursion
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id FROM profiles WHERE is_admin = true;

-- Create function to refresh admin users view
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh admin users view
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
CREATE TRIGGER refresh_admin_users_trigger
  AFTER INSERT OR UPDATE OF is_admin OR DELETE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_admin_users();

-- Refresh the view initially
REFRESH MATERIALIZED VIEW admin_users;

-- Create new non-recursive policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR 
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());