import { useState, useEffect } from 'react';

interface SearchInputProps {
  placeholder: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder,
  onSearch,
  debounceMs = 300,
}) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [value, onSearch, debounceMs]);

  const handleClear = () => {
    setValue('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <svg
          className="w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};
