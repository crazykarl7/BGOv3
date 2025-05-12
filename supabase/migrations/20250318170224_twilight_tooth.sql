/*
  # Add is_admin column to profiles

  1. Changes
    - Add is_admin column to profiles table with default false
    - Update policies to reflect admin access

  2. Security
    - Admins can view all profiles
    - Regular users can only view their own profile
    - Users can only update their own profile
*/

-- Add is_admin column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create new policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id OR 
  (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);