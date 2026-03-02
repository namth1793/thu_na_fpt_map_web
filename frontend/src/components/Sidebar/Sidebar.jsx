import { usePlaces } from '../../context/PlaceContext';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import PlaceCard from './PlaceCard';
import LoadingSpinner from '../Common/LoadingSpinner';

export default function Sidebar() {
  const { places, loading, filters, resetFilters } = usePlaces();

  const hasActiveFilters = filters.type_id || filters.min_rating || filters.max_distance || filters.search;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #f3f4f6' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="font-bold text-gray-900 text-[15px] leading-tight">Quanh FPT Đà Nẵng</h1>
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
              Bán kính&nbsp;
              <span className="text-fpt-orange font-semibold">7km</span>
              &nbsp;·&nbsp;
              {loading
                ? <span className="text-gray-300">Đang tải…</span>
                : <span>{places.length} địa điểm</span>
              }
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[11px] text-fpt-orange font-semibold px-2.5 py-1 rounded-lg hover:bg-fpt-light transition-colors"
            >
              Xoá lọc
            </button>
          )}
        </div>
        <SearchBar />
      </div>

      <FilterPanel />

      {/* Place list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <LoadingSpinner />
            <p className="text-xs text-gray-400">Đang tải địa điểm…</p>
          </div>
        ) : places.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-3">🔍</div>
            <p className="font-semibold text-gray-700 text-sm">Không tìm thấy địa điểm</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm nhé!</p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 text-xs text-fpt-orange font-semibold px-4 py-2 rounded-xl border border-orange-200 hover:bg-fpt-light transition-colors"
              >
                Xoá tất cả bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div>
            {places.map((place, i) => (
              <PlaceCard
                key={place.id}
                place={place}
                style={{ animationDelay: `${i * 30}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
