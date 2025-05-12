/*
  # Simplify User Profiles Schema

  1. Changes
    - Remove admin-related functionality
    - Simplify RLS policies for basic user access
    - Keep core profile functionality

  2. Security
    - Users can only access and modify their own profiles
    - Simple, direct RLS policies
*/

-- Ensure the profiles table exists with simplified structure
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  full_name text,
  avatar_url text,
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
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  DROP MATERIALIZED VIEW IF EXISTS admin_users;
  DROP FUNCTION IF EXISTS refresh_admin_users() CASCADE;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create simplified policies
CREATE POLICY "allow_select" ON profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "allow_update" ON profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Update user creation handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();