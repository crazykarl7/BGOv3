import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Profile } from '../types/database';
import { ListOrdered, ArrowLeft, LogOut, Clock, Users } from 'lucide-react';
import CustomAvatar from '../components/CustomAvatar';

interface PlayerOrderEntry {
  id: string;
  tier: number;
}

interface GeneratedPlayerList {
  players: PlayerOrderEntry[];
  timestamp: string;
}

interface PlayerWithOrder extends Profile {
  order: number;
}

export default function UserPlayerOrder() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [orderedPlayers, setOrderedPlayers] = useState<PlayerWithOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationDate, setGenerationDate] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    try {
      // Fetch olympic details
      const { data: olympicData, error: olympicError } = await supabase
        .from('olympic')
        .select('*')
        .eq('id', olympicId)
        .single();

      if (olympicError) throw olympicError;
      setOlympic(olympicData);

      // Parse the generated player list
      if (olympicData.last_generated_player_list) {
        try {
          const generatedList: GeneratedPlayerList = JSON.parse(olympicData.last_generated_player_list);
          setGenerationDate(generatedList.timestamp);

          // Fetch player profiles for all players in the generated list
          const playerIds = generatedList.players.map(p => p.id);
          
          if (playerIds.length > 0) {
            const { data: playersData, error: playersError } = await supabase
              .from('profiles')
              .select('*')
              .in('id', playerIds);

            if (playersError) throw playersError;

            // Create ordered players array maintaining the order from the generated list
            const orderedPlayersWithOrder: PlayerWithOrder[] = generatedList.players
              .map((entry, index) => {
                const player = playersData?.find(p => p.id === entry.id);
                if (player) {
                  return {
                    ...player,
                    order: index + 1
                  };
                }
                return null;
              })
              .filter(Boolean) as PlayerWithOrder[];

            setOrderedPlayers(orderedPlayersWithOrder);
          }
        } catch (parseError) {
          console.error('Failed to parse player order data:', parseError);
          setError('Failed to load player order data');
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
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
                  onClick={() => navigate('/')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <ListOrdered className="h-6 w-6 text-white mr-2" />
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

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {generationDate && (
              <div className="mb-6 flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                Generated: {new Date(generationDate).toLocaleString()}
              </div>
            )}

            {orderedPlayers.length > 0 ? (
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {orderedPlayers.map((player) => (
                      <tr key={player.id}>
                        <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          #{player.order}
                        </td>
                        <td className="px-3 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <CustomAvatar
                                shape={player.avatar_shape}
                                foregroundColor={player.avatar_foreground_color}
                                backgroundColor={player.avatar_background_color}
                                size="medium"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">
                                {player.full_name || player.username}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <ListOrdered className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Player Order Generated</h3>
                <p className="mt-1 text-sm text-gray-500">
                  A player order hasn't been generated for this olympic yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}