/*
  # Fix Infinite Recursion in RLS Policies

  1. Changes
    - Simplify RLS policies to avoid recursive checks
    - Create separate admin check function for cleaner policy logic
    - Ensure proper error handling in policies

  2. Security
    - Maintain same security model but with more efficient implementation
    - Preserve admin and user access controls
*/

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = user_id 
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create new simplified policies
CREATE POLICY "allow_select" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR 
  is_admin(auth.uid())
);

CREATE POLICY "allow_update" ON profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid() OR 
  is_admin(auth.uid())
)
WITH CHECK (
  id = auth.uid() OR 
  is_admin(auth.uid())
);

-- Ensure trigger function exists
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