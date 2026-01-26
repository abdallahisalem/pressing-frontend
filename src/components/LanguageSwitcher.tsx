import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./ConfirmDialog";
import { useState } from "react";

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<string>('');

  const handleSwitch = (lang: string) => {
    if (lang === i18n.language) return;
    setPendingLanguage(lang);
    setIsConfirmOpen(true);
  };

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' }
  ];

  return (
    <>
      <div className="inline-flex p-1 bg-gray-50 rounded-lg border border-gray-200">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleSwitch(lang.code)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              i18n.language === lang.code
                ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          i18n.changeLanguage(pendingLanguage);
          setIsConfirmOpen(false);
        }}
        title={t('common.changeLanguage')}
        message={t('common.changeLanguageMessage')}
        confirmText={t('common.confirm')}
      />
    </>
  );
};