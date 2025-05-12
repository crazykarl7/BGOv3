import { supabase } from '../lib/supabase';

export async function assignPlayerToEvent(teamId: string, eventId: string, playerId: string) {
  // First check if there's an existing assignment for this event
  const { data: existingAssignment, error: checkError } = await supabase
    .from('team_event_assignments')
    .select()
    .eq('team_id', teamId)
    .eq('event_id', eventId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  if (existingAssignment) {
    // Update existing assignment
    const { data, error } = await supabase
      .from('team_event_assignments')
      .update({ player_id: playerId })
      .eq('team_id', teamId)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new assignment
    const { data, error } = await supabase
      .from('team_event_assignments')
      .insert({ team_id: teamId, event_id: eventId, player_id: playerId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function getTeamAssignments(teamId: string) {
  const { data, error } = await supabase
    .from('team_event_assignments')
    .select(`
      *,
      event:event(*),
      player:profiles(*)
    `)
    .eq('team_id', teamId)
    .order('event_id');

  if (error) throw error;
  return data;
}

export async function removeEventAssignment(teamId: string, eventId: string, playerId: string) {
  const { error } = await supabase
    .from('team_event_assignments')
    .delete()
    .eq('team_id', teamId)
    .eq('event_id', eventId)
    .eq('player_id', playerId);

  if (error) throw error;
}