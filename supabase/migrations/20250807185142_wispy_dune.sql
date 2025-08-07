/*
  # Add Custom Avatar Fields

  1. New Columns
    - `avatar_shape` (text) - stores the selected shape name
    - `avatar_foreground_color` (text) - stores the foreground color hex code
    - `avatar_background_color` (text) - stores the background color hex code

  2. Security
    - Update existing RLS policies to allow users to update these new fields
*/

-- Add new avatar customization columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_shape text DEFAULT 'user',
ADD COLUMN IF NOT EXISTS avatar_foreground_color text DEFAULT '#4f46e5',
ADD COLUMN IF NOT EXISTS avatar_background_color text DEFAULT '#e0e7ff';

-- The existing RLS policies should already cover these new columns since they allow
-- users to update their own profiles, but let's ensure the policies are correct

-- Drop and recreate the user update policy to be explicit about the new fields
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;

CREATE POLICY "users_can_update_own_profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (uid() = id)
  WITH CHECK (uid() = id);