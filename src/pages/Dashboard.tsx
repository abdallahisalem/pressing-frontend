import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                Pressing Management System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">Role:</span>{' '}
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {user?.role}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to the Dashboard
            </h2>
            <p className="text-gray-600 mb-6">
              You are logged in as <span className="font-semibold">{user?.role}</span>
            </p>

            {/* Admin Section */}
            {user?.role === 'ADMIN' && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Admin Functions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => navigate('/admin/users')}
                      className="p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-12 w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            User Management
                          </h4>
                          <p className="text-sm text-gray-600">
                            Create, edit, and manage user accounts
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 border border-gray-200 rounded-lg opacity-50 cursor-not-allowed">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-12 w-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            Reports & Analytics
                          </h4>
                          <p className="text-sm text-gray-600">
                            Coming soon...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supervisor Section */}
            {user?.role === 'SUPERVISOR' && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Supervisor Functions
                  </h3>
                  <div className="text-gray-600">
                    <p>Supervisor-specific features will be available here.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
