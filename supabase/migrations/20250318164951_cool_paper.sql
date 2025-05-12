/*
  # Fix RLS Policies and Admin Access

  1. Changes
    - Create a materialized admin view for efficient admin checks
    - Simplify RLS policies to avoid recursion
    - Add proper error handling
    - Ensure clean policy state

  2. Security
    - Maintain same security model with better performance
    - Prevent infinite recursion in policy checks
*/

-- Create materialized view for admin status
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_users AS
SELECT id
FROM profiles
WHERE is_admin = true;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_id_idx ON admin_users (id);

-- Function to refresh admin users view
CREATE OR REPLACE FUNCTION refresh_admin_users()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh admin users view
DROP TRIGGER IF EXISTS refresh_admin_users_trigger ON profiles;
CREATE TRIGGER refresh_admin_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_admin_users();

-- Ensure the profiles table exists
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "allow_select" ON profiles;
  DROP POLICY IF EXISTS "allow_update" ON profiles;
  DROP POLICY IF EXISTS "read_access_policy" ON profiles;
  DROP POLICY IF EXISTS "update_access_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new simplified policies using materialized view
CREATE POLICY "allow_select" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR 
  auth.uid() IN (SELECT id FROM admin_users)
);

CREATE POLICY "allow_update" ON profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid() OR 
  auth.uid() IN (SELECT id FROM admin_users)
)
WITH CHECK (
  id = auth.uid() OR 
  auth.uid() IN (SELECT id FROM admin_users)
);

-- Refresh the admin users view initially
REFRESH MATERIALIZED VIEW admin_users;