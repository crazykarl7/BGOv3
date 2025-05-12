/*
  # Add User Management Policies

  1. Changes
    - Add policies for admin user management
    - Allow admins to delete users
    - Allow admins to create new users

  2. Security
    - Maintain existing RLS
    - Add specific policies for user management
*/

-- Update profiles policies for admin user management
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles"
ON profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);