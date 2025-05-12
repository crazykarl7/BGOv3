/*
  # Fix Profiles Policies

  1. Changes
    - Create materialized view for admin users to break recursion
    - Update profiles policies to use materialized view
    - Add refresh trigger for admin users view

  2. Security
    - Maintain existing RLS
    - Fix infinite recursion in policies
*/

-- Create materialized view for admin users if it doesn't exist
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id
FROM profiles
WHERE is_admin = true;

-- Create function to refresh admin users view
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to refresh admin users view
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
CREATE TRIGGER refresh_admin_users_trigger
AFTER INSERT OR UPDATE OF is_admin OR DELETE ON profiles
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_admin_users();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Create new policies using materialized view
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
)
WITH CHECK (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);

-- Refresh the view initially
REFRESH MATERIALIZED VIEW admin_users;