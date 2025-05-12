import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Olympic, Event, Game } from '../types/database';
import { ListChecks, ArrowLeft, LogOut, Search, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

export default function OlympicEvents() {
  const { olympicId } = useParams();
  const [olympic, setOlympic] = useState<Olympic | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [olympicId]);

  const fetchData = async () => {
    try {
      const [olympicResponse, eventsResponse, olympicEventsResponse] = await Promise.all([
        supabase.from('olympic').select('*').eq('id', olympicId).single(),
        supabase.from('event').select(`
          *,
          games:event_game (
            game:game_id (*)
          )
        `).order('name'),
        supabase.from('olympic_event').select('event_id').eq('olympic_id', olympicId),
      ]);

      if (olympicResponse.error) throw olympicResponse.error;
      if (eventsResponse.error) throw eventsResponse.error;
      if (olympicEventsResponse.error) throw olympicEventsResponse.error;

      setOlympic(olympicResponse.data);
      setEvents(eventsResponse.data || []);
      setSelectedEvents(
        new Set(olympicEventsResponse.data.map((oe) => oe.event_id))
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const toggleEventExpand = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleSave = async () => {
    if (!olympicId) return;
    setSaving(true);
    setError(null);

    try {
      // Delete existing associations
      const { error: deleteError } = await supabase
        .from('olympic_event')
        .delete()
        .eq('olympic_id', olympicId);

      if (deleteError) throw deleteError;

      // Insert new associations
      if (selectedEvents.size > 0) {
        const { error: insertError } = await supabase.from('olympic_event').insert(
          Array.from(selectedEvents).map((eventId) => ({
            olympic_id: olympicId,
            event_id: eventId,
          }))
        );

        if (insertError) throw insertError;
      }

      navigate('/admin/olympics');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = events.filter((event) =>
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading events...</div>
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
                  <ListChecks className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">
                    Manage Categories - {olympic.name}
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

            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className={clsx(
                    'border rounded-lg transition-colors duration-200',
                    selectedEvents.has(event.id)
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200'
                  )}
                >
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleEvent(event.id)}
                  >
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                      {event.description && (
                        <p className="mt-1 text-sm text-gray-500">{event.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <ListChecks className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">
                          {event.games?.length || 0} games
                        </span>
                      </div>
                      <button
                        onClick={(e) => toggleEventExpand(event.id, e)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        {expandedEvents.has(event.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      {selectedEvents.has(event.id) ? (
                        <Check className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <X className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {expandedEvents.has(event.id) && event.games && event.games.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Associated Games</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {event.games.map(({ game }) => (
                          <div
                            key={game.id}
                            className="bg-white p-3 rounded border border-gray-200"
                          >
                            <div className="font-medium text-gray-900">{game.name}</div>
                            <div className="text-sm text-gray-500">
                              {game.min_players}-{game.max_players} players
                            </div>
                            {game.description && (
                              <div className="mt-1 text-sm text-gray-500 line-clamp-2">
                                {game.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => navigate('/admin/olympics')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}