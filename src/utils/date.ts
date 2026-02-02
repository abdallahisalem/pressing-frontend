export const formatDate = (dateInput: string | number | Date | undefined): string => {
  if (!dateInput) return '-';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const lang = localStorage.getItem('language') || 'ar';
  
  // Removing '-u-nu-arab' ensures it uses standard (Latin) digits
  // 'ar-SA' or 'ar-EG' will still provide Arabic text for months/days
  const locale = lang === 'ar' ? 'ar-SA' : 'en-GB';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    // Alternatively, you can force the numbering system here:
    numberingSystem: 'latn' 
  }).format(date as Date);
};