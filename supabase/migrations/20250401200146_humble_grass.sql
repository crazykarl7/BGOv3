/*
  # Fix Team Members Policy Recursion

  1. Changes
    - Create a security definer function to check team membership
    - Update team members join policy to use the function
    - Remove recursive policy checks

  2. Security
    - Maintain same security model
    - Prevent infinite recursion
    - Keep existing constraints
*/

-- Create function to check if a player is already on a team in an olympic
CREATE OR REPLACE FUNCTION check_team_membership(player_uuid uuid, olympic_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.player_id = player_uuid
    AND t.olympic_id = olympic_uuid
  );
END;
$$;

-- Drop existing policy
DROP POLICY IF EXISTS "team_members_join" ON team_members;

-- Create new non-recursive policy
CREATE POLICY "team_members_join"
ON team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow admins to manage team members
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
  OR
  (
    -- User must be joining themselves or be the team creator
    (
      player_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM teams
        WHERE id = team_id
        AND created_by = auth.uid()
      )
    )
    -- Player must not be in another team in the same olympic
    AND NOT check_team_membership(
      player_id,
      (SELECT olympic_id FROM teams WHERE id = team_id)
    )
  )
);