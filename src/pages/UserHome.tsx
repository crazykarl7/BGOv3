import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { Olympic } from '../types/database';
import { Trophy, Medal, User, LogOut, Calendar, ChevronRight, Users, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

interface OlympicModalProps {
  olympic: Olympic;
  onClose: () => void;
}

function OlympicInfoModal({ olympic, onClose }: OlympicModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{olympic.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="sr-only">Close</span>
            ×
          </button>
        </div>
        <div className="mb-4 text-gray-600">
          <p>Date: {format(new Date(olympic.date), 'MMMM d, yyyy')}</p>
          <p>Registration Deadline: {format(new Date(olympic.registration_deadline), 'MMMM d, yyyy')}</p>
        </div>
        {olympic.description && (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: olympic.description }}
          />
        )}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserHome() {
  const [registeredOlympics, setRegisteredOlympics] = useState<Olympic[]>([]);
  const [availableOlympics, setAvailableOlympics] = useState<Olympic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [selectedOlympic, setSelectedOlympic] = useState<Olympic | null>(null);
  const [playerIsPresent, setPlayerIsPresent] = useState<boolean>(false);
  const [updatingPresence, setUpdatingPresence] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchOlympics();
    // Initialize player presence status from user data
    if (user?.is_present !== undefined && user?.is_present !== null) {
      setPlayerIsPresent(user.is_present);
    }
  }, []);

  useEffect(() => {
    // Update local state when user data changes
    if (user?.is_present !== undefined && user?.is_present !== null) {
      setPlayerIsPresent(user.is_present);
    }
  }, [user?.is_present]);

  const fetchOlympics = async () => {
    try {
      // Fetch registered olympics
      const { data: registeredData, error: registeredError } = await supabase
        .from('olympic_player')
        .select(`
          olympic:olympic_id (
            id,
            name,
            description,
            date,
            registration_deadline,
            created_at
          )
        `)
        .eq('player_id', user?.id)
        .order('created_at', { foreignTable: 'olympic', ascending: false });

      if (registeredError) throw registeredError;

      // Fetch available olympics (where registration is still open)
      const { data: availableData, error: availableError } = await supabase
        .from('olympic')
        .select('*')
        .gte('registration_deadline', new Date().toISOString())
        .order('date', { ascending: true });

      if (availableError) throw availableError;

      // Filter out already registered olympics from available ones
      const registeredIds = new Set(registeredData.map(item => item.olympic.id));
      const availableOlympics = availableData.filter(olympic => !registeredIds.has(olympic.id));

      const registeredOlympics = registeredData.map(item => item.olympic);
      setRegisteredOlympics(registeredOlympics);
      setAvailableOlympics(availableOlympics);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (olympicId: string) => {
    if (!user) return;
    setRegistering(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('olympic_player')
        .insert({ olympic_id: olympicId, player_id: user.id });

      if (error) throw error;

      await fetchOlympics();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleTogglePresence = async () => {
    if (!user) return;
    
    setUpdatingPresence(true);
    const newPresenceStatus = !playerIsPresent;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_present: newPresenceStatus })
        .eq('id', user.id);

      if (error) throw error;

      setPlayerIsPresent(newPresenceStatus);
      
      // Update the user in the auth store
      const updatedUser = { ...user, is_present: newPresenceStatus };
      useAuthStore.getState().setUser(updatedUser);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUpdatingPresence(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const renderOlympicCard = (olympic: Olympic, isRegistered: boolean = false) => (
    <div
      key={olympic.id}
      className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{olympic.name}</h3>
        {olympic.description && (
          <div className="mb-4">
            <div className="text-sm text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: olympic.description }} />
            <button
              onClick={() => setSelectedOlympic(olympic)}
              className="text-indigo-600 hover:text-indigo-700 text-sm mt-1 flex items-center"
            >
              Show More
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        )}
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-500">
            Date: {format(new Date(olympic.date), 'MMMM d, yyyy')}
          </p>
          <p className="text-sm text-gray-500">
            Registration closes:{' '}
            {format(new Date(olympic.registration_deadline), 'MMMM d, yyyy')}
          </p>
        </div>
        {!isRegistered && (
          <button
            onClick={() => handleRegister(olympic.id)}
            disabled={registering}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {registering ? 'Registering...' : 'Register'}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading olympics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Trophy className="h-6 w-6 text-white mr-2" />
                <h1 className="text-xl font-semibold text-white">Olympics</h1>
              </div>
              <div className="flex items-center space-x-4">
                {/*    <button
                  onClick={handleTogglePresence}
                  disabled={updatingPresence}
                  className={clsx(
                    'flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white transition-colors',
                    playerIsPresent
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-600 hover:bg-gray-700',
                    updatingPresence && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {playerIsPresent ? (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  )}
                </button> */}
                <button
                  onClick={() => navigate(`/profile/${user?.id}`)}
                  className="text-white hover:text-indigo-100 flex items-center"
                >
                  <User className="h-5 w-5 mr-2" />
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="text-white hover:text-indigo-100 flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
 <div>
  <h2 className="text-lg font-medium text-gray-900 mb-4">Playing Status</h2><button
                  onClick={handleTogglePresence}
                  disabled={updatingPresence}
                  className={clsx(
                    'flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white transition-colors',
                    playerIsPresent
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-600 hover:bg-gray-700',
                    updatingPresence && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {playerIsPresent ? (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Play
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  )}
                </button></div>
            {/* Available Olympics */}
            {availableOlympics.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Available Olympics</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {availableOlympics.map((olympic) => renderOlympicCard(olympic))}
                </div>
              </div>
            )}

            {/* Registered Olympics */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">My Olympics</h2>
              {registeredOlympics.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No Olympics</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You are not participating in any olympics yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                          Olympic
                        </th>
                        <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Date
                        </th>
                        <th scope="col" className="hidden sm:table-cell relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {registeredOlympics.map((olympic) => (
                        <tr key={olympic.id} className="block sm:table-row border-b border-gray-200 sm:border-none">
                          <td className="block sm:table-cell py-4 pl-4 pr-3 text-sm">
                            <div>
                              <div className="font-medium text-gray-900">{olympic.name}</div>
                              {olympic.description && (
                                <div>
                                  <div className="text-gray-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: olympic.description }} />
                                  <button
                                    onClick={() => setSelectedOlympic(olympic)}
                                    className="text-indigo-600 hover:text-indigo-700 text-sm mt-1 flex items-center"
                                  >
                                    Show More
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {/* Mobile-only content */}
                            <div className="sm:hidden mt-3 space-y-2">
                              <div className="text-sm text-gray-500">
                                <span className="font-medium">Date:</span> {format(new Date(olympic.date), 'MMMM d, yyyy')}
                              </div>
                              <div className="flex flex-wrap justify-start gap-2 mt-2">
                                <button
                                  onClick={() => navigate(`/olympics/${olympic.id}/teams`)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                >
                                  <Users className="h-5 w-5 mr-1" />
                                  Team
                                </button>
                                <button
                                  onClick={() => navigate(`/olympics/${olympic.id}/my-scores`)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                >
                                  <Medal className="h-5 w-5 mr-1" />
                                  Scores
                                </button>
                                <button
                                  onClick={() => navigate(`/olympics/${olympic.id}/leaderboard`)}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center"
                                >
                                  <Trophy className="h-5 w-5 mr-1" />
                                  Leaderboard
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {format(new Date(olympic.date), 'MMMM d, yyyy')}
                          </td>
                          <td className="hidden sm:table-cell py-4 pl-3 pr-4 text-right text-sm font-medium">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => navigate(`/olympics/${olympic.id}/teams`)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <Users className="h-5 w-5 mr-1" />
                                Team
                              </button>
                              {/*} <button
                                onClick={() => navigate(`/olympics/${olympic.id}/scores`)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <Medal className="h-5 w-5 mr-1" />
                                Scores
                              </button> */}
                              <button
                                onClick={() => navigate(`/olympics/${olympic.id}/my-scores`)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <Medal className="h-5 w-5 mr-1" />
                                Scores
                              </button>
                              <button
                                onClick={() => navigate(`/olympics/${olympic.id}/leaderboard`)}
                                className="text-indigo-600 hover:text-indigo-900 flex items-center"
                              >
                                <Trophy className="h-5 w-5 mr-1" />
                                Leaderboard
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedOlympic && (
        <OlympicInfoModal
          olympic={selectedOlympic}
          onClose={() => setSelectedOlympic(null)}
        />
      )}
    </div>
  );
}