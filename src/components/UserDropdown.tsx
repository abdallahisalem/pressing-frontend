import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from './ConfirmDialog';

interface UserDropdownProps {
  userName: string;
  userRole: string;
  pressingName?: string | null;
  onLogout: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = ({
  userName,
  userRole,
  pressingName,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, i18n } = useTranslation();
  const [isLanguageConfirmOpen, setIsLanguageConfirmOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string>('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLanguageClick = (lang: string) => {
    if (lang === i18n.language) return;
    setPendingLanguage(lang);
    setIsOpen(false);
    setIsLanguageConfirmOpen(true);
  };

  const handleLanguageConfirm = () => {
    i18n.changeLanguage(pendingLanguage);
    setIsLanguageConfirmOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
      >
        {/* Avatar */}
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-sm">
          {getInitials(userName)}
        </div>

        {/* User Info - Hidden on mobile */}
        <div className="hidden md:block text-start">
          <div className="text-sm font-semibold text-gray-900 leading-tight">{userName}</div>
          <div className="text-xs text-gray-500">{pressingName || userRole}</div>
        </div>

      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute ${i18n.language === 'ar' ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50`}>
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold shadow-sm">
                {getInitials(userName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">{userName}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    userRole === 'ADMIN'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {userRole}
                  </span>
                </div>
                {pressingName && (
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    📍 {pressingName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            {/* Language Options */}
            <div className="border-b border-gray-100 pb-1 mb-1">
              {/* English */}
              <button
                onClick={() => handleLanguageClick('en')}
                disabled={i18n.language === 'en'}
                className={`w-full px-4 py-2 text-start text-sm transition-colors flex items-center gap-2 ${
                  i18n.language === 'en'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                English
                {i18n.language === 'en' && (
                  <svg className="h-4 w-4 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Arabic */}
              <button
                onClick={() => handleLanguageClick('ar')}
                disabled={i18n.language === 'ar'}
                className={`w-full px-4 py-2 text-start text-sm transition-colors flex items-center gap-2 ${
                  i18n.language === 'ar'
                    ? 'text-gray-400 cursor-default'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                العربية
                {i18n.language === 'ar' && (
                  <svg className="h-4 w-4 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Logout Button */}
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('common.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Language Change Confirmation */}
      <ConfirmDialog
        isOpen={isLanguageConfirmOpen}
        onClose={() => setIsLanguageConfirmOpen(false)}
        onConfirm={handleLanguageConfirm}
        title={t('common.changeLanguage')}
        message={t('common.changeLanguageMessage')}
        confirmText={t('common.confirm')}
        confirmVariant="primary"
      />
    </div>
  );
};
