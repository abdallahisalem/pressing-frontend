import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from './ConfirmDialog';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string>('');

  const handleLanguageClick = (lang: string) => {
    if (lang === i18n.language) return;
    setPendingLanguage(lang);
    setIsConfirmOpen(true);
  };

  const handleConfirm = () => {
    i18n.changeLanguage(pendingLanguage);
    setIsConfirmOpen(false);
  };

  return (
    <>
      <div className="flex gap-1 items-center">
        <button
          onClick={() => handleLanguageClick('en')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            i18n.language === 'en'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Switch to English"
        >
          EN
        </button>
        <button
          onClick={() => handleLanguageClick('ar')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
            i18n.language === 'ar'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          aria-label="Switch to Arabic"
        >
          AR
        </button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={t('common.changeLanguage')}
        message={t('common.changeLanguageMessage')}
        confirmText={t('common.confirm')}
        confirmVariant="primary"
      />
    </>
  );
};
