import { useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';

const SORT_OPTIONS = [
  { value: 'distance', label: '📍 Gần nhất' },
  { value: 'rating',   label: '⭐ Đánh giá' },
  { value: 'popular',  label: '🔥 Phổ biến' },
];

const DISTANCE_OPTIONS = [
  { value: '1', label: '≤ 1km' },
  { value: '2', label: '≤ 2km' },
  { value: '5', label: '≤ 5km' },
  { value: '7', label: '≤ 7km' },
];

const RATING_OPTIONS = [
  { value: '4', label: '4⭐+' },
  { value: '3', label: '3⭐+' },
  { value: '',  label: 'Tất cả' },
];

function ActivePill({ active, color, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
        active ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      style={active ? { background: color || '#F05A22' } : {}}
    >
      {children}
    </button>
  );
}

export default function FilterPanel() {
  const { placeTypes, filters, updateFilter } = usePlaces();
  const [expanded, setExpanded] = useState(true);

  // Count non-default active filters
  const activeCount = [filters.type_id, filters.min_rating, filters.max_distance].filter(Boolean).length
    + (filters.sort !== 'distance' ? 1 : 0);

  return (
    <div className="flex-shrink-0" style={{ borderBottom: '1px solid #f3f4f6' }}>
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">Bộ lọc &amp; Sắp xếp</span>
          {activeCount > 0 && (
            <span
              className="flex items-center justify-center w-[18px] h-[18px] rounded-full text-white leading-none font-bold"
              style={{ fontSize: 10, background: '#F05A22' }}
            >
              {activeCount}
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp size={13} className="text-gray-400" />
          : <ChevronDown size={13} className="text-gray-400" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-3.5 space-y-3">
          {/* Sort */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Sắp xếp</p>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS.map(opt => (
                <ActivePill
                  key={opt.value}
                  active={filters.sort === opt.value}
                  onClick={() => updateFilter('sort', opt.value)}
                >
                  {opt.label}
                </ActivePill>
              ))}
            </div>
          </div>

          {/* Place type */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Loại địa điểm</p>
            <div className="flex flex-wrap gap-1.5">
              <ActivePill
                active={!filters.type_id}
                onClick={() => updateFilter('type_id', '')}
              >
                Tất cả
              </ActivePill>
              {placeTypes.map(t => (
                <ActivePill
                  key={t.id}
                  active={filters.type_id == t.id}
                  color={t.color}
                  onClick={() => updateFilter('type_id', filters.type_id == t.id ? '' : String(t.id))}
                >
                  {t.icon} {t.name}
                </ActivePill>
              ))}
            </div>
          </div>

          {/* Rating + Distance — 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Đánh giá</p>
              <div className="flex flex-wrap gap-1.5">
                {RATING_OPTIONS.map(opt => (
                  <ActivePill
                    key={opt.value}
                    active={filters.min_rating === opt.value}
                    onClick={() => updateFilter('min_rating', opt.value)}
                  >
                    {opt.label}
                  </ActivePill>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Khoảng cách</p>
              <div className="flex flex-wrap gap-1.5">
                {DISTANCE_OPTIONS.map(opt => (
                  <ActivePill
                    key={opt.value}
                    active={filters.max_distance === opt.value}
                    onClick={() => updateFilter('max_distance', filters.max_distance === opt.value ? '' : opt.value)}
                  >
                    {opt.label}
                  </ActivePill>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
