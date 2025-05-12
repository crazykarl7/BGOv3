import { supabase } from '../lib/supabase';
import { Team, TeamMember, TeamEventAssignment } from '../types/database';

export async function createTeam(name: string, olympicId: string) {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    const userId = session?.user?.id;
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Start a transaction by using single() to ensure atomicity
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        olympic_id: olympicId,
        created_by: userId
      })
      .select()
      .single();

    if (teamError) throw teamError;

    // Add the creator as a team member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        player_id: userId
      });

    if (memberError) throw memberError;

    return team;
  } catch (error: any) {
    console.error("Error creating team:", error);
    throw error;
  }
}

export async function getTeams(olympicId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select(`
      *,
      members:team_members(
        player:profiles(*)
      ),
      assignments:team_event_assignments(
        event:event(*),
        player:profiles(*)
      )
    `)
    .eq('olympic_id', olympicId)
    .order('name');

  if (error) throw error;
  return data;
}

export async function updateTeam(id: string, name: string) {
  const { data, error } = await supabase
    .from('teams')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeam(id: string) {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id);

  if (error) throw error;
}