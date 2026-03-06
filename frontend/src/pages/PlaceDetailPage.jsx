import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Clock, Star, Image as ImageIcon, Bookmark, BookmarkCheck } from 'lucide-react';
import { placesAPI, reviewsAPI, getImageUrl } from '../utils/api';
import { formatDistance, drivingTime, walkingTime } from '../utils/distance';
import StarRating from '../components/Common/StarRating';
import ReviewCard from '../components/Reviews/ReviewCard';
import ReviewForm from '../components/Reviews/ReviewForm';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import AuthModal from '../components/Auth/AuthModal';
import { useAuth } from '../context/AuthContext';

export default function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, savedPlaceIds, toggleSave } = useAuth();

  const [place, setPlace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewSort, setReviewSort] = useState('recent');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContrib, setShowContrib] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [savingBookmark, setSavingBookmark] = useState(false);

  const isSaved = savedPlaceIds.has(Number(id));

  useEffect(() => { loadData(); }, [id]);
  useEffect(() => { loadReviews(); }, [reviewSort]);

  async function loadData() {
    setLoading(true);
    try {
      const [placeRes, statsRes] = await Promise.all([
        placesAPI.getById(id),
        reviewsAPI.getStats(id),
      ]);
      setPlace(placeRes.data);
      setStats(statsRes.data);
      await loadReviews();
    } catch {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const res = await reviewsAPI.getByPlace(id, { sort: reviewSort, limit: 20 });
      setReviews(res.data.reviews);
    } catch (err) {
      console.error(err);
    }
  }

  function handleWriteReview() {
    if (!user) { setShowAuthModal(true); return; }
    setShowReviewForm(true);
  }

  function handleReviewSubmit(newReview) {
    setReviews(prev => [newReview, ...prev]);
    setShowReviewForm(false);
    setShowContrib(true);
    setTimeout(() => setShowContrib(false), 2500);
    reviewsAPI.getStats(id).then(r => setStats(r.data));
    placesAPI.getById(id).then(r => setPlace(r.data));
  }

  async function handleBookmark() {
    if (!user) { setShowAuthModal(true); return; }
    setSavingBookmark(true);
    try { await toggleSave(id); } catch {/* ignore */}
    setSavingBookmark(false);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <LoadingSpinner />
    </div>
  );
  if (!place) return null;

  const allImages = place.images?.map(i => getImageUrl(i.image_url)).filter(Boolean) || [];
  const isPopular = Boolean(place.is_popular);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div
        className="relative h-64 md:h-80 bg-gradient-to-br from-gray-800 to-gray-600 overflow-hidden"
        style={allImages[activeImg] ? {
          backgroundImage: `url(${allImages[activeImg]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

        {/* Back + Bookmark */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm text-white px-3 py-2 rounded-full text-sm font-medium hover:bg-black/50 transition-colors"
          >
            <ArrowLeft size={15} /> Quay lại
          </button>
          <button
            onClick={handleBookmark}
            disabled={savingBookmark}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all backdrop-blur-sm disabled:opacity-60"
            style={{ background: isSaved ? 'rgba(240,90,34,0.85)' : 'rgba(0,0,0,0.3)', color: '#fff' }}
            title={isSaved ? 'Bỏ lưu' : 'Lưu địa điểm'}
          >
            {isSaved
              ? <><BookmarkCheck size={15} /><span className="ml-1">Đã lưu</span></>
              : <><Bookmark size={15} /><span className="ml-1">Lưu lại</span></>
            }
          </button>
        </div>

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="absolute bottom-16 right-4 flex gap-1.5 z-10">
            {allImages.slice(0, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImg === i
                    ? 'border-white scale-105 shadow-lg'
                    : 'border-white/30 opacity-60 hover:opacity-90'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {allImages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/20">
              <ImageIcon size={56} />
              <p className="mt-2 text-xs">Chưa có ảnh</p>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold backdrop-blur-sm"
              style={{ background: `${place.type_color || '#6B7280'}CC` }}
            >
              {place.type_icon}&nbsp;{place.type_name}
            </span>
            {isPopular && (
              <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shadow-sm">
                🔥 Nổi tiếng
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
            <Star size={13} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
            <span className="text-white text-sm font-bold">{place.avg_rating?.toFixed(1) || '0.0'}</span>
            <span className="text-white/70 text-xs">({place.total_reviews})</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 pt-5 pb-4 border-b border-gray-50">
            <h1 className="text-xl font-bold text-gray-900 leading-tight mb-3">{place.name}</h1>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-full">
                <MapPin size={11} className="text-fpt-orange flex-shrink-0" />
                <span className="text-xs font-semibold text-fpt-orange">
                  {formatDistance(place.distance_from_fpt)} từ FPT
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-full">
                <span className="text-xs">🏍️</span>
                <span className="text-xs font-semibold text-blue-600">{drivingTime(place.distance_from_fpt)}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
                <span className="text-xs">🚶</span>
                <span className="text-xs font-semibold text-emerald-600">{walkingTime(place.distance_from_fpt)}</span>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 space-y-3">
            {place.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={14} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Địa chỉ</p>
                  <p className="text-sm text-gray-700 leading-snug">{place.address}</p>
                </div>
              </div>
            )}
            {place.phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Điện thoại</p>
                  <a href={`tel:${place.phone}`} className="text-sm text-green-600 font-semibold hover:underline">
                    {place.phone}
                  </a>
                </div>
              </div>
            )}
            {place.hours && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Giờ mở cửa</p>
                  <p className="text-sm text-gray-700">{place.hours}</p>
                </div>
              </div>
            )}
          </div>

          {place.description && (
            <div className="px-5 pb-5 border-t border-gray-50 pt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Giới thiệu</p>
              <p className="text-sm text-gray-600 leading-relaxed">{place.description}</p>
            </div>
          )}
        </div>

        {/* Rating stats */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-sm p-5 animate-fade-in-up">
            <h2 className="font-bold text-gray-800 text-base mb-4">Đánh giá tổng quan</h2>
            <div className="flex gap-6 items-center">
              <div className="text-center flex-shrink-0">
                <div className="text-4xl font-black" style={{ color: '#F05A22' }}>
                  {stats.average?.toFixed(1) || '0.0'}
                </div>
                <StarRating value={stats.average} size={16} className="mt-1.5 justify-center" />
                <div className="text-[11px] text-gray-400 mt-1.5 font-medium">{stats.total} đánh giá</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[star] || 0;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 w-3 text-right font-semibold">{star}</span>
                      <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: pct > 50 ? '#F05A22' : pct > 20 ? '#FBBF24' : '#D1D5DB',
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in-up">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-800 text-base">Review cộng đồng</h2>
            <button
              onClick={handleWriteReview}
              className="flex items-center gap-1.5 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-md hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg, #F05A22, #e04010)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4z"/>
              </svg>
              Viết review
            </button>
          </div>

          <div className="flex gap-1.5 px-5 py-3 border-b border-gray-50 overflow-x-auto">
            {[
              { value: 'recent',      label: 'Mới nhất' },
              { value: 'helpful',     label: '👍 Hữu ích' },
              { value: 'rating_high', label: '⭐ Cao nhất' },
              { value: 'rating_low',  label: '⬇️ Thấp nhất' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setReviewSort(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  reviewSort === opt.value
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={reviewSort === opt.value ? { background: '#F05A22' } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="px-5 py-4">
            {showReviewForm && (
              <ReviewForm
                placeId={id}
                onSubmit={handleReviewSubmit}
                onCancel={() => setShowReviewForm(false)}
              />
            )}

            {reviews.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl mb-3">💬</div>
                <p className="font-semibold text-gray-700 text-sm">Chưa có review nào</p>
                <p className="text-xs text-gray-400 mt-1">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
                <button
                  onClick={handleWriteReview}
                  className="mt-4 text-xs text-fpt-orange font-semibold px-4 py-2 rounded-xl border border-orange-200 hover:bg-fpt-light transition-colors"
                >
                  Viết review đầu tiên
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {reviews.map(review => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onVote={(rid, voted) => {
                      setReviews(prev => prev.map(r =>
                        r.id === rid
                          ? { ...r, helpful_votes: r.helpful_votes + (voted ? 1 : -1), user_voted: voted }
                          : r
                      ));
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showContrib && (
        <div className="fixed bottom-24 right-8 z-50 contribution-pop">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-lg text-sm">
            +1 đóng góp! Cảm ơn bạn 🎉
          </div>
        </div>
      )}

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
