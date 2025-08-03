import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Profile } from '../types/database';
import { Trophy, ArrowLeft, LogOut, Medal, User, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

interface LeaderboardEntry {
  player: Profile;
  total_points: number;
  total_games: number;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

interface TeamLeaderboardEntry {
  id: string;
  name: string;
  total_points: number;
  total_games: number;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export default function OlympicLeaderboard() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [individualLeaderboard, setIndividualLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTeamLeaderboard, setShowTeamLeaderboard] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    try {
      // First, get the olympic details
      const { data: olympicData, error: olympicError } = await supabase
        .from('olympic')
        .select('*')
        .eq('id', olympicId)
        .single();

      if (olympicError) throw olympicError;
      setOlympic(olympicData);

      // Fetch both individual and team leaderboards
      await Promise.all([
        fetchIndividualLeaderboard(),
        fetchTeamLeaderboard()
      ]);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIndividualLeaderboard = async () => {
    try {
      console.log('Fetching individual leaderboard...');

      // Get all players in this olympic
      const { data: players, error: playersError } = await supabase
        .from('olympic_player')
        .select('profiles(*)')
        .eq('olympic_id', olympicId);

      if (playersError) throw playersError;
      console.log('Players:', players);

      // Get all scores for this olympic
      const { data: scores, error: scoresError } = await supabase
        .from('game_score')
        .select('*, player:profiles(*)')
        .eq('olympic_id', olympicId);

      if (scoresError) throw scoresError;
      console.log('All scores:', scores);

      // Initialize leaderboard entries for all players
      const playerMap = new Map<string, LeaderboardEntry>();

      // Add all players to the map, even those without scores
      players.forEach((op) => {
        const player = op.profiles;
        if (player) {
          playerMap.set(player.id, {
            player,
            total_points: 0,
            total_games: 0,
            medals: { gold: 0, silver: 0, bronze: 0 }
          });
        }
      });

      // Update scores and medals for players
      scores.forEach((score) => {
        if (!score.player_id) return;

        const entry = playerMap.get(score.player_id);
        if (!entry) return;

        console.log(`Processing score for player ${score.player_id}:`, {
          score: score.score,
          points: score.points,
          medal: score.medal
        });

        entry.total_points += score.points;
        entry.total_games += 1;

        // Update medals based on medal field
        if (score.medal === 'gold') {
          entry.medals.gold += 1;
          console.log(`Added gold medal to ${entry.player.username}`);
        }
        else if (score.medal === 'silver') {
          entry.medals.silver += 1;
          console.log(`Added silver medal to ${entry.player.username}`);
        }
        else if (score.medal === 'bronze') {
          entry.medals.bronze += 1;
          console.log(`Added bronze medal to ${entry.player.username}`);
        }

        console.log(`Updated medals for ${entry.player.username}:`, entry.medals);
      });

      // Convert to array and sort
      const sortedLeaderboard = Array.from(playerMap.values()).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.medals.gold !== a.medals.gold) return b.medals.gold - a.medals.gold;
        if (b.medals.silver !== a.medals.silver) return b.medals.silver - a.medals.silver;
        return b.medals.bronze - a.medals.bronze;
      });

      console.log('Final individual leaderboard:', sortedLeaderboard);
      setIndividualLeaderboard(sortedLeaderboard);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchTeamLeaderboard = async () => {
    try {
      console.log('Fetching team leaderboard...');

      // First get all teams for this olympic
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          assignments:team_event_assignments(
            player_id,
            event_id
          )
        `)
        .eq('olympic_id', olympicId);

      if (teamsError) throw teamsError;
      console.log('Teams with assignments:', teams);

      // Then get all game scores for this olympic
      const { data: scores, error: scoresError } = await supabase
        .from('game_score')
        .select('*')
        .eq('olympic_id', olympicId);

      if (scoresError) throw scoresError;
      console.log('All scores:', scores);

      const teamLeaderboardData: TeamLeaderboardEntry[] = teams.map((team) => {
        console.log(`Processing team ${team.name}:`);

        const teamScores = scores.filter(score => 
          team.assignments?.some(assignment => 
            assignment.player_id === score.player_id && 
            assignment.event_id === score.event_id
          )
        );

        console.log(`Team ${team.name} scores:`, teamScores);

        const total_points = teamScores.reduce((sum, score) => sum + score.points, 0);
        const total_games = teamScores.length;
        const medals = {
          gold: teamScores.filter(score => score.medal === 'gold').length,
          silver: teamScores.filter(score => score.medal === 'silver').length,
          bronze: teamScores.filter(score => score.medal === 'bronze').length
        };

        console.log(`Team ${team.name} summary:`, {
          total_points,
          total_games,
          medals
        });

        return {
          id: team.id,
          name: team.name,
          total_points,
          total_games,
          medals
        };
      });

      // Sort teams by points and medals
      const sortedTeamLeaderboard = teamLeaderboardData.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.medals.gold !== a.medals.gold) return b.medals.gold - a.medals.gold;
        if (b.medals.silver !== a.medals.silver) return b.medals.silver - a.medals.silver;
        return b.medals.bronze - a.medals.bronze;
      });

      console.log('Final team leaderboard:', sortedTeamLeaderboard);
      setTeamLeaderboard(sortedTeamLeaderboard);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleBack = () => {
    if (user?.is_admin) {
      navigate('/admin/olympics');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading leaderboard...</div>
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

  const currentLeaderboard = showTeamLeaderboard ? teamLeaderboard : individualLeaderboard;

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleBack}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <Trophy className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Leaderboard - {olympic.name}
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

            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowTeamLeaderboard(!showTeamLeaderboard)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {showTeamLeaderboard ? (
                  <>
                    <User className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Show Individual Leaderboard</span>
                    <span className="sm:hidden">Individual</span>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Show Team Leaderboard</span>
                    <span className="sm:hidden">Team</span>
                  </>
                )}
              </button>
            </div>

            <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900"
                    >
                      Rank
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      {showTeamLeaderboard ? 'Team' : 'Player'}
                    </th>
                    <th
                      scope="col"
                      className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Total Points
                    </th>
                    <th
                      scope="col"
                      className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Games Played
                    </th>
                    <th
                      scope="col"
                      className="hidden sm:table-cell px-3 py-3.5 text-center text-sm font-semibold text-gray-900"
                    >
                      Medals
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {currentLeaderboard.map((entry, index) => (
                    <tr
                      key={showTeamLeaderboard ? entry.id : entry.player.id}
                      className={clsx(
                        'block sm:table-row border-b border-gray-200 sm:border-none',
                        index < 3 ? 'bg-indigo-50 bg-opacity-50' : undefined
                      )}
                    >
                      <td className="block sm:table-cell py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center">
                          <span
                            className={clsx(
                              'font-medium',
                              index === 0
                                ? 'text-yellow-600'
                                : index === 1
                                ? 'text-gray-500'
                                : index === 2
                                ? 'text-amber-700'
                                : 'text-gray-900'
                            )}
                          >
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="block sm:table-cell px-3 py-4 text-sm text-gray-900">
                        {showTeamLeaderboard ? (
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{entry.name}</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {entry.player.avatar_url ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={entry.player.avatar_url}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <User className="h-5 w-5 text-indigo-600" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {entry.player.full_name || entry.player.username}
                              </div>
                              {entry.player.full_name && (
                                <div className="text-gray-500">{entry.player.username}</div>
                              )}
                            </div>
                          </div>
                        )}
                        {/* Mobile-only content */}
                        <div className="sm:hidden mt-3 space-y-2">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Points:</span> {entry.total_points}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Games:</span> {entry.total_games}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Medals:</span>
                            <div className="flex items-center mt-1 space-x-2">
                              <div className="flex items-center">
                                <Medal className="h-4 w-4 text-yellow-500 mr-1" />
                                <span>{entry.medals.gold}</span>
                              </div>
                              <div className="flex items-center">
                                <Medal className="h-4 w-4 text-gray-400 mr-1" />
                                <span>{entry.medals.silver}</span>
                              </div>
                              <div className="flex items-center">
                                <Medal className="h-4 w-4 text-amber-600 mr-1" />
                                <span>{entry.medals.bronze}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {entry.total_points}
                      </td>
                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        {entry.total_games}
                      </td>
                      <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm">
                        <div className="flex items-center justify-center flex-wrap gap-1">
                          <div className="flex items-center">
                            <Medal className="h-5 w-5 text-yellow-500 mr-1" />
                            <span>{entry.medals.gold}</span>
                          </div>
                          <div className="flex items-center">
                            <Medal className="h-5 w-5 text-gray-400 mr-1" />
                            <span>{entry.medals.silver}</span>
                          </div>
                          <div className="flex items-center">
                            <Medal className="h-5 w-5 text-amber-600 mr-1" />
                            <span>{entry.medals.bronze}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}