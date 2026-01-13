import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const savedLanguage = localStorage.getItem('language') || 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Update document direction and lang attribute
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  localStorage.setItem('language', lng);
});

// Set initial direction
const initialDir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dir = initialDir;
document.documentElement.lang = savedLanguage;

export default i18n;
