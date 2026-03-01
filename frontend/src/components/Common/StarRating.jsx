import { Star } from 'lucide-react';

export default function StarRating({ value = 0, size = 16, className = '' }) {
  const rounded = Math.round(value * 2) / 2; // Round to nearest 0.5

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map(star => {
        const filled = rounded >= star;
        const half = !filled && rounded >= star - 0.5;

        return (
          <div key={star} className="relative" style={{ width: size, height: size }}>
            {/* Background (empty) star */}
            <Star size={size} className="text-gray-200 fill-gray-200 absolute inset-0" />
            {/* Filled star */}
            {(filled || half) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? '50%' : '100%' }}
              >
                <Star size={size} className="text-yellow-400 fill-yellow-400" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
