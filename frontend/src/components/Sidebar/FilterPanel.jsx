import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';

const SORT_OPTIONS = [
  { value: 'distance', label: '📍 Gần nhất' },
  { value: 'rating', label: '⭐ Đánh giá cao' },
  { value: 'popular', label: '🔥 Phổ biến' },
];

const DISTANCE_OPTIONS = [
  { value: '1', label: '≤ 1km' },
  { value: '2', label: '≤ 2km' },
  { value: '5', label: '≤ 5km' },
  { value: '7', label: '≤ 7km (tất cả)' },
];

const RATING_OPTIONS = [
  { value: '4', label: '4⭐ trở lên' },
  { value: '3', label: '3⭐ trở lên' },
  { value: '', label: 'Tất cả' },
];

export default function FilterPanel() {
  const { placeTypes, filters, updateFilter } = usePlaces();
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex-shrink-0 border-b">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <SlidersHorizontal size={15} />
          Bộ lọc & Sắp xếp
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {/* Sort */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Sắp xếp</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('sort', opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.sort === opt.value
                      ? 'bg-fpt-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Place type */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Loại địa điểm</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => updateFilter('type_id', '')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  !filters.type_id ? 'bg-fpt-orange text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              {placeTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => updateFilter('type_id', filters.type_id == t.id ? '' : String(t.id))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.type_id == t.id
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={filters.type_id == t.id ? { backgroundColor: t.color } : {}}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Rating filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Đánh giá</p>
            <div className="flex gap-1.5">
              {RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('min_rating', opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.min_rating === opt.value
                      ? 'bg-fpt-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Khoảng cách</p>
            <div className="flex flex-wrap gap-1.5">
              {DISTANCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateFilter('max_distance', filters.max_distance === opt.value ? '' : opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filters.max_distance === opt.value
                      ? 'bg-fpt-orange text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
