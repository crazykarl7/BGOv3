import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Team, Event } from '../types/database';
import { Users, ArrowLeft, LogOut, Plus } from 'lucide-react';
import TeamCreateForm from '../components/TeamCreateForm';
import TeamManagementPanel from '../components/TeamManagementPanel';

export default function TeamAdmin() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    if (!olympicId) return;

    try {
      // Get current session to verify auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const userId = session?.user?.id;
      if (!userId) {
        throw new Error('Not authenticated');
      }

      // Fetch olympic details
      const { data: olympicData, error: olympicError } = await supabase
        .from('olympic')
        .select('*')
        .eq('id', olympicId)
        .single();

      if (olympicError) throw olympicError;
      setOlympic(olympicData);

      // Fetch teams for this olympic
      const { data: teamsData, error: teamsError } = await supabase
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

      if (teamsError) throw teamsError;

      // Find user's team
      const userTeam = teamsData?.find(team => 
        team.members?.some(member => member.player?.id === userId)
      );
      setUserTeam(userTeam || null);
      setTeams(teamsData || []);

      // Fetch events for this olympic with locked_at status
      const { data: eventsData, error: eventsError } = await supabase
        .from('olympic_event')
        .select(`
          event:event_id (
            id,
            name,
            description
          ),
          locked_at
        `)
        .eq('olympic_id', olympicId);

      if (eventsError) throw eventsError;

      // Transform the data to include locked_at in the event object
      const processedEvents = eventsData.map(item => ({
        ...item.event,
        locked_at: item.locked_at
      }));

      console.log('Fetched events with locked_at:', processedEvents);
      setEvents(processedEvents || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading teams...</div>
      </div>
    );
  }

  if (!olympic) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-red-600">Olympic not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Teams - {olympic.name}
                  </h1>
                </div>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="text-white hover:text-indigo-100 flex items-center"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {userTeam && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Your Team</h2>
                <TeamManagementPanel
                  key={userTeam.id}
                  team={userTeam}
                  events={events}
                  onTeamUpdated={fetchData}
                  onTeamDeleted={fetchData}
                />
              </div>
            )}

            {!userTeam && (
              <div className="space-y-6">
                {!showCreateForm ? (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Team
                    </button>
                  </div>
                ) : (
                  <div className="mb-6">
                    <TeamCreateForm
                      olympicId={olympicId}
                      onTeamCreated={() => {
                        fetchData();
                        setShowCreateForm(false);
                      }}
                    />
                  </div>
                )}

                <div className="space-y-6">
                  {teams.map((team) => (
                    <TeamManagementPanel
                      key={team.id}
                      team={team}
                      events={events}
                      onTeamUpdated={fetchData}
                      onTeamDeleted={fetchData}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}