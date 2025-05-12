/*
  # Fix Profile Policies

  1. Changes
    - Simplify RLS policies to prevent recursion
    - Remove any potential circular references
    - Keep basic user access control

  2. Security
    - Basic row-level security for user profiles
    - Direct user-to-row mapping
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "allow_select" ON profiles;
DROP POLICY IF EXISTS "allow_update" ON profiles;
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;

-- Create simple, direct policies
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);