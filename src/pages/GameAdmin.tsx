import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Event, Game } from '../types/database';
import {
  GamepadIcon,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  LogOut,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  LayoutGrid,
  Grid2x2,
  ChevronRight,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import clsx from 'clsx';

interface GameModalProps {
  game: Game;
  onClose: () => void;
}

function GameDescriptionModal({ game, onClose }: GameModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">{game.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="prose max-w-none">
          {game.description}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type EditingItem = {
  type: 'game' | 'event';
  item: Partial<Game | Event>;
};

interface EditingGameData extends Partial<Game> {
  name: string;
  min_players: number;
  max_players: number;
  weight: number;
  description?: string;
  bgg_id?: string;
}

interface EditingEventData extends Partial<Event> {
  name: string;
  description?: string;
}

type Tab = 'games' | 'categories';

function GameAdmin() {
  const [games, setGames] = useState<Game[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editingGameData, setEditingGameData] = useState<EditingGameData | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventData, setEditingEventData] = useState<EditingEventData | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [showPlanningTable, setShowPlanningTable] = useState<Set<string>>(new Set());
  const [showBGGImportModal, setShowBGGImportModal] = useState(false);
  const [showGeeklistImportModal, setShowGeeklistImportModal] = useState(false);
  const [bggGameId, setBggGameId] = useState('');
  const [geeklistId, setGeeklistId] = useState('');
  const [createEvent, setCreateEvent] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('games');
  const [showAllGames, setShowAllGames] = useState<Set<string>>(new Set());
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSortOrder, setGameSortOrder] = useState<'name_asc' | 'weight_asc'>('weight_asc');
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gamesResponse, eventsResponse] = await Promise.all([
        supabase.from('game').select('*').order('name'),
        supabase.from('event').select(`
          *,
          event_game (
            game:game_id (*)
          )
        `).order('name'),
      ]);

      if (gamesResponse.error) throw gamesResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;

      setGames(gamesResponse.data || []);
      const eventsWithGames = eventsResponse.data?.map(event => ({
        ...event,
        games: event.event_game?.map(eg => eg.game)
      })) || [];
      setEvents(eventsWithGames);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateBGGId = async (bggId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('id')
        .eq('bgg_id', bggId)
        .limit(1);

      if (error) {
        console.error('Error checking BGG ID:', error);
        return false;
      }

      return data.length === 0;
    } catch (error: any) {
      console.error('Error validating BGG ID:', error);
      return false;
    }
  };

  const handleBGGImport = async () => {
    setImporting(true);
    setError(null);
    
    try {
      const gameId = parseInt(bggGameId, 10);
      if (isNaN(gameId)) {
        throw new Error('Invalid Game ID');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy?gameId=${gameId}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch game data from BGG');
      }

      const result = await response.json();

      if (!result.boardgames?.boardgame?.[0]) {
        throw new Error('Game not found');
      }

      const game = result.boardgames.boardgame[0];
      const name = game.name[0]._ || game.name[0];
      const description = game.description?.[0] || '';
      const minPlayers = parseInt(game.minplayers?.[0] || '0', 10);
      const maxPlayers = parseInt(game.maxplayers?.[0] || '0', 10);
      const weight = parseFloat(game.statistics?.[0]?.ratings?.[0]?.averageweight?.[0] || '0');
      const bggId = game.$?.objectid;

      if (!name || isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(weight)) {
        throw new Error('Invalid or incomplete data from BGG');
      }

      const isBGGIdUnique = await validateBGGId(bggId);
      if (!isBGGIdUnique) {
        setError(`Board game with BGGID ${bggId} already exists in the database`);
        return;
      }

      const roundedWeight = Math.round(weight * 100) / 100;
      const constrainedWeight = Math.min(Math.max(roundedWeight || 1, 0), 5);

      setEditingGameId('new');
      setEditingGameData({
        name,
        min_players: minPlayers || 1,
        max_players: maxPlayers || 1,
        weight: constrainedWeight,
        description: description.replace(/<[^>]*>/g, ''),
        bgg_id: bggId,
      });
      setEditingEventId(null);
      setEditingEventData(null);

      setShowBGGImportModal(false);
      setBggGameId('');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleGeeklistImport = async () => {
    setImporting(true);
    setError(null);
    setImportProgress({ current: 0, total: 0 });
    
    try {
      const id = parseInt(geeklistId, 10);
      if (isNaN(id)) {
        throw new Error('Invalid Geeklist ID');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy?geeklistId=${id}`,
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch Geeklist data from BGG');
      }

      const result = await response.json();
      const geeklist = result.geeklist;
      const items = geeklist?.item || [];
      
      if (!items.length) {
        throw new Error('No games found in Geeklist');
      }

      setImportProgress({ current: 0, total: items.length });

      let eventId: string | null = null;
      if (createEvent && geeklist.title) {
        const { data: eventData, error: eventError } = await supabase
          .from('event')
          .insert([{
            name: geeklist.title[0],
            description: geeklist.description?.[0] || null
          }])
          .select()
          .single();

        if (eventError) throw eventError;
        eventId = eventData.id;
      }

      const gameIds: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const gameId = item.$.objectid;
        
        try {
          const { data: existingGame } = await supabase
            .from('game')
            .select('id')
            .eq('bgg_id', gameId)
            .single();

          if (existingGame) {
            gameIds.push(existingGame.id);
            setImportProgress(prev => ({ ...prev, current: i + 1 }));
            continue;
          }

          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bgg-proxy?gameId=${gameId}`,
            {
              headers: {
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
            }
          );

          if (!response.ok) continue;

          const result = await response.json();
          const game = result.boardgames?.boardgame?.[0];
          
          if (!game) continue;

          const name = game.name[0]._ || game.name[0];
          const description = game.description?.[0] || '';
          const minPlayers = parseInt(game.minplayers?.[0] || '0', 10);
          const maxPlayers = parseInt(game.maxplayers?.[0] || '0', 10);
          const weight = parseFloat(game.statistics?.[0]?.ratings?.[0]?.averageweight?.[0] || '0');
          const bggId = game.$?.objectid;

          if (!name || isNaN(minPlayers) || isNaN(maxPlayers) || isNaN(weight)) continue;

          const roundedWeight = Math.round(weight * 100) / 100;
          const constrainedWeight = Math.min(Math.max(roundedWeight || 1, 0), 5);

          const { data: newGame, error: insertError } = await supabase
            .from('game')
            .insert([{
              name,
              min_players: minPlayers || 1,
              max_players: maxPlayers || 1,
              weight: constrainedWeight,
              description: description.replace(/<[^>]*>/g, ''),
              bgg_id: bggId,
            }])
            .select()
            .single();

          if (insertError) throw insertError;
          gameIds.push(newGame.id);

          setImportProgress(prev => ({ ...prev, current: i + 1 }));
        } catch (error) {
          console.error(`Failed to import game ${gameId}:`, error);
          continue;
        }
      }

      if (eventId && gameIds.length > 0) {
        const { error: associationError } = await supabase
          .from('event_game')
          .insert(
            gameIds.map(gameId => ({
              event_id: eventId,
              game_id: gameId
            }))
          );

        if (associationError) throw associationError;
      }

      await fetchData();
      setShowGeeklistImportModal(false);
      setGeeklistId('');
      setCreateEvent(true);

      const message = createEvent
        ? `Successfully imported ${gameIds.length} games and created event "${geeklist.title[0]}"`
        : `Successfully imported ${gameIds.length} games`;
      setError(message);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  const handleGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGameData) return;

    if (!editingGameData.name || !editingGameData.min_players || !editingGameData.max_players || !editingGameData.weight) {
      setError('All fields except description and BGG ID are required');
      return;
    }

    try {
      if (editingGameData.bgg_id && !editingGameData.id) {
        const isBGGIdUnique = await validateBGGId(editingGameData.bgg_id);
        if (!isBGGIdUnique) {
          setError(`Board game with BGGID ${editingGameData.bgg_id} already exists in the database`);
          return;
        }
      }

      const { error } = editingGameData.id
        ? await supabase
            .from('game')
            .update({
              name: editingGameData.name,
              min_players: editingGameData.min_players,
              max_players: editingGameData.max_players,
              weight: editingGameData.weight,
              description: editingGameData.description,
              bgg_id: editingGameData.bgg_id,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingGameData.id)
        : await supabase.from('game').insert([editingGameData]);

      if (error) throw error;
      await fetchData();
      setEditingGameId(null);
      setEditingGameData(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEventData) return;

    if (!editingEventData.name) {
      setError('Event name is required');
      return;
    }

    try {
      const { error } = editingEventData.id
        ? await supabase
            .from('event')
            .update({
              name: editingEventData.name,
              description: editingEventData.description,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingEventData.id)
        : await supabase.from('event').insert([editingEventData]);

      if (error) throw error;
      await fetchData();
      setEditingEventId(null);
      setEditingEventData(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (type: 'game' | 'event', id: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const { error } = await supabase.from(type).delete().eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const toggleEventGames = async (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (expandedEvents.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleGameAssignment = async (eventId: string, gameId: string, isAssigning: boolean) => {
    try {
      const { error } = isAssigning
        ? await supabase.from('event_game').insert([{ event_id: eventId, game_id: gameId }])
        : await supabase
            .from('event_game')
            .delete()
            .eq('event_id', eventId)
            .eq('game_id', gameId);

      if (error) throw error;
      await fetchData();
    } catch (error: any) {
      setError(error.message);
    }
  };

  const filteredGames = (eventId: string, eventGames: Game[] = []) => {
    const baseGames = showAllGames.has(eventId) ? games : eventGames;
    const filtered = baseGames.filter(game => 
      game.name.toLowerCase().includes(gameSearchQuery.toLowerCase()) ||
      (game.description && game.description.toLowerCase().includes(gameSearchQuery.toLowerCase()))
    );
    
    // Apply sorting
    return filtered.sort((a, b) => {
      if (gameSortOrder === 'name_asc') {
        return a.name.localeCompare(b.name);
      } else {
        return a.weight - b.weight;
      }
    });
  };

  const toggleShowAllGames = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newShowAll = new Set(showAllGames);
    if (showAllGames.has(eventId)) {
      newShowAll.delete(eventId);
    } else {
      newShowAll.add(eventId);
    }
    setShowAllGames(newShowAll);
  };

  const togglePlanningTable = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newShowPlanning = new Set(showPlanningTable);
    if (showPlanningTable.has(eventId)) {
      newShowPlanning.delete(eventId);
    } else {
      newShowPlanning.add(eventId);
    }
    setShowPlanningTable(newShowPlanning);
  };

  const renderGameDescription = (game: Game) => {
    if (!game.description) return null;

    return (
      <div className="mt-1">
        <div className="text-gray-500 line-clamp-2">
          {game.description}
        </div>
        <button
          onClick={() => setSelectedGame(game)}
          className="text-indigo-600 hover:text-indigo-700 text-sm mt-1 flex items-center"
        >
          Show More
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    );
  };

  const renderGamesTable = () => (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
              Name
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Players
            </th>
            <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
              Weight
            </th>
            <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {games.map((game) => (
            <tr key={game.id}>
              <td className="py-4 pl-4 pr-3 text-sm">
                <div className="font-medium text-gray-900">
                  {game.bgg_id ? (
                    <a
                      href={`https://boardgamegeek.com/boardgame/${game.bgg_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 hover:underline"
                    >
                      {game.name}
                    </a>
                  ) : (
                    game.name
                  )}
                </div>
                {renderGameDescription(game)}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">
                {game.min_players === game.max_players
                  ? game.min_players
                  : `${game.min_players}-${game.max_players}`}
              </td>
              <td className="px-3 py-4 text-sm text-gray-500">{game.weight.toFixed(2)}</td>
              <td className="py-4 pl-3 pr-4 text-right text-sm font-medium">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setEditing({ type: 'game', item: game })}
                    className="text-indigo-600 hover:text-indigo-900"
                    title="Edit"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete('game', game.id)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading games and categories...</div>
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
                  onClick={() => navigate('/admin')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <GamepadIcon className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">Games & Category Management</h1>
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
                onClick={() => setActiveTab('games')}
                className={clsx(
                  'px-8 py-4 text-sm font-medium flex items-center border-b-2 whitespace-nowrap',
                  activeTab === 'games'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <GamepadIcon className="h-5 w-5 mr-2" />
                Games
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={clsx(
                  'px-8 py-4 text-sm font-medium flex items-center border-b-2 whitespace-nowrap',
                  activeTab === 'categories'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Grid2x2 className="h-5 w-5 mr-2" />
                Categories
              </button>
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className={clsx(
                'mb-4 p-4 rounded',
                error.toLowerCase().includes('success')
                  ? 'bg-green-100 text-green-700 border border-green-400'
                  : 'bg-red-100 text-red-700 border border-red-400'
              )}>
                {error}
              </div>
            )}

            {activeTab === 'games' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Games</h2>
                  <div className="flex space-x-4">
                    <button
                      onClick={() =>
                        {
                          setEditingGameId('new');
                          setEditingGameData({
                            name: '',
                            min_players: 2,
                            max_players: 4,
                            weight: 1.0,
                            description: '',
                            bgg_id: '',
                          });
                          setEditingEventId(null);
                          setEditingEventData(null);
                        }
                      }
                      className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Game
                    </button>
                    <button
                      onClick={() => setShowBGGImportModal(true)}
                      className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      BGG Import
                    </button>
                    <button
                      onClick={() => setShowGeeklistImportModal(true)}
                      className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Import from Geeklist
                    </button>
                  </div>
                </div>

                {renderGamesTable()}
              </div>
            )}

            {activeTab === 'categories' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Categories</h2>
                  <button
                    onClick={() =>
                      {
                        setEditingEventId('new');
                        setEditingEventData({ name: '', description: '' });
                        setEditingGameId(null);
                        setEditingGameData(null);
                      }
                    }
                    className="flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add category
                  </button>
                </div>

                {editingEventId === 'new' && editingEventData && (
                  <div className="mb-6 bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Add New Category</h3>
                    <form onSubmit={handleEventSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            value={editingEventData.name || ''}
                            onChange={(e) =>
                              setEditingEventData({
                                ...editingEventData,
                                name: e.target.value,
                              })
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <textarea
                            value={editingEventData.description || ''}
                            onChange={(e) =>
                              setEditingEventData({
                                ...editingEventData,
                                description: e.target.value,
                              })
                            }
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEventId(null);
                            setEditingEventData(null);
                          }}
                          className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Create
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="space-y-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white shadow rounded-lg overflow-hidden border border-gray-200"
                    >
                      <div
                        className="px-4 py-5 sm:px-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleEventGames(event.id)}
                      >
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500">
                              {event.games?.length || 0} games
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingEventId(event.id);
                              setEditingEventData(event);
                              setEditingGameId(null);
                              setEditingGameData(null);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete('event', event.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={(e) => togglePlanningTable(event.id, e)}
                            className="text-green-600 hover:text-green-900"
                            title="Planning"
                          >
                            <ListChecks className="h-5 w-5" />
                          </button>
                          {expandedEvents.has(event.id) ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {editingEventId === event.id && editingEventData && (
                        <div className="px-4 py-5 sm:px-6 border-t border-gray-200 bg-gray-50">
                          <h3 className="text-lg font-medium mb-4">Edit Category</h3>
                          <form onSubmit={handleEventSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-1 md:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                  type="text"
                                  value={editingEventData.name || ''}
                                  onChange={(e) =>
                                    setEditingEventData({
                                      ...editingEventData,
                                      name: e.target.value,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                  value={editingEventData.description || ''}
                                  onChange={(e) =>
                                    setEditingEventData({
                                      ...editingEventData,
                                      description: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEventId(null);
                                  setEditingEventData(null);
                                }}
                                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                              >
                                Update
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {showPlanningTable.has(event.id) && event.games && event.games.length > 0 && (
                        <div className="px-4 py-5 sm:px-6 border-t border-gray-200 bg-white">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Planning Table</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Table
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                  </th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Weight
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {event.games.map((gameWrapper, index) => (
                                  <tr key={gameWrapper.game.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                      {gameWrapper.game.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {gameWrapper.game.weight.toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {expandedEvents.has(event.id) && (
                        <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                          <div className="mb-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                              <div className="relative flex-1 w-full sm:w-auto">
                                <input
                                  type="text"
                                  placeholder="Search games..."
                                  value={gameSearchQuery}
                                  onChange={(e) => setGameSearchQuery(e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                              </div>
                              <div className="flex items-center space-x-2">
                                <select
                                  value={gameSortOrder}
                                  onChange={(e) => setGameSortOrder(e.target.value as 'name_asc' | 'weight_asc')}
                                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="weight_asc">Sort by Weight (Low to High)</option>
                                  <option value="name_asc">Sort by Name (A-Z)</option>
                                </select>
                                <button
                                  onClick={(e) => toggleShowAllGames(event.id, e)}
                                  className={clsx(
                                    'flex items-center px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap',
                                    showAllGames.has(event.id)
                                      ? 'bg-indigo-100 text-indigo-700'
                                      : 'bg-gray-100 text-gray-700'
                                  )}
                                >
                                  <Filter className="h-4 w-4 mr-2" />
                                  <span className="hidden sm:inline">
                                    {showAllGames.has(event.id) ? 'Showing All Games' : 'Showing Category Games'}
                                  </span>
                                  <span className="sm:hidden">
                                    {showAllGames.has(event.id) ? 'All' : 'Category'}
                                  </span>
                    <React.Fragment key={game.id}>
                      <tr>
                        <td className="py-4 pl-4 pr-3 text-sm">
                          <div className="font-medium text-gray-900">
                            {game.bgg_id ? (
                              <a
                                href={`https://boardgamegeek.com/boardgame/${game.bgg_id}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900 hover:underline"
                              >
                                {game.name}
                              </a>
                            ) : (
                              game.name
                            )}
                          </div>
                          {renderGameDescription(game)}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {game.min_players === game.max_players
                            ? game.min_players
                            : `${game.min_players}-${game.max_players}`}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">{game.weight.toFixed(2)}</td>
                        <td className="py-4 pl-3 pr-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-3">
                            <button
                              onClick={() => {
                                setEditingGameId(game.id);
                                setEditingGameData(game);
                                setEditingEventId(null);
                                setEditingEventData(null);
                              }}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete('game', game.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingGameId === game.id && editingGameData && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 bg-gray-50">
                            <div className="max-w-4xl">
                              <h3 className="text-lg font-medium mb-4">Edit Game</h3>
                              <form onSubmit={handleGameSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Name</label>
                                    <input
                                      type="text"
                                      value={editingGameData.name || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          name: e.target.value,
                                        })
                                      }
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Minimum Players
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editingGameData.min_players || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          min_players: parseInt(e.target.value),
                                        })
                                      }
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Maximum Players
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      value={editingGameData.max_players || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          max_players: parseInt(e.target.value),
                                        })
                                      }
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">Weight</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max="5"
                                      value={editingGameData.weight || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          weight: parseFloat(e.target.value),
                                        })
                                      }
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <textarea
                                      value={editingGameData.description || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          description: e.target.value,
                                        })
                                      }
                                      rows={3}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">BGG ID</label>
                                    <input
                                      type="text"
                                      value={editingGameData.bgg_id || ''}
                                      onChange={(e) =>
                                        setEditingGameData({
                                          ...editingGameData,
                                          bgg_id: e.target.value,
                                        })
                                      }
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingGameId(null);
                                      setEditingGameData(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                  >
                                    Update
                                  </button>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {editingGameId === 'new' && editingGameData && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 bg-gray-50">
                        <div className="max-w-4xl">
                          <h3 className="text-lg font-medium mb-4">Add New Game</h3>
                          <form onSubmit={handleGameSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Name</label>
                                <input
                                  type="text"
                                  value={editingGameData.name || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      name: e.target.value,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Minimum Players
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editingGameData.min_players || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      min_players: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Maximum Players
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={editingGameData.max_players || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      max_players: parseInt(e.target.value),
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Weight</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="5"
                                  value={editingGameData.weight || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      weight: parseFloat(e.target.value),
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                  value={editingGameData.description || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      description: e.target.value,
                                    })
                                  }
                                  rows={3}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">BGG ID</label>
                                <input
                                  type="text"
                                  value={editingGameData.bgg_id || ''}
                                  onChange={(e) =>
                                    setEditingGameData({
                                      ...editingGameData,
                                      bgg_id: e.target.value,
                                    })
                                  }
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingGameId(null);
                                  setEditingGameData(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                              >
                                Create
                              </button>
                            </div>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showBGGImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import from BoardGameGeek</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">BGG Game ID</label>
                <input
                  type="text"
                  value={bggGameId}
                  onChange={(e) => setBggGameId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter BGG Game ID"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBGGImportModal(false);
                    setBggGameId('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBGGImport}
                  disabled={importing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <div className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Importing...
                    </div>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGeeklistImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Import from BGG Geeklist</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Geeklist ID</label>
                <input
                  type="text"
                  value={geeklistId}
                  onChange={(e) => setGeeklistId(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Enter Geeklist ID"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={createEvent}
                    onChange={(e) => setCreateEvent(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Create Category from Geeklist
                  </span>
                </label>
              </div>
              {importing && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Importing games...</span>
                    <span>
                      {importProgress.current} / {importProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowGeeklistImportModal(false);
                    setGeeklistId('');
                    setCreateEvent(true);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGeeklistImport}
                  disabled={importing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <div className="flex items-center">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Importing...
                    </div>
                  ) : (
                    'Import'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedGame && (
        <GameDescriptionModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}

export default GameAdmin;