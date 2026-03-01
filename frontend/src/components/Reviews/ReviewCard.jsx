import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { reviewsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../Common/StarRating';

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#FFB347'];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);

  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

export default function ReviewCard({ review, onVote }) {
  const { user } = useAuth();
  const [voting, setVoting] = useState(false);

  async function handleVote() {
    if (!user || voting) return;
    setVoting(true);
    try {
      const res = await reviewsAPI.vote(review.id);
      onVote?.(review.id, res.data.voted);
    } catch (err) {
      if (err.response?.status === 401) {
        // User not logged in - silently ignore
      }
    } finally {
      setVoting(false);
    }
  }

  const avatarColor = getAvatarColor(review.user_name || 'U');
  const initial = (review.user_name || 'U')[0].toUpperCase();

  return (
    <div className="py-4 border-b last:border-0 animate-fade-in-up">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {review.user_avatar ? (
          <img src={review.user_avatar} alt={review.user_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: avatarColor }}
          >
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 text-sm">{review.user_name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(review.created_at)}</span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <StarRating value={review.rating} size={13} />
            {review.title && (
              <span className="text-sm font-medium text-gray-700 truncate">"{review.title}"</span>
            )}
          </div>

          {review.content && (
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{review.content}</p>
          )}

          {/* Tags */}
          {review.tags && review.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {review.tags.map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Review images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
              {review.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => window.open(img, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Helpful vote */}
          <button
            onClick={handleVote}
            disabled={voting || !user}
            className={`flex items-center gap-1.5 mt-2 text-xs font-medium transition-colors ${
              review.user_voted
                ? 'text-fpt-orange'
                : 'text-gray-400 hover:text-gray-600'
            } ${!user ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <ThumbsUp size={12} className={review.user_voted ? 'fill-current' : ''} />
            <span>Hữu ích ({review.helpful_votes})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
