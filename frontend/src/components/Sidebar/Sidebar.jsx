import { usePlaces } from '../../context/PlaceContext';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import PlaceCard from './PlaceCard';
import LoadingSpinner from '../Common/LoadingSpinner';

export default function Sidebar() {
  const { places, loading, filters, resetFilters } = usePlaces();

  const hasActiveFilters = filters.type_id || filters.min_rating || filters.max_distance || filters.search;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🗺️</span>
          <div>
            <h1 className="font-bold text-gray-900 text-sm leading-tight">Quanh FPT Đà Nẵng</h1>
            <p className="text-xs text-gray-400">Trong bán kính 7km</p>
          </div>
        </div>
        <SearchBar />
      </div>

      <FilterPanel />

      {/* Result summary */}
      <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 border-b">
        <span className="text-xs text-gray-500">
          {loading ? 'Đang tải...' : `${places.length} địa điểm`}
        </span>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-fpt-orange hover:underline font-medium"
          >
            Xoá bộ lọc
          </button>
        )}
      </div>

      {/* Place list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-16 px-4 text-gray-400">
            <div className="text-4xl mb-2">🔍</div>
            <p className="font-medium text-sm">Không tìm thấy địa điểm</p>
            <p className="text-xs mt-1">Thử điều chỉnh bộ lọc nhé!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {places.map((place, i) => (
              <PlaceCard
                key={place.id}
                place={place}
                style={{ animationDelay: `${i * 40}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
