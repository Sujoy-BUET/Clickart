import { Star } from 'lucide-react';

export default function StarRating({ rating = 0, size = 16, showValue = false }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex">
        {Array.from({ length: full }).map((_, i) => (
          <Star key={`f${i}`} size={size} className="fill-amber-400 text-amber-400" />
        ))}
        {half && <Star size={size} className="fill-amber-400/50 text-amber-400" />}
        {Array.from({ length: empty }).map((_, i) => (
          <Star key={`e${i}`} size={size} className="text-gray-600" />
        ))}
      </span>
      {showValue && <span className="ml-1 text-xs text-gray-400">{rating.toFixed(1)}</span>}
    </span>
  );
}
