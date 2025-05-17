import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Event, Game, Profile, GameScore } from '../types/database';
import { Trophy, ArrowLeft, LogOut, ChevronRight, Medal, Save, Check, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Select from 'react-select';
import clsx from 'clsx';

interface ScoreRow {
  id?: string;
  playerId: string;
  score: number;
  points: number;
  medal?: 'gold' | 'silver' | 'bronze';
}

interface PlayerOption {
  value: string;
  label: string;
}

interface GameWithScores extends Game {
  hasScores?: boolean;
}

interface EventWithGames extends Event {
  games?: GameWithScores[];
}

interface MedalOption {
  value: 'gold' | 'silver' | 'bronze';
  label: string;
}

const medalOptions: MedalOption[] = [
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
];

export default function OlympicScores() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [events, setEvents] = useState<EventWithGames[]>([]);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overrideMedals, setOverrideMedals] = useState(false);
  const [scoreRows, setScoreRows] = useState<ScoreRow[]>([]);
  const [numScoreRows, setNumScoreRows] = useState(4);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  useEffect(() => {
    if (selectedGame && selectedEvent) {
      initializeScoreRows();
      setOverrideMedals(false);
      fetchExistingScores();
    }
  }, [selectedGame, selectedEvent]);

  const initializeScoreRows = () => {
    setScoreRows(Array(numScoreRows).fill({
      playerId: '',
      score: 0,
      points: 0
    }));
    setNumScoreRows(4);
  };

  const fetchData = async () => {
    try {
      const [olympicResponse, eventsResponse, playersResponse] = await Promise.all([
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
            ),
            locked_at
          `)
          .eq('olympic_id', olympicId),
        supabase
          .from('olympic_player')
          .select('profiles(*)')
          .eq('olympic_id', olympicId),
      ]);

      if (olympicResponse.error) throw olympicResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (playersResponse.error) throw playersResponse.error;

      setOlympic(olympicResponse.data);

      // Fetch scores for all games
      const { data: scores, error: scoresError } = await supabase
        .from('game_score')
        .select('game_id')
        .eq('olympic_id', olympicId);

      if (scoresError) throw scoresError;

      // Create a Set of game IDs that have scores
      const gamesWithScores = new Set(scores.map(score => score.game_id));

      // Process events and sort them alphabetically
      const processedEvents = eventsResponse.data
        .map(e => {
          const event = e.event;
          if (event && event.games) {
            event.games = event.games
              .map(({ game }) => ({
                ...game,
                hasScores: gamesWithScores.has(game.id)
              }))
              .sort((a, b) => b.weight - a.weight);
          }
          return event;
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));

      setEvents(processedEvents || []);
      setPlayers(playersResponse.data.map((p) => p.profiles).filter(Boolean) || []);

      if (!selectedEvent && processedEvents.length > 0) {
        setSelectedEvent(processedEvents[0].id);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingScores = async () => {
    if (!selectedGame || !selectedEvent) return;

    try {
      const { data: scores, error } = await supabase
        .from('game_score')
        .select('*')
        .eq('olympic_id', olympicId)
        .eq('event_id', selectedEvent)
        .eq('game_id', selectedGame)
        .order('score', { ascending: false });

      if (error) throw error;

      if (scores && scores.length > 0) {
        const newNumScoreRows = Math.max(scores.length, 4);
        setNumScoreRows(newNumScoreRows);

        const newScoreRows = Array(newNumScoreRows).fill({
          playerId: '',
          score: 0,
          points: 0
        });

        scores.forEach((score, index) => {
          if (index < newNumScoreRows) {
            newScoreRows[index] = {
              id: score.id,
              playerId: score.player_id,
              score: score.score,
              points: score.points,
              medal: score.medal,
            };
          }
        });

        setScoreRows(newScoreRows);
        // Only set overrideMedals to true if medals were explicitly set
        const hasExplicitMedals = scores.some(score => score.medal !== null);
        setOverrideMedals(hasExplicitMedals);
      } else {
        initializeScoreRows();
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getCurrentGame = () => {
    if (!selectedEvent || !selectedGame) return null;
    const event = events.find((e) => e.id === selectedEvent);
    return event?.games?.find((g) => g.id === selectedGame) || null;
  };

  const calculatePoints = (scores: ScoreRow[]) => {
    if (overrideMedals) {
      return scores.map(score => {
        switch (score.medal) {
          case 'gold': return 3;
          case 'silver': return 2;
          case 'bronze': return 1;
          default: return 0;
        }
      });
    }

    const validScores = scores.filter(s => s.playerId && s.score !== undefined && s.score !== null);
    const sortedScores = [...validScores].sort((a, b) => b.score - a.score);

    return scores.map(score => {
      if (!score.playerId || score.score === undefined || score.score === null) return 0;
      const position = sortedScores.findIndex(s => s.score === score.score && s.playerId === score.playerId);
      switch (position) {
        case 0: return 3;
        case 1: return 2;
        case 2: return 1;
        default: return 0;
      }
    });
  };

  const calculateMedals = (scores: ScoreRow[]) => {
    if (overrideMedals) {
      return scores.map(score => score.medal);
    }

    const validScores = scores.filter(s => s.playerId && s.score !== undefined && s.score !== null);
    const sortedScores = [...validScores].sort((a, b) => b.score - a.score);

    return scores.map(score => {
      if (!score.playerId || score.score === undefined || score.score === null) return null;
      const position = sortedScores.findIndex(s => s.score === score.score && s.playerId === score.playerId);
      switch (position) {
        case 0: return 'gold';
        case 1: return 'silver';
        case 2: return 'bronze';
        default: return null;
      }
    });
  };

  const handleSaveScores = async () => {
    if (!olympicId || !selectedEvent || !selectedGame) return;

    setSaving(true);
    setError(null);

    try {
      // Delete existing scores
      const { error: deleteError } = await supabase
        .from('game_score')
        .delete()
        .eq('olympic_id', olympicId)
        .eq('event_id', selectedEvent)
        .eq('game_id', selectedGame);

      if (deleteError) throw deleteError;

      // Calculate points and medals
      const points = calculatePoints(scoreRows);
      const medals = calculateMedals(scoreRows);

      // Insert new scores
      const validScores = scoreRows.filter(row => row.playerId && (row.score !== undefined && row.score !== null));
      if (validScores.length > 0) {
        const { error: insertError } = await supabase
          .from('game_score')
          .insert(
            validScores.map((row, index) => ({
              olympic_id: olympicId,
              event_id: selectedEvent,
              game_id: selectedGame,
              player_id: row.playerId,
              score: row.score,
              points: points[index],
              medal: medals[index],
            }))
          );

        if (insertError) throw insertError;

        // Lock the event assignments
        const { error: lockError } = await supabase
          .from('olympic_event')
          .update({ locked_at: new Date().toISOString() })
          .eq('olympic_id', olympicId)
          .eq('event_id', selectedEvent)
          .is('locked_at', null);

        if (lockError) throw lockError;
      }

      await fetchData();
      await fetchExistingScores();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const getMedalDisplay = (points: number, medal?: string) => {
    if (overrideMedals && medal) {
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
    }

    switch (points) {
      case 3:
        return <Medal className="h-5 w-5 text-yellow-500" title="Gold Medal" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" title="Silver Medal" />;
      case 1:
        return <Medal className="h-5 w-5 text-amber-600" title="Bronze Medal" />;
      default:
        return null;
    }
  };

  const getAvailablePlayerOptions = (currentRowIndex: number): PlayerOption[] => {
    const selectedPlayers = new Set(
      scoreRows
        .map((row, index) => index !== currentRowIndex ? row.playerId : null)
        .filter(Boolean)
    );

    return players
      .filter(player => !selectedPlayers.has(player.id))
      .map(player => ({
        value: player.id,
        label: player.full_name || player.username,
      }));
  };

  const handleAddPlayer = () => {
    if (numScoreRows < players.length) {
      setNumScoreRows(prev => prev + 1);
      setScoreRows(prev => [
        ...prev,
        { playerId: '', score: 0, points: 0 }
      ]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading scores...</div>
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
                  onClick={() => navigate(user?.is_admin ? '/admin/olympics' : '/')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <Trophy className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Scores - {olympic.name}
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

          <div className="flex min-h-[600px]">
            {/* Left Sidebar - Event/Game Tree */}
            <div className="w-64 border-r border-gray-200 bg-gray-50">
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
                              {game.hasScores && (
                                <span className="ml-2 text-xs text-green-600">(scored)</span>
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

            {/* Right Content - Score Entry Table */}
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

                  {user?.is_admin && (
                    <div className="mb-4 flex items-center">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={overrideMedals}
                          onChange={(e) => setOverrideMedals(e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Override Medals</span>
                      </label>
                    </div>
                  )}

                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
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
                            {overrideMedals ? 'Medal' : 'Medal & Points'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {scoreRows.map((row, index) => (
                          <tr key={index}>
                            <td className="py-2 pl-4 pr-3">
                              <Select
                                value={row.playerId ? { 
                                  value: row.playerId,
                                  label: players.find(p => p.id === row.playerId)?.full_name || 
                                        players.find(p => p.id === row.playerId)?.username
                                } : null}
                                onChange={(option) => {
                                  const newRows = [...scoreRows];
                                  newRows[index] = { ...row, playerId: option?.value || '' };
                                  setScoreRows(newRows);
                                }}
                                options={getAvailablePlayerOptions(index)}
                                isDisabled={!user?.is_admin}
                                placeholder="Select player..."
                                className="w-64"
                                isClearable
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                menuPlacement="auto"
                                styles={{
                                  menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999
                                  }),
                                  menu: (base) => ({
                                    ...base,
                                    zIndex: 9999
                                  })
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.score}
                                onChange={(e) => {
                                  const newRows = [...scoreRows];
                                  const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                                  newRows[index] = { ...row, score: value };
                                  setScoreRows(newRows);
                                }}
                                disabled={!user?.is_admin}
                                className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {overrideMedals ? (
                                <Select
                                  value={row.medal ? medalOptions.find(option => option.value === row.medal) : null}
                                  onChange={(option) => {
                                    const newRows = [...scoreRows];
                                    newRows[index] = { ...row, medal: option?.value };
                                    setScoreRows(newRows);
                                  }}
                                  options={medalOptions}
                                  isDisabled={!user?.is_admin || !row.playerId}
                                  placeholder="Select medal..."
                                  className="w-48"
                                  isClearable
                                  menuPortalTarget={document.body}
                                  menuPosition="fixed"
                                  menuPlacement="auto"
                                  styles={{
                                    menuPortal: (base) => ({
                                      ...base,
                                      zIndex: 9999
                                    }),
                                    menu: (base) => ({
                                      ...base,
                                      zIndex: 9999
                                    })
                                  }}
                                />
                              ) : (
                                <div className="flex items-center space-x-2">
                                  {getMedalDisplay(row.points, row.medal)}
                                  {row.points > 0 && (
                                    <span className="text-sm font-medium text-gray-900">
                                      {row.points} point{row.points !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 flex justify-between">
                    {numScoreRows < players.length && (
                      <button
                        onClick={handleAddPlayer}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add Player
                      </button>
                    )}

                    {user?.is_admin && (
                      <button
                        onClick={handleSaveScores}
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                      >
                        <Save className="h-5 w-5 mr-2" />
                        {saving ? 'Saving...' : 'Save Scores'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select an event and game from the sidebar to enter scores
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}