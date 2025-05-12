/*
  # Fix Profile Policies

  1. Changes
    - Safely recreate profiles table if it doesn't exist
    - Safely handle existing policies
    - Implement simplified access control

  2. Security
    - Enable RLS
    - Create non-recursive policies for read/write access
    - Maintain proper access control for users and admins
*/

-- Ensure the profiles table exists with proper structure
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

-- Safely drop existing policies
DO $$ 
BEGIN
  -- Drop old policies if they exist
  DROP POLICY IF EXISTS "read_access_policy" ON profiles;
  DROP POLICY IF EXISTS "update_access_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
  DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Allow read access" ON profiles;
  DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
  DROP POLICY IF EXISTS "Allow admins to update any profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN 
    NULL;
END $$;

-- Create new simplified policies
DO $$ 
BEGIN
  -- Create read policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'allow_select'
  ) THEN
    CREATE POLICY "allow_select" ON profiles
    FOR SELECT TO authenticated
    USING (
      id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    );
  END IF;

  -- Create update policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'allow_update'
  ) THEN
    CREATE POLICY "allow_update" ON profiles
    FOR UPDATE TO authenticated
    USING (
      id = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = true
      )
    );
  END IF;
END $$;

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

-- Safely recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();