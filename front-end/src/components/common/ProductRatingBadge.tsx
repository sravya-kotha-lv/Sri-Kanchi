type ProductRatingBadgeProps = {
  rating?: number | string | null;
  seed?: string | number | null;
  className?: string;
};

const DEFAULT_RATING = 4.6;

const getSeedValue = (seed: ProductRatingBadgeProps['seed']) => {
  const value = String(seed ?? '').trim();

  if (!value) {
    return 0;
  }

  return value.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
};

const getFallbackRating = (seed: ProductRatingBadgeProps['seed']) => {
  const ratingSteps = [4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9];

  return ratingSteps[getSeedValue(seed) % ratingSteps.length] ?? DEFAULT_RATING;
};

const toSafeRating = (value: ProductRatingBadgeProps['rating'], seed: ProductRatingBadgeProps['seed']) => {
  const rating = Number(value);

  if (!Number.isFinite(rating) || rating <= 0) {
    return getFallbackRating(seed);
  }

  return Math.min(Math.max(rating, 1), 5);
};

function ProductRatingBadge({ rating, seed, className = '' }: ProductRatingBadgeProps) {
  const safeRating = toSafeRating(rating, seed);

  return (
    <span className={`product-rating-badge ${className}`} aria-label={`Rated ${safeRating.toFixed(1)}`}>
      <span>{safeRating.toFixed(1)}</span>
      <span className="product-rating-star" aria-hidden="true">&#9733;</span>
    </span>
  );
}

export default ProductRatingBadge;
