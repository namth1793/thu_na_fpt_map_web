import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Clock, Star, Image, ThumbsUp } from 'lucide-react';
import { placesAPI, reviewsAPI } from '../utils/api';
import { formatDistance, drivingTime } from '../utils/distance';
import StarRating from '../components/Common/StarRating';
import ReviewCard from '../components/Reviews/ReviewCard';
import ReviewForm from '../components/Reviews/ReviewForm';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import AuthModal from '../components/Auth/AuthModal';
import { useAuth } from '../context/AuthContext';

export default function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [place, setPlace] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewSort, setReviewSort] = useState('recent');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showContrib, setShowContrib] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [reviewSort]);

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
    // Refresh stats
    reviewsAPI.getStats(id).then(r => setStats(r.data));
    placesAPI.getById(id).then(r => setPlace(r.data));
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>;
  if (!place) return null;

  const allImages = place.images?.map(i => i.image_url) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="relative h-64 md:h-80 bg-gradient-to-br from-gray-800 to-gray-600 overflow-hidden"
        style={allImages[activeImg] ? {
          backgroundImage: `url(${allImages[activeImg]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : {}}
      >
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-black/30 backdrop-blur text-white px-3 py-2 rounded-full text-sm hover:bg-black/50 transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
        </div>

        {/* Image thumbnails */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            {allImages.slice(0, 5).map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  activeImg === i ? 'border-white scale-110' : 'border-transparent opacity-70'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {allImages.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white/30">
            <div className="text-center">
              <Image size={64} />
              <p className="mt-2 text-sm">Chưa có ảnh</p>
            </div>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute bottom-4 left-4 z-10">
          <span
            className="px-3 py-1.5 rounded-full text-white text-sm font-semibold"
            style={{ backgroundColor: place.type_color || '#6B7280' }}
          >
            {place.type_icon} {place.type_name}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Place Info */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 animate-fade-in-up">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{place.name}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <StarRating value={place.avg_rating} size={20} />
              <span className="font-bold text-gray-800">{place.avg_rating?.toFixed(1) || '0.0'}</span>
              <span className="text-gray-400 text-sm">({place.total_reviews} đánh giá)</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={14} className="text-fpt-orange" />
              <span>{formatDistance(place.distance_from_fpt)} từ FPT · {drivingTime(place.distance_from_fpt)}</span>
            </div>
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            {place.address && (
              <div className="flex items-start gap-2">
                <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{place.address}</span>
              </div>
            )}
            {place.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400 flex-shrink-0" />
                <a href={`tel:${place.phone}`} className="text-fpt-orange hover:underline">{place.phone}</a>
              </div>
            )}
            {place.hours && (
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-400 flex-shrink-0" />
                <span>{place.hours}</span>
              </div>
            )}
          </div>

          {place.description && (
            <p className="mt-4 text-gray-600 leading-relaxed border-t pt-4">{place.description}</p>
          )}
        </div>

        {/* Rating Stats */}
        {stats && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-4 animate-fade-in-up">
            <h2 className="font-bold text-gray-800 mb-4 text-lg">Đánh giá tổng quan</h2>
            <div className="flex gap-8 items-center">
              <div className="text-center">
                <div className="text-5xl font-bold text-fpt-orange">{stats.average?.toFixed(1) || '0.0'}</div>
                <StarRating value={stats.average} size={18} className="mt-1 justify-center" />
                <div className="text-xs text-gray-400 mt-1">{stats.total} đánh giá</div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = stats.distribution[star] || 0;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 w-3">{star}</span>
                      <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-400 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-2xl shadow-sm p-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 text-lg">Review từ cộng đồng</h2>
            <button
              onClick={handleWriteReview}
              className="bg-fpt-orange text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-fpt-dark transition-colors"
            >
              ✏️ Viết review
            </button>
          </div>

          {/* Sort reviews */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { value: 'recent', label: 'Mới nhất' },
              { value: 'helpful', label: 'Hữu ích nhất' },
              { value: 'rating_high', label: 'Sao cao' },
              { value: 'rating_low', label: 'Sao thấp' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setReviewSort(opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  reviewSort === opt.value
                    ? 'bg-fpt-orange text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {showReviewForm && (
            <ReviewForm
              placeId={id}
              onSubmit={handleReviewSubmit}
              onCancel={() => setShowReviewForm(false)}
            />
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">💬</div>
              <p className="font-medium">Chưa có review nào</p>
              <p className="text-sm mt-1">Hãy là người đầu tiên chia sẻ trải nghiệm!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onVote={(id, voted) => {
                    setReviews(prev => prev.map(r =>
                      r.id === id
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

      {/* +1 Contribution animation */}
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
