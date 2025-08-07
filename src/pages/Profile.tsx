import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { LogOut, ArrowLeft, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { validatePassword } from '../utils/validation';
import AvatarGenerator from '../components/AvatarGenerator';
import CustomAvatar from '../components/CustomAvatar';

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  avatar_shape?: string;
  avatar_foreground_color?: string;
  avatar_background_color?: string;
}

interface PasswordUpdate {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Profile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedShape, setSelectedShape] = useState('user');
  const [selectedForegroundColor, setSelectedForegroundColor] = useState('#4f46e5');
  const [selectedBackgroundColor, setSelectedBackgroundColor] = useState('#e0e7ff');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(true);
  const [showPasswordUpdate, setShowPasswordUpdate] = useState(false);
  const [passwordUpdate, setPasswordUpdate] = useState<PasswordUpdate>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setUsername(data.username || '');
      setSelectedShape(data.avatar_shape || 'user');
      setSelectedForegroundColor(data.avatar_foreground_color || '#4f46e5');
      setSelectedBackgroundColor(data.avatar_background_color || '#e0e7ff');
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username,
          avatar_shape: selectedShape,
          avatar_foreground_color: selectedForegroundColor,
          avatar_background_color: selectedBackgroundColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      setMessageType('success');
    } catch (error: any) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleAvatarChange = (shape: string, foregroundColor: string, backgroundColor: string) => {
    setSelectedShape(shape);
    setSelectedForegroundColor(foregroundColor);
    setSelectedBackgroundColor(backgroundColor);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    try {
      const { newPassword, confirmPassword, currentPassword } = passwordUpdate;

      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (!validatePassword(newPassword)) {
        throw new Error('Password must be at least 8 characters long and contain a mix of letters, numbers, and symbols');
      }

      // For admin users updating other users' passwords
      if (user?.is_admin && user.id !== userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-management`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId,
              newPassword,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update password');
        }
      } else {
        // Regular users updating their own password
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
      }

      setMessage('Password updated successfully!');
      setMessageType('success');
      setShowPasswordUpdate(false);
      setPasswordUpdate({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      setPasswordError(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleBack = () => {
    if (user?.is_admin) {
      navigate('/admin/users');
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <h1 className="text-xl font-semibold text-white">Profile Settings</h1>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center text-white hover:text-indigo-100"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign Out
              </button>
            </div>
          </div>

          <div className="px-6 py-8">
            {message && (
              <div
                className={`mb-4 p-4 rounded flex items-center ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {messageType === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2" />
                )}
                {message}
              </div>
            )}

            <div className="flex items-center space-x-4 mb-6">
              <CustomAvatar
                shape={selectedShape}
                foregroundColor={selectedForegroundColor}
                backgroundColor={selectedBackgroundColor}
                size="large"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || profile?.username || 'User Profile'}
                </h2>
                <p className="text-gray-500">{profile?.username}</p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Customize Avatar
                </label>
                <AvatarGenerator
                  initialShape={selectedShape}
                  initialForegroundColor={selectedForegroundColor}
                  initialBackgroundColor={selectedBackgroundColor}
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Update Profile
                </button>
              </div>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Password Settings</h3>
                <button
                  onClick={() => setShowPasswordUpdate(!showPasswordUpdate)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {showPasswordUpdate ? 'Cancel' : 'Update Password'}
                </button>
              </div>

              {showPasswordUpdate && (
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  {!user?.is_admin && user?.id === userId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordUpdate.currentPassword}
                        onChange={(e) =>
                          setPasswordUpdate({
                            ...passwordUpdate,
                            currentPassword: e.target.value,
                          })
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordUpdate.newPassword}
                      onChange={(e) =>
                        setPasswordUpdate({
                          ...passwordUpdate,
                          newPassword: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordUpdate.confirmPassword}
                      onChange={(e) =>
                        setPasswordUpdate({
                          ...passwordUpdate,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  {passwordError && (
                    <div className="text-sm text-red-600 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {passwordError}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}