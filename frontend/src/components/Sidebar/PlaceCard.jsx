import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bookmark, BookmarkCheck } from 'lucide-react';
import { usePlaces } from '../../context/PlaceContext';
import { useAuth } from '../../context/AuthContext';
import { formatDistance, walkingTime } from '../../utils/distance';

function MiniStars({ value }) {
  const full = Math.round(value || 0);
  return (
    <span className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width="10" height="10" viewBox="0 0 24 24"
          fill={s <= full ? '#FBBF24' : '#E5E7EB'} className="flex-shrink-0">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

export default function PlaceCard({ place, style }) {
  const navigate = useNavigate();
  const { setSelectedPlace } = usePlaces();
  const { user, savedPlaceIds, toggleSave } = useAuth();

  const isSaved = savedPlaceIds.has(Number(place.id));
  const isPopular = Boolean(place.is_popular);

  function handleClick() {
    setSelectedPlace(place);
  }

  function handleViewDetail(e) {
    e.stopPropagation();
    navigate(`/place/${place.id}`);
  }

  async function handleBookmark(e) {
    e.stopPropagation();
    if (!user) { navigate('/'); return; }
    try {
      await toggleSave(place.id);
    } catch {/* ignore */}
  }

  const dist = formatDistance(place.distance_from_fpt);
  const walk = walkingTime(place.distance_from_fpt);

  return (
    <div
      onClick={handleClick}
      className="group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-all animate-fade-in-up hover:bg-slate-50 border-b border-slate-50 last:border-0"
      style={{
        ...style,
        boxShadow: 'inset 0 0 0 transparent',
        transition: 'background 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `inset 3px 0 0 ${place.type_color || '#F05A22'}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'inset 0 0 0 transparent'; }}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0">
        <div
          className="w-[70px] h-[70px] rounded-xl overflow-hidden"
          style={{ background: `${place.type_color || '#6B7280'}18` }}
        >
          {place.cover_image || place.images?.[0] ? (
            <img
              src={place.cover_image || place.images[0]}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={e => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[28px]">
              {place.type_icon || '📍'}
            </div>
          )}
        </div>

        {/* Popular badge */}
        {isPopular && (
          <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm leading-none z-10 flex items-center gap-0.5">
            🔥 Hot
          </div>
        )}

        {/* Type corner badge */}
        <div
          className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white shadow-sm"
          style={{ background: place.type_color || '#6B7280' }}
        >
          <span style={{ fontSize: 11, lineHeight: 1 }}>{place.type_icon}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        {/* Name row */}
        <div className="flex items-start gap-1">
          <h3 className="font-semibold text-gray-900 text-[13px] leading-snug flex-1 line-clamp-2">
            {place.name}
          </h3>
          {/* Bookmark button */}
          {user && (
            <button
              onClick={handleBookmark}
              className="flex-shrink-0 mt-0.5 p-0.5 rounded-md transition-colors hover:bg-orange-50"
              title={isSaved ? 'Bỏ lưu' : 'Lưu địa điểm'}
            >
              {isSaved
                ? <BookmarkCheck size={15} className="text-fpt-orange" />
                : <Bookmark size={15} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
              }
            </button>
          )}
        </div>

        {/* Rating row */}
        <div className="flex items-center gap-1.5">
          <MiniStars value={place.avg_rating} />
          <span className="text-[12px] font-semibold text-gray-700">
            {place.avg_rating?.toFixed(1) || '—'}
          </span>
          <span className="text-[11px] text-gray-400">({place.total_reviews})</span>
        </div>

        {/* Distance + detail link */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] text-gray-400">
            {dist}&nbsp;·&nbsp;{walk}
          </span>
          <button
            onClick={handleViewDetail}
            className="text-[11px] text-fpt-orange font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}
