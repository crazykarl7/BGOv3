import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Event, Game, Profile, GameScore } from '../types/database';
import { Trophy, ArrowLeft, LogOut, ChevronRight, Medal, User, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import CustomAvatar from '../components/CustomAvatar';
import clsx from 'clsx';

interface GameWithScores extends Game {
  isScored?: boolean;
  isPlayedByUser?: boolean;
}

interface EventWithGames extends Event {
  games?: GameWithScores[];
}

export default function MyOlympicScores() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [events, setEvents] = useState<EventWithGames[]>([]);
  const [gameScores, setGameScores] = useState<GameScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  useEffect(() => {
    if (selectedGame && selectedEvent) {
      fetchGameScores();
    }
  }, [selectedGame, selectedEvent]);

  const fetchData = async () => {
    if (!user) return;

    try {
      const [olympicResponse, eventsResponse] = await Promise.all([
        supabase.from('olympic').select('*').eq('id', olympicId).single(),
        supabase
          .from('olympic_event')
          .select(`
            event:event_id (
              id,
              name,
              description,
              games:event_game (
                game:game_id (*)
              )
            )
          `)
          .eq('olympic_id', olympicId),
      ]);

      if (olympicResponse.error) throw olympicResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;

      setOlympic(olympicResponse.data);

      // Fetch all scores for this olympic
      const { data: allScores, error: scoresError } = await supabase
        .from('game_score')
        .select('*')
        .eq('olympic_id', olympicId);

      if (scoresError) throw scoresError;

      // Create maps for scored games and user-played games
      const scoredGames = new Set<string>();
      const userPlayedGames = new Set<string>();
      
      allScores?.forEach(score => {
        scoredGames.add(score.game_id);
        if (score.player_id === user.id) {
          userPlayedGames.add(score.game_id);
        }
      });

      // Process events and sort them alphabetically
      const processedEvents = eventsResponse.data
        .map(e => {
          const event = e.event;
          if (event && event.games) {
            event.games = event.games
              .map(({ game }) => ({
                ...game,
                isScored: scoredGames.has(game.id),
                isPlayedByUser: userPlayedGames.has(game.id)
              }))
              .sort((a, b) => a.weight - b.weight);
          }
          return event;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

      setEvents(processedEvents || []);

      if (!selectedEvent && processedEvents.length > 0) {
        setSelectedEvent(processedEvents[0].id);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameScores = async () => {
    if (!selectedGame || !selectedEvent) return;

    try {
      const { data: scores, error } = await supabase
        .from('game_score')
        .select(`
          *,
          player:profiles(*)
        `)
        .eq('olympic_id', olympicId)
        .eq('event_id', selectedEvent)
        .eq('game_id', selectedGame)
        .order('score', { ascending: false });

      if (error) throw error;
      setGameScores(scores || []);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getCurrentGame = () => {
    if (!selectedEvent || !selectedGame) return null;
    const event = events.find((e) => e.id === selectedEvent);
    return event?.games?.find((g) => g.id === selectedGame) || null;
  };

  const getMedalDisplay = (medal?: string) => {
    switch (medal) {
      case 'gold':
        return <Medal className="h-5 w-5 text-yellow-500" title="Gold Medal" />;
      case 'silver':
        return <Medal className="h-5 w-5 text-gray-400" title="Silver Medal" />;
      case 'bronze':
        return <Medal className="h-5 w-5 text-amber-600" title="Bronze Medal" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading my scores...</div>
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

  const currentGame = getCurrentGame();

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
                  <Trophy className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    My Scores - {olympic.name}
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

          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Sidebar - Event/Game Tree */}
            <div className="w-full lg:w-64 border-r lg:border-r border-b lg:border-b-0 border-gray-200 bg-gray-50">
              <div className="p-4">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Categories & Games</h2>
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event.id} className="space-y-1">
                      <button
                        onClick={() => setSelectedEvent(event.id)}
                        className={clsx(
                          'w-full text-left px-2 py-1.5 rounded text-sm font-medium flex items-center',
                          selectedEvent === event.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        )}
                      >
                        <ChevronRight
                          className={clsx(
                            'h-4 w-4 mr-1 transition-transform',
                            selectedEvent === event.id ? 'rotate-90' : ''
                          )}
                        />
                        {event.name}
                      </button>
                      {selectedEvent === event.id && event.games && (
                        <div className="ml-6 space-y-1">
                          {event.games.map((game) => (
                            <button
                              key={game.id}
                              onClick={() => setSelectedGame(game.id)}
                              className={clsx(
                                'w-full text-left px-2 py-1.5 rounded text-sm',
                                selectedGame === game.id
                                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                                  : 'text-gray-600 hover:bg-gray-100'
                              )}
                            >
                              {game.name}
                              {game.isScored && (
                                <span className="ml-2 text-xs text-blue-600">(scored)</span>
                              )}
                              {game.isPlayedByUser && (
                                <span className="ml-2 text-xs text-green-600">(played)</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Content - Score Display */}
            <div className="flex-1 p-6">
              {error && (
                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {currentGame ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-medium text-gray-900">{currentGame.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      {currentGame.min_players}-{currentGame.max_players} players • Weight:{' '}
                      {currentGame.weight}
                    </p>
                    {currentGame.description && (
                      <p className="text-sm text-gray-600 mt-2">{currentGame.description}</p>
                    )}
                  </div>

                  {gameScores.length > 0 ? (
                    <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                              Player
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Score
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Points
                            </th>
                            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                              Medal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {gameScores.map((score) => (
                            <tr 
                              key={score.id}
                              className={score.player_id === user?.id ? 'bg-indigo-50' : ''}
                            >
                              <td className="py-4 pl-4 pr-3 text-sm">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0">
                                    <CustomAvatar
                                      shape={score.player?.avatar_shape}
                                      foregroundColor={score.player?.avatar_foreground_color}
                                      backgroundColor={score.player?.avatar_background_color}
                                      size="medium"
                                    />
                                  </div>
                                  <div className="ml-4">
                                    <div className="font-medium text-gray-900">
                                      {score.player?.full_name || score.player?.username}
                                      {score.player_id === user?.id && (
                                        <span className="ml-2 text-xs text-indigo-600 font-normal">(You)</span>
                                      )}
                                    </div>
                                    {/*} {score.player?.full_name && (
                                      <div className="text-gray-500">{score.player.username}</div> 
                                    )} */}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-900 font-medium">
                                {score.score}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-900 font-medium">
                                {score.points}
                              </td>
                              <td className="px-3 py-4 text-sm">
                                <div className="flex items-center">
                                  {getMedalDisplay(score.medal)}
                                  {score.medal && (
                                    <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                      {score.medal}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Time Played Display */}
                    {gameScores.length > 0 && gameScores[0].time_to_play && (
                      <div className="mt-4 flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span className="font-medium">Time Played:</span>
                        <span className="ml-1">{gameScores[0].time_to_play} minutes</span>
                      </div>
                    )}
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Medal className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No Scores Yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        This game hasn't been scored in this olympic yet.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select an event and game from the sidebar to view scores
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}