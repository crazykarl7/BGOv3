import { supabase } from '../lib/supabase';

export async function addTeamMember(teamId: string, playerId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, player_id: playerId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function removeTeamMember(teamId: string, playerId: string) {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('player_id', playerId);

  if (error) throw error;
}