import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Profile } from '../types/database';
import { 
  Shuffle, 
  ArrowLeft, 
  LogOut, 
  RefreshCw, 
  Users, 
  ListOrdered,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

interface PlayerWithPresence extends Profile {
  is_present: boolean;
}

interface PlayerOrderEntry {
  id: string;
  tier: number;
}

interface GeneratedPlayerList {
  players: PlayerOrderEntry[];
  timestamp: string;
}

type Tab = 'players' | 'order';

export default function PlayerOrder() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [players, setPlayers] = useState<PlayerWithPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('players');
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatedOrder, setGeneratedOrder] = useState<GeneratedPlayerList | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    try {
      const [olympicResponse, playersResponse] = await Promise.all([
        supabase.from('olympic').select('*').eq('id', olympicId).single(),
        supabase
          .from('olympic_player')
          .select('profiles(*)')
          .eq('olympic_id', olympicId)
      ]);

      if (olympicResponse.error) throw olympicResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setOlympic(olympicResponse.data);
      
      const playersList = playersResponse.data
        .map(op => op.profiles)
        .filter(Boolean)
        .map(player => ({
          ...player,
          is_present: player.is_present || false
        }));
      
      setPlayers(playersList);

      // Parse existing generated order if it exists
      if (olympicResponse.data.last_generated_player_list) {
        try {
          const parsed = JSON.parse(olympicResponse.data.last_generated_player_list);
          setGeneratedOrder(parsed);
        } catch (e) {
          console.error('Failed to parse last_generated_player_list:', e);
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPresence = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const { data: playersResponse, error } = await supabase
        .from('olympic_player')
        .select('profiles(*)')
        .eq('olympic_id', olympicId);

      if (error) throw error;

      const playersList = playersResponse
        .map(op => op.profiles)
        .filter(Boolean)
        .map(player => ({
          ...player,
          is_present: player.is_present || false
        }));
      
      setPlayers(playersList);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const togglePresence = async (playerId: string) => {
    try {
      const player = players.find(p => p.id === playerId);
      if (!player) return;

      const newPresenceStatus = !player.is_present;

      const { error } = await supabase
        .from('profiles')
        .update({ is_present: newPresenceStatus })
        .eq('id', playerId);

      if (error) throw error;

      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, is_present: newPresenceStatus } : p
      ));
    } catch (error: any) {
      setError(error.message);
    }
  };

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const generateWeightedOrder = (playersWithTiers: { player: PlayerWithPresence; tier: number }[]) => {
    // Create a weighted list where each player appears multiple times based on their tier
    const weightedList: { player: PlayerWithPresence; tier: number }[] = [];
    
    playersWithTiers.forEach(({ player, tier }) => {
      const weight = Math.pow(2, tier - 1); // Tier 1: 1x, Tier 2: 2x, Tier 3: 4x, Tier 4: 8x
      for (let i = 0; i < weight; i++) {
        weightedList.push({ player, tier });
      }
    });

    // Shuffle the weighted list
    const shuffledWeighted = shuffleArray(weightedList);
    
    // Extract unique players in order
    const seenPlayers = new Set<string>();
    const orderedPlayers: { player: PlayerWithPresence; tier: number }[] = [];
    
    shuffledWeighted.forEach(({ player, tier }) => {
      if (!seenPlayers.has(player.id)) {
        seenPlayers.add(player.id);
        orderedPlayers.push({ player, tier });
      }
    });

    return orderedPlayers;
  };

  const generatePlayerOrder = async () => {
    setGenerating(true);
    setError(null);

    try {
      const presentPlayers = players.filter(p => p.is_present);
      
      if (presentPlayers.length === 0) {
        throw new Error('No players are marked as present');
      }

      // Step 1: Prepare players with initial tiers for weighted shuffle
      let playersWithInitialTiers: { player: PlayerWithPresence; tier: number }[] = [];

      if (olympic?.last_generated_player_list) {
        // Parse existing order to get previous tiers
        const existingOrder: GeneratedPlayerList = JSON.parse(olympic.last_generated_player_list);
        const existingPlayerMap = new Map<string, number>();
        
        existingOrder.players.forEach(p => {
          existingPlayerMap.set(p.id, p.tier);
        });

        // Assign tiers: existing players keep their tier, new players get tier 4
        playersWithInitialTiers = presentPlayers.map(player => ({
          player,
          tier: existingPlayerMap.get(player.id) || 4 // New players get tier 4
        }));
      } else {
        // First time generation - all players start as tier 4
        playersWithInitialTiers = presentPlayers.map(player => ({
          player,
          tier: 4
        }));
      }

      // Step 2: Generate weighted random order based on initial tiers
      const orderedPlayersFromWeightedShuffle = generateWeightedOrder(playersWithInitialTiers);

      // Step 3: Determine NEW tiers from the newly generated list
      const playersPerTier = Math.ceil(orderedPlayersFromWeightedShuffle.length / 4);
      const finalOrderedPlayersWithNewTiers = orderedPlayersFromWeightedShuffle.map((item, index) => ({
        player: item.player,
        tier: Math.min(Math.floor(index / playersPerTier) + 1, 4)
      }));

      // Step 4: Create the new generated list with newly assigned tiers
      const newGeneratedList: GeneratedPlayerList = {
        players: finalOrderedPlayersWithNewTiers.map(({ player, tier }) => ({
          id: player.id,
          tier
        })),
        timestamp: new Date().toISOString()
      };

      // Update the olympic record
      const { error: updateError } = await supabase
        .from('olympic')
        .update({ last_generated_player_list: JSON.stringify(newGeneratedList) })
        .eq('id', olympicId);

      if (updateError) throw updateError;

      setGeneratedOrder(newGeneratedList);
      setActiveTab('order');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const getPlayerById = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-gray-100 text-gray-800';
      case 2: return 'bg-gray-100 text-gray-800';
      case 3: return 'bg-gray-100 text-gray-800';
      case 4: return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierName = (tier: number) => {
    switch (tier) {
      case 1: return 'Tier 1';
      case 2: return 'Tier 2';
      case 3: return 'Tier 3';
      case 4: return 'Tier 4';
      default: return `Tier ${tier}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading player order...</div>
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
                  <Shuffle className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Player Order - {olympic.name}
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

          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('players')}
                className={clsx(
                  'px-8 py-4 text-sm font-medium flex items-center border-b-2 whitespace-nowrap',
                  activeTab === 'players'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Users className="h-5 w-5 mr-2" />
                Players
              </button>
              <button
                onClick={() => setActiveTab('order')}
                className={clsx(
                  'px-8 py-4 text-sm font-medium flex items-center border-b-2 whitespace-nowrap',
                  activeTab === 'order'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <ListOrdered className="h-5 w-5 mr-2" />
                Generated Order
              </button>
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {activeTab === 'players' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Player Presence</h2>
                  <div className="flex space-x-4">
                    <button
                      onClick={refreshPresence}
                      disabled={refreshing}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className={clsx('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
                      Refresh Presence
                    </button>
                    <button
                      onClick={generatePlayerOrder}
                      disabled={generating}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Shuffle className="h-4 w-4 mr-2" />
                      {generating ? 'Generating...' : 'Generate Player Order'}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                          Player
                        </th>
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                          Presence Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {players.map((player) => (
                        <tr key={player.id}>
                          <td className="py-4 pl-4 pr-3 text-sm">
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
                                {player.full_name && (
                                  <div className="text-gray-500">{player.username}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-center">
                            <button
                              onClick={() => togglePresence(player.id)}
                              className={clsx(
                                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                                player.is_present
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              )}
                            >
                              {player.is_present ? (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Present
                                </>
                              ) : (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Not Present
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'order' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-medium text-gray-900">Generated Player Order</h2>
                  {generatedOrder && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-1" />
                      Generated: {new Date(generatedOrder.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>

                {generatedOrder ? (
                  <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                            Order
                          </th>
                          <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Player
                          </th>
                          <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                            Tier
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {generatedOrder.players.map((entry, index) => {
                          const player = getPlayerById(entry.id);
                          return (
                            <tr key={entry.id}>
                              <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                #{index + 1}
                              </td>
                              <td className="px-3 py-4 text-sm">
                                {player ? (
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
                                      {player.full_name && (
                                        <div className="text-gray-500">{player.username}</div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Player not found</span>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-center">
                                <span className={clsx(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  getTierColor(entry.tier)
                                )}>
                                  {getTierName(entry.tier)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <ListOrdered className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No Player Order Generated</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Generate a player order from the Players tab to see the results here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}