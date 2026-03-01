import { useNavigate } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';
import { formatDistance } from '../../utils/distance';

export default function PlaceCard({ place, style }) {
  const navigate = useNavigate();
  const { setSelectedPlace } = usePlaces();

  function handleClick() {
    setSelectedPlace(place);
  }

  function handleViewDetail(e) {
    e.stopPropagation();
    navigate(`/place/${place.id}`);
  }

  return (
    <div
      onClick={handleClick}
      className="flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors animate-fade-in-up"
      style={style}
    >
      {/* Cover image / color block */}
      <div
        className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden"
        style={{ backgroundColor: `${place.type_color}22` || '#F9FAFB' }}
      >
        {place.cover_image || (place.images && place.images[0]) ? (
          <img
            src={place.cover_image || place.images[0]}
            alt={place.name}
            className="w-full h-full object-cover rounded-xl"
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span>{place.type_icon || '📍'}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{place.name}</h3>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full text-white flex-shrink-0 ml-1"
            style={{ backgroundColor: place.type_color || '#6B7280' }}
          >
            {place.type_icon}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-1">
          <Star size={11} className="text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-semibold text-gray-700">{place.avg_rating?.toFixed(1) || '—'}</span>
          <span className="text-xs text-gray-400">({place.total_reviews})</span>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin size={10} className="text-fpt-orange" />
            <span>{formatDistance(place.distance_from_fpt)} từ FPT</span>
          </div>
          <button
            onClick={handleViewDetail}
            className="text-xs text-fpt-orange font-semibold hover:underline"
          >
            Chi tiết →
          </button>
        </div>
      </div>
    </div>
  );
}
