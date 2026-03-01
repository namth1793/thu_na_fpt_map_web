import { useState } from 'react';
import { X, Upload, Star } from 'lucide-react';
import { reviewsAPI } from '../../utils/api';

const EMOTION_TAGS = [
  'chill', 'vui', 'đông', 'yên tĩnh', 'rẻ', 'đắt chút', 'ngon',
  'view đẹp', 'wifi tốt', 'học bài', 'đáng thử', 'nên ghé', 'tiện lợi',
  'tốt bụng', 'phục vụ tốt', 'lãng mạn', 'sạch sẽ', 'đẹp',
];

export default function ReviewForm({ placeId, onSubmit, onCancel }) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function toggleTag(tag) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  function handleImageChange(e) {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('Tối đa 5 ảnh');
      return;
    }
    setImages(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviews(prev => [...prev, ev.target.result]);
      reader.readAsDataURL(f);
    });
  }

  function removeImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (rating === 0) { setError('Vui lòng chọn số sao'); return; }
    if (!content.trim() && !title.trim()) { setError('Vui lòng viết nội dung đánh giá'); return; }

    setLoading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('place_id', placeId);
      fd.append('rating', rating);
      fd.append('title', title);
      fd.append('content', content);
      fd.append('tags', JSON.stringify(selectedTags));
      images.forEach(img => fd.append('images', img));

      const res = await reviewsAPI.create(fd);
      onSubmit(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra, thử lại nhé!');
    } finally {
      setLoading(false);
    }
  }

  const displayRating = hoveredRating || rating;

  const RATING_LABELS = ['', 'Tệ lắm', 'Tạm được', 'Ổn thôi', 'Khá tốt', 'Tuyệt vời!'];

  return (
    <div className="bg-fpt-light border border-orange-200 rounded-2xl p-4 mb-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Chia sẻ trải nghiệm của bạn</h3>
        <button onClick={onCancel} className="p-1 hover:bg-orange-100 rounded-lg transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star rating */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Số sao đánh giá *</p>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={28}
                    className={star <= displayRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
            {displayRating > 0 && (
              <span className="text-sm font-medium text-gray-600 ml-1">{RATING_LABELS[displayRating]}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder='Tiêu đề ngắn, VD: "Quán chill phết!"'
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange bg-white"
            maxLength={100}
          />
        </div>

        {/* Content */}
        <div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Chia sẻ thêm về trải nghiệm của bạn... (1-2 câu là đủ, cô đọng và thật nhé!)"
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fpt-orange resize-none bg-white"
            maxLength={500}
          />
          <p className="text-xs text-gray-400 text-right mt-1">{content.length}/500</p>
        </div>

        {/* Emotion tags */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Tag cảm xúc (chọn 1-5 cái)</p>
          <div className="flex flex-wrap gap-2">
            {EMOTION_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-fpt-orange text-white'
                    : 'bg-white border text-gray-600 hover:border-fpt-orange hover:text-fpt-orange'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Image upload */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Thêm ảnh (tối đa 5)</p>
          <div className="flex gap-2 flex-wrap">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt="" className="w-16 h-16 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-fpt-orange hover:bg-fpt-light transition-colors">
                <Upload size={18} className="text-gray-400" />
                <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-fpt-orange text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-fpt-dark disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Đang gửi...' : '🚀 Gửi đánh giá'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
