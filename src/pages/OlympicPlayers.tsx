import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Profile, Olympic, OlympicPlayer } from '../types/database';
import { Users, ArrowLeft, LogOut, Search, Check, X, DollarSign, UserCheck, UserX } from 'lucide-react';
import clsx from 'clsx';

export default function OlympicPlayers() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [playerPayments, setPlayerPayments] = useState<Record<string, boolean>>({});
  const [playerPresence, setPlayerPresence] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    try {
      // First get the olympic details and current players
      const [olympicResponse, olympicPlayersResponse] = await Promise.all([
        supabase.from('olympic').select('*').eq('id', olympicId).single(),
        supabase
          .from('olympic_player')
          .select(`
            player_id,
            paid,
            player:profiles(*)
          `)
          .eq('olympic_id', olympicId)
      ]);

      if (olympicResponse.error) throw olympicResponse.error;
      if (olympicPlayersResponse.error) throw olympicPlayersResponse.error;

      setOlympic(olympicResponse.data);

      // Extract players and set up selected players and payments
      const selectedIds = new Set();
      const payments: Record<string, boolean> = {};
      const presence: Record<string, boolean> = {};
      const playersList: Profile[] = [];

      olympicPlayersResponse.data.forEach((op) => {
        if (op.player) {
          selectedIds.add(op.player_id);
          payments[op.player_id] = op.paid;
          presence[op.player_id] = op.player.is_present || false;
          playersList.push(op.player);
        }
      });

      setPlayers(playersList);
      setSelectedPlayers(selectedIds);
      setPlayerPayments(payments);
      setPlayerPresence(presence);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlayer = async (playerId: string) => {
    try {
      // Get current session to verify auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      console.log('Debug - Auth Info:', {
        userId: session?.user?.id,
        playerId,
        olympicId,
        timestamp: new Date().toISOString()
      });

      if (selectedPlayers.has(playerId)) {
        // Remove player
        const { error } = await supabase
          .from('olympic_player')
          .delete()
          .eq('olympic_id', olympicId)
          .eq('player_id', playerId);

        if (error) {
          console.error('Debug - Delete Error:', {
            error,
            playerId,
            olympicId,
            timestamp: new Date().toISOString()
          });
          throw error;
        }

        const newSelected = new Set(selectedPlayers);
        newSelected.delete(playerId);
        setSelectedPlayers(newSelected);

        const newPayments = { ...playerPayments };
        delete newPayments[playerId];
        setPlayerPayments(newPayments);
      } else {
        // Add player
        const { error } = await supabase
          .from('olympic_player')
          .insert({
            olympic_id: olympicId,
            player_id: playerId,
            paid: false
          });

        if (error) {
          console.error('Debug - Insert Error:', {
            error,
            playerId,
            olympicId,
            timestamp: new Date().toISOString()
          });
          throw error;
        }

        const newSelected = new Set(selectedPlayers);
        newSelected.add(playerId);
        setSelectedPlayers(newSelected);
        setPlayerPayments({ ...playerPayments, [playerId]: false });

        // Fetch the player details if not already in the list
        if (!players.find(p => p.id === playerId)) {
          const { data: playerData, error: playerError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', playerId)
            .single();

          if (playerError) throw playerError;
          if (playerData) {
            setPlayers([...players, playerData]);
          }
          
          // Initialize presence for new players
          const newPresence = { ...playerPresence };
          const newPlayers = [playerData];
          newPlayers.forEach(player => {
            newPresence[player.id] = player.is_present || false;
          });
          
          setPlayers([...players, ...newPlayers]);
          setPlayerPresence(newPresence);
        }
      }
    } catch (error: any) {
      console.error('Debug - Operation Error:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        timestamp: new Date().toISOString()
      });
      setError(error.message);
    }
  };

  const togglePayment = async (playerId: string) => {
    try {
      const newPaidStatus = !playerPayments[playerId];

      // Get current session to verify auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      console.log('Debug - Payment Update:', {
        userId: session?.user?.id,
        playerId,
        olympicId,
        newPaidStatus,
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase
        .from('olympic_player')
        .update({ paid: newPaidStatus })
        .eq('olympic_id', olympicId)
        .eq('player_id', playerId);

      if (error) {
        console.error('Debug - Payment Update Error:', {
          error,
          playerId,
          olympicId,
          newPaidStatus,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      setPlayerPayments(prev => ({
        ...prev,
        [playerId]: newPaidStatus
      }));
    } catch (error: any) {
      console.error('Debug - Payment Operation Error:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        timestamp: new Date().toISOString()
      });
      setError(error.message);
    }
  };

  const togglePresence = async (playerId: string) => {
    try {
      const newPresenceStatus = !playerPresence[playerId];

      // Get current session to verify auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      console.log('Debug - Presence Update:', {
        userId: session?.user?.id,
        playerId,
        newPresenceStatus,
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase
        .from('profiles')
        .update({ is_present: newPresenceStatus })
        .eq('id', playerId);

      if (error) {
        console.error('Debug - Presence Update Error:', {
          error,
          playerId,
          newPresenceStatus,
          timestamp: new Date().toISOString()
        });
        throw error;
      }

      setPlayerPresence(prev => ({
        ...prev,
        [playerId]: newPresenceStatus
      }));
    } catch (error: any) {
      console.error('Debug - Presence Operation Error:', {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        timestamp: new Date().toISOString()
      });
      setError(error.message);
    }
  };

  const handleAddPlayer = async () => {
    try {
      // Fetch all profiles not already in the olympic
      const { data: availablePlayers, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (error) throw error;

      if (availablePlayers) {
        const newPlayers = availablePlayers.filter(
          player => !players.some(p => p.id === player.id)
        );
        setPlayers([...players, ...newPlayers]);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const filteredPlayers = players.filter((player) =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (player.full_name && player.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading players...</div>
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
                  onClick={() => navigate('/admin/olympics')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Manage Players - {olympic.name}
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

            <div className="mb-6 flex justify-between items-center">
              <div className="relative flex-1 max-w-sm mb-4 sm:mb-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                onClick={handleAddPlayer}
                className="ml-0 sm:ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <span className="hidden sm:inline">Show All Players</span>
                <span className="sm:hidden">Show All</span>
              </button>
            </div>

            <div className="shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Player
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                      Presence
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                      Payment Status
                    </th>
                    <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                      Registered
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      className={clsx(
                        'block sm:table-row border-b border-gray-200 sm:border-none',
                        selectedPlayers.has(player.id) && 'bg-indigo-50'
                      )}
                    >
                      <td className="block sm:table-cell py-4 pl-4 pr-3 text-sm">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            {player.avatar_url ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={player.avatar_url}
                                alt=""
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Users className="h-5 w-5 text-indigo-600" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">
                              {player.full_name || player.username}
                            </div>
                          </div>
                        </div>
                        {/* Mobile-only content */}
                        <div className="sm:hidden mt-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Presence:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePresence(player.id);
                              }}
                              className={clsx(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                playerPresence[player.id]
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              )}
                            >
                              {playerPresence[player.id] ? (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Present
                                </>
                              ) : (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Not Present
                                </>
                              )}
                            </button>
                          </div>
                          {selectedPlayers.has(player.id) && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Payment:</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePayment(player.id);
                                }}
                                className={clsx(
                                  'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                  playerPayments[player.id]
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                )}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                {playerPayments[player.id] ? 'Paid' : 'Unpaid'}
                              </button>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Registered:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePlayer(player.id);
                              }}
                              className="inline-flex items-center justify-center p-1 rounded-full hover:bg-gray-100"
                            >
                              {selectedPlayers.has(player.id) ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <X className="h-4 w-4 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-sm text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePresence(player.id);
                          }}
                          className={clsx(
                            'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                            playerPresence[player.id]
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          )}
                        >
                          {playerPresence[player.id] ? (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Present</span>
                              <span className="sm:hidden">✓</span>
                            </>
                          ) : (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Not Present</span>
                              <span className="sm:hidden">✗</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-sm text-center">
                        {selectedPlayers.has(player.id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePayment(player.id);
                            }}
                            className={clsx(
                              'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                              playerPayments[player.id]
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            )}
                          >
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">
                              {playerPayments[player.id] ? 'Paid' : 'Unpaid'}
                            </span>
                            <span className="sm:hidden">
                              {playerPayments[player.id] ? '✓' : '✗'}
                            </span>
                          </button>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-sm text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlayer(player.id);
                          }}
                          className="inline-flex items-center justify-center p-1 rounded-full hover:bg-gray-100 mx-auto"
                        >
                          {selectedPlayers.has(player.id) ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
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