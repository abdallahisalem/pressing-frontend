import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button, LanguageSwitcher } from '../components';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">{t('dashboard.title')}</span>
                <span className="sm:hidden">{t('common.dashboard')}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-xs sm:text-sm text-gray-700">
                <span className="hidden sm:inline font-medium">{t('common.role')}: </span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {user?.role}
                </span>
              </div>
              <LanguageSwitcher />
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                {t('common.logout')}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              {t('dashboard.welcome')}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              {t('dashboard.loggedInAs')} <span className="font-semibold">{user?.role}</span>
            </p>

            {/* Admin Section */}
            {user?.role === 'ADMIN' && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    {t('dashboard.adminFunctions')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div
                      onClick={() => navigate('/admin/users')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
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
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.userManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.userManagementDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/pressings')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.pressingManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.pressingManagementDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/clients')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.clientManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.clientManagementDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/orders')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.orderManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.orderManagementDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/orders/new')}
                      className="p-6 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.createOrder')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.createOrderDesc')}
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
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
                    {t('dashboard.supervisorFunctions')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div
                      onClick={() => navigate('/orders')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.orderManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.orderManagementDescSupervisor')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/orders/new')}
                      className="p-6 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-green-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.createOrder')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.createOrderDesc')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={() => navigate('/clients')}
                      className="p-4 sm:p-6 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md active:bg-gray-50 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-10 w-10 sm:h-12 sm:w-12 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                            {t('dashboard.clientManagement')}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {t('dashboard.clientManagementDescSupervisor')}
                          </p>
                        </div>
                      </div>
                    </div>
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
