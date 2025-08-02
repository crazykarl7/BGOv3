import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Olympic } from '../types/database';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Medal,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Trophy,
  ArrowLeft,
  LogOut,
  ListChecks,
  Shuffle,
} from 'lucide-react';

export default function OlympicAdmin() {
  const [olympics, setOlympics] = useState<Olympic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentOlympic, setCurrentOlympic] = useState<Partial<Olympic>>({
    name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    registration_deadline: format(new Date(), 'yyyy-MM-dd'),
    description: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchOlympics();
  }, []);

  const fetchOlympics = async () => {
    try {
      const { data, error } = await supabase
        .from('olympic')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setOlympics(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!currentOlympic.name || !currentOlympic.date || !currentOlympic.registration_deadline) {
        throw new Error('Name, date, and registration deadline are required');
      }

      const { data, error } = currentOlympic.id
        ? await supabase
            .from('olympic')
            .update({
              name: currentOlympic.name,
              date: currentOlympic.date,
              registration_deadline: currentOlympic.registration_deadline,
              description: currentOlympic.description,
              updated_at: new Date().toISOString(),
            })
            .eq('id', currentOlympic.id)
            .select()
        : await supabase
            .from('olympic')
            .insert({
              name: currentOlympic.name,
              date: currentOlympic.date,
              registration_deadline: currentOlympic.registration_deadline,
              description: currentOlympic.description,
            })
            .select();

      if (error) throw error;

      await fetchOlympics();
      setIsEditing(false);
      setCurrentOlympic({
        name: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        registration_deadline: format(new Date(), 'yyyy-MM-dd'),
        description: '',
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEdit = (olympic: Olympic) => {
    setCurrentOlympic({
      id: olympic.id,
      name: olympic.name,
      date: format(new Date(olympic.date), 'yyyy-MM-dd'),
      registration_deadline: format(new Date(olympic.registration_deadline), 'yyyy-MM-dd'),
      description: olympic.description || '',
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this olympic?')) return;

    try {
      const { error } = await supabase.from('olympic').delete().eq('id', id);
      if (error) throw error;
      await fetchOlympics();
    } catch (error: any) {
      setError(error.message);
    }
  };

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
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/admin')}
                  className="text-white hover:text-indigo-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <Medal className="h-6 w-6 text-white mr-2" />
                  <h1 className="text-xl font-semibold text-white">Olympics Management</h1>
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

            {isEditing ? (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h2 className="text-lg font-medium mb-4">
                  {currentOlympic.id ? 'Edit Olympic' : 'Create New Olympic'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={currentOlympic.name}
                      onChange={(e) =>
                        setCurrentOlympic({ ...currentOlympic, name: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={currentOlympic.date}
                      onChange={(e) =>
                        setCurrentOlympic({ ...currentOlympic, date: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Registration Deadline
                    </label>
                    <input
                      type="date"
                      value={currentOlympic.registration_deadline}
                      onChange={(e) =>
                        setCurrentOlympic({
                          ...currentOlympic,
                          registration_deadline: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <div className="prose max-w-none">
                      <ReactQuill
                        value={currentOlympic.description || ''}
                        onChange={(content) =>
                          setCurrentOlympic({ ...currentOlympic, description: content })
                        }
                        className="bg-white"
                        modules={{
                          toolbar: [
                            [{ header: [1, 2, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ list: 'ordered' }, { list: 'bullet' }],
                            [{ color: [] }, { background: [] }],
                            ['link', 'image'],
                            ['clean'],
                          ],
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setCurrentOlympic({
                          name: '',
                          date: format(new Date(), 'yyyy-MM-dd'),
                          registration_deadline: format(new Date(), 'yyyy-MM-dd'),
                          description: '',
                        });
                      }}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      {currentOlympic.id ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="mb-6 flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Olympic
              </button>
            )}

            <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Registration Deadline
                    </th>
                    <th className="hidden sm:table-cell relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {olympics.map((olympic) => (
                    <tr key={olympic.id} className="block sm:table-row border-b border-gray-200 sm:border-none">
                      <td className="block sm:table-cell py-4 pl-4 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{olympic.name}</div>
                        {olympic.description && (
                          <div
                            className="mt-1 text-gray-500 prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: olympic.description }}
                          />
                        )}
                        {/* Mobile-only content */}
                        <div className="sm:hidden mt-3 space-y-2">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Date:</span> {format(new Date(olympic.date), 'MMMM d, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Registration Deadline:</span> {format(new Date(olympic.registration_deadline), 'MMMM d, yyyy')}
                          </div>
                          <div className="flex flex-wrap justify-start gap-1 mt-2">
                            <button
                              onClick={() => navigate(`/admin/olympics/${olympic.id}/players`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Manage Players"
                            >
                              <Medal className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/olympics/${olympic.id}/events`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Manage Categories"
                            >
                              <ListChecks className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/olympics/${olympic.id}/scores`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Enter Scores"
                            >
                              <Calendar className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/admin/olympics/${olympic.id}/player-order`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Generate Player Order"
                            >
                              <Shuffle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => navigate(`/olympics/${olympic.id}/leaderboard`)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View Leaderboard"
                            >
                              <Trophy className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEdit(olympic)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Edit"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(olympic.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500">
                        {format(new Date(olympic.date), 'MMMM d, yyyy')}
                      </td>
                      <td className="hidden sm:table-cell px-3 py-4 text-sm text-gray-500">
                        {format(new Date(olympic.registration_deadline), 'MMMM d, yyyy')}
                      </td>
                      <td className="hidden sm:table-cell py-4 pl-3 pr-4 text-right text-sm font-medium">
                        <div className="flex flex-wrap justify-end gap-1">
                          <button
                            onClick={() => navigate(`/admin/olympics/${olympic.id}/players`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Manage Players"
                          >
                            <Medal className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/olympics/${olympic.id}/events`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Manage Categories"
                          >
                            <ListChecks className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/olympics/${olympic.id}/scores`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Enter Scores"
                          >
                            <Calendar className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/olympics/${olympic.id}/player-order`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Generate Player Order"
                          >
                            <Shuffle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => navigate(`/olympics/${olympic.id}/leaderboard`)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View Leaderboard"
                          >
                            <Trophy className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(olympic)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(olympic.id)}
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
          </div>
        </div>
      </div>
    </div>
  );
}