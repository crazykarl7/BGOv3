/*
  # Update RLS policies to allow viewing all users

  1. Changes
    - Update select policy to allow authenticated users to view all profiles
    - Keep update policy restricted to own profile only

  2. Security
    - Authenticated users can view all profiles
    - Users can only update their own profile
*/

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create new policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);