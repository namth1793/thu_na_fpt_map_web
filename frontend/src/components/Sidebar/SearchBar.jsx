import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';
import { placesAPI } from '../../utils/api';
import { formatDistance } from '../../utils/distance';

export default function SearchBar() {
  const { filters, updateFilter, setSelectedPlace } = usePlaces();
  const [query, setQuery] = useState(filters.search || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await placesAPI.search(query);
        setSuggestions(res.data);
        setShowSugg(true);
      } catch { /* ignore */ }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    if (!val) {
      updateFilter('search', '');
      setSuggestions([]);
      setShowSugg(false);
    }
  }

  function handleSearch() {
    updateFilter('search', query);
    setShowSugg(false);
  }

  function handleSelect(place) {
    setQuery(place.name);
    updateFilter('search', place.name);
    setSelectedPlace(place);
    setShowSugg(false);
  }

  function handleClear() {
    setQuery('');
    updateFilter('search', '');
    setSuggestions([]);
    setShowSugg(false);
    inputRef.current?.focus();
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-fpt-orange transition-all">
        <Search size={16} className="text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          onFocus={() => suggestions.length > 0 && setShowSugg(true)}
          placeholder="Tìm cafe, karaoke, quán ăn..."
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none min-w-0"
        />
        {query && (
          <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSugg && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {suggestions.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
            >
              <span className="text-lg flex-shrink-0">{s.type_icon}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                <div className="text-xs text-gray-400">{s.type_name} · {formatDistance(s.distance_from_fpt)}</div>
              </div>
              <div className="ml-auto flex-shrink-0 text-xs text-yellow-500 font-medium">
                ⭐ {s.avg_rating?.toFixed(1)}
              </div>
            </button>
          ))}
          <button
            onClick={() => { handleSearch(); setShowSugg(false); }}
            className="w-full px-4 py-2.5 text-xs text-fpt-orange font-semibold hover:bg-fpt-light border-t transition-colors"
          >
            Xem tất cả kết quả cho "{query}"
          </button>
        </div>
      )}
    </div>
  );
}
