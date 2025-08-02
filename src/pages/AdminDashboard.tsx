import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Medal, Users, GamepadIcon, LogOut, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Olympics Management',
      description: 'Create and manage olympics, categories, players, and scores',
      icon: Medal,
      path: '/admin/olympics',
    },
    {
      title: 'Games & Categories',
      description: 'Configure games and category settings',
      icon: GamepadIcon,
      path: '/admin/games',
    },
    {
      title: 'User Management',
      description: 'View and manage user profiles',
      icon: Users,
      path: '/admin/users',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Medal className="h-6 w-6 text-white mr-2" />
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/')}
                  className="text-white hover:text-indigo-100 flex items-center"
                >
                  <Eye className="h-5 w-5 mr-2" />
                  View as User
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="text-white hover:text-indigo-100 flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {menuItems.map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <item.icon className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-lg font-medium text-gray-900">
                          {item.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}