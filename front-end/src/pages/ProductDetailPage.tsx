import { useEffect, useMemo, useState } from 'react';
import commonApi, { RatingSummary, type Product as ApiProduct, type Review } from '../api/commonapi';
import BackButton from '../components/common/BackButton';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import type { CatalogProduct } from '../data/productCatalog';
import FooterPage from './FooterPage';
import { sanitizeDisplayText } from '../utils/displayText';
import { navigateToProduct } from '../utils/navigation';
import { getStableProductImages } from '../utils/productImages';

const formatPrice = (price: number) => `Rs. ${price.toLocaleString('en-IN')}`;

const productHighlights = ['100% Purchase Protection', 'Assured Quality', 'Free Shipping'];
const DEFAULT_ZOOM_POSITION = { x: 50, y: 20 };

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toNumber = (value: number | string | undefined, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const firstPositiveNumber = (...values: Array<number | string | undefined>) => {
  for (const value of values) {
    const parsed = toNumber(value, 0);

    if (parsed > 0) {
      return parsed;
    }
  }

  return 0;
};

const getSeedValue = (seed: string | number | undefined) => {
  const value = String(seed ?? '').trim();

  if (!value) {
    return 0;
  }

  return value.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
};

const getFallbackRating = (seed: string | number | undefined) => {
  const ratingSteps = [4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9];

  return ratingSteps[getSeedValue(seed) % ratingSteps.length] ?? 4.6;
};

const getFallbackReviewsCount = (seed: string | number | undefined) => 100 + (getSeedValue(seed) % 51);

const getReviewPhotoUrl = (photo: string | { image_url?: string; url?: string }) =>
  typeof photo === 'string' ? photo : photo.image_url ?? photo.url ?? '';

const getReviewPhotos = (review: Review) =>
  [...(review.photos ?? []), ...(review.images ?? [])]
    .map(getReviewPhotoUrl)
    .filter(Boolean);

const mapApiProductToCatalogProduct = (product: ApiProduct): CatalogProduct => {
  const galleryImages = getStableProductImages(product);
  const primaryImage = product.image?.trim() || galleryImages[0] || '';
  const price = toNumber(product.selling_price ?? product.price);
  const originalPrice =
    product.mrp !== undefined || product.originalPrice !== undefined
      ? toNumber(product.mrp ?? product.originalPrice)
      : undefined;
  const category = product.category?.trim() || 'Sarees';

  return {
    id: product.id,
    categoryId: product.category_id,
    slug: product.slug || slugify(product.name),
    name: product.name,
    category,
    occasion: product.occasion?.trim() || undefined,
    shortDescription: product.short_description?.trim() || product.shortDescription?.trim() || undefined,
    color: product.color?.trim() || 'Classic',
    price,
    originalPrice,
    image: primaryImage,
    galleryImages: galleryImages.length ? galleryImages : primaryImage ? [primaryImage] : [],
    source:
      product.source === 'category' ||
      product.source === 'collection' ||
      product.source === 'new-arrivals' ||
      product.source === 'offers'
        ? product.source
        : 'category',
    badge: product.badge,
    note: product.note ?? product.description,
    offerTag: product.offerTag,
    rating: firstPositiveNumber(product.rating, product.average_rating) || undefined,
    reviewsCount: firstPositiveNumber(product.reviewsCount, product.total_reviews) || undefined,
    stock: product.stock
  };
};

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const safeRating = Math.max(0, Math.min(5, rating));
  const fullStars = Math.floor(safeRating);
  const hasHalf = safeRating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const gradientId = `half-star-${size}-${Math.round(safeRating * 10)}`;

  return (
    <span className="inline-flex items-center gap-0.5" style={{ height: size }}>
      {Array.from({ length: fullStars }).map((_, index) => (
        <svg key={`full-${index}`} width={size} height={size} viewBox="0 0 24 24" className="fill-[#c78d3f]">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
      {hasHalf ? (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId}>
              <stop offset="50%" stopColor="#c78d3f" />
              <stop offset="50%" stopColor="#d7c3b7" />
            </linearGradient>
          </defs>
          <path fill={`url(#${gradientId})`} d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ) : null}
      {Array.from({ length: emptyStars }).map((_, index) => (
        <svg key={`empty-${index}`} width={size} height={size} viewBox="0 0 24 24" className="fill-[#d7c3b7]">
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </span>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-right text-ink/60">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#eadfd8]">
        <div className="h-full rounded-full bg-[#c78d3f] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-ink/50">{count}</span>
    </div>
  );
}

function ProductDetailPage() {
  const slug = decodeURIComponent(window.location.pathname.replace('/products/', '').trim());
  const { getProductBySlug, getSimilarProducts, products } = useCatalog();
  const {
    addToCart,
    currentUser,
    decrementCartItem,
    getCartItemQuantity,
    incrementCartItem,
    isInWishlist,
    startBuyNow,
    toggleWishlist
  } = useShop();

  const catalogProduct = getProductBySlug(slug);
  const [fetchedProduct, setFetchedProduct] = useState<CatalogProduct | null>(null);
  const [isFetchingProduct, setIsFetchingProduct] = useState(false);
  const product = fetchedProduct ?? catalogProduct;
  const selectedProductImageFromNavigation = useMemo(() => {
    try {
      const storedImage = window.sessionStorage.getItem('saree-aura-selected-product-image');
      const parsed = storedImage ? (JSON.parse(storedImage) as { slug?: string; image?: string }) : null;

      return parsed?.slug === slug && parsed.image ? parsed.image : '';
    } catch {
      return '';
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setFetchedProduct(null);
      setIsFetchingProduct(false);
      return;
    }

    let cancelled = false;
    setIsFetchingProduct(!catalogProduct);

    void commonApi.products
      .getBySlug(slug)
      .then((apiProduct) => {
        if (!cancelled) {
          setFetchedProduct(mapApiProductToCatalogProduct(apiProduct));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchedProduct(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetchingProduct(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogProduct, slug]);

  const similarProducts = useMemo(
    () => (product ? getSimilarProducts(product) : products.slice(0, 4)),
    [getSimilarProducts, product, products]
  );

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = [selectedProductImageFromNavigation, product.image, ...(product.galleryImages?.filter(Boolean) ?? [])].filter(
      (image): image is string => Boolean(image)
    );

    return Array.from(new Set(images));
  }, [product, selectedProductImageFromNavigation]);

  const [selectedImage, setSelectedImage] = useState('');
  const [openSection, setOpenSection] = useState<'details' | 'returns' | 'tags' | 'reviews' | null>('details');
  const [zoomPreview, setZoomPreview] = useState({ ...DEFAULT_ZOOM_POSITION, active: false });

  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('reviews') === '1') {
      setOpenSection('reviews');
    }
  }, [slug]);

  const productId = useMemo(() => {
    if (!product) return null;
    if (typeof product.id === 'number' && Number.isFinite(product.id)) return product.id;
    if (typeof product.id === 'string') {
      const parsed = Number(product.id);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [product]);
  useEffect(() => {
    setSelectedImage(galleryImages[0] ?? '');
  }, [galleryImages, slug]);

  useEffect(() => {
    void (async () => {
      try {
        await commonApi.filters.get();
      } catch {
      }
    })();
  }, []);

  useEffect(() => {
    setZoomPreview({ ...DEFAULT_ZOOM_POSITION, active: false });
  }, [selectedImage, slug]);

  useEffect(() => {
    if (!productId) {
      setRatingSummary(null);
      setReviews([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const summary = await (commonApi as any).rating.getSummary(productId);
        if (!cancelled) {
          setRatingSummary(summary);
        }
      } catch {
        if (!cancelled) {
          setRatingSummary(null);
        }
      }
    })();

    void (async () => {
      setReviewsLoading(true);
      try {
        const result = await (commonApi as any).rating.getReviews(productId, {
          page: 1,
          limit: 10,
          sort_by: 'created_at',
          sort_order: 'DESC'
        });

        if (!cancelled) {
          const items = result.data ?? [];
          const meta = (result.meta ?? {}) as { hasNextPage?: boolean };
          setReviews(items);
          setReviewPage(1);
          setHasNextPage(Boolean(meta.hasNextPage));
        }
      } catch {
        if (!cancelled) {
          setReviews([]);
          setHasNextPage(false);
        }
      } finally {
        if (!cancelled) {
          setReviewsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const loadMoreReviews = async () => {
    if (!productId) return;

    const nextPage = reviewPage + 1;

    try {
      const result = await (commonApi as any).rating.getReviews(productId, {
        page: nextPage,
        limit: 10,
        sort_by: 'created_at',
        sort_order: 'DESC'
      });

      const newItems = result.data ?? [];
      const meta = (result.meta ?? {}) as { hasNextPage?: boolean };

      setReviews((prev) => [...prev, ...newItems]);
      setReviewPage(nextPage);
      setHasNextPage(Boolean(meta.hasNextPage));
    } catch {
    }
  };

  if (!product && isFetchingProduct) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="page-card mx-auto max-w-4xl p-10 text-center">
          <p className="page-eyebrow">Loading product</p>
          <h1 className="mt-4 font-display text-4xl text-wine">Opening this saree...</h1>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="page-card mx-auto max-w-4xl p-10 text-center">
          <p className="page-eyebrow">Product not found</p>
          <h1 className="mt-4 font-display text-4xl text-wine">This saree is not available right now.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-ink/66">
            Try opening a product again from the catalog page.
          </p>
        </div>
      </div>
    );
  }

  const safePrice = Number(product.price ?? 0);
  const safeOriginalPrice = product.originalPrice ? Number(product.originalPrice) : 0;
  const savings = safeOriginalPrice > safePrice ? safeOriginalPrice - safePrice : 0;
  const discountPercentage = safeOriginalPrice > 0 ? Math.round((savings / safeOriginalPrice) * 100) : 0;

  const productColor = product.color?.trim() || 'Classic';
  const productCategory = product.category?.trim() || 'Premium';
  const productDescription = product.note?.trim() || '';
  const productDetailsContent = [
    `Category: ${productCategory}`,
    `Color: ${productColor}`,
    product.occasion?.trim() ? `Occasion: ${product.occasion.trim()}` : null,
    `Style Code: ${product.slug.toUpperCase()}`
  ]
    .filter(Boolean)
    .join(' | ');

  const summaryReviews = toNumber(ratingSummary?.total_reviews, 0);
  const averageRating = firstPositiveNumber(
    summaryReviews > 0 ? ratingSummary?.average_rating : undefined,
    product.rating,
    getFallbackRating(product.slug)
  );
  const totalReviews = firstPositiveNumber(
    summaryReviews > 0 ? ratingSummary?.total_reviews : undefined,
    product.reviewsCount,
    getFallbackReviewsCount(product.slug)
  );
  const cartQuantity = getCartItemQuantity(product.slug);
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
  const hasReachedStockLimit = typeof product.stock === 'number' && cartQuantity >= product.stock;

  const reviewContent = (
    <div className="pb-4">
      {summaryReviews > 0 ? (
        <div className="mb-5 rounded-[1.2rem] border border-[#eadfd8] bg-white/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl font-semibold text-[#4a2a2c]">{averageRating.toFixed(1)}</span>
            <StarRating rating={averageRating} size={20} />
            <span className="text-sm text-ink/50">out of 5</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <RatingBar label="5 ★" count={ratingSummary?.five_star ?? 0} total={totalReviews} />
            <RatingBar label="4 ★" count={ratingSummary?.four_star ?? 0} total={totalReviews} />
            <RatingBar label="3 ★" count={ratingSummary?.three_star ?? 0} total={totalReviews} />
            <RatingBar label="2 ★" count={ratingSummary?.two_star ?? 0} total={totalReviews} />
            <RatingBar label="1 ★" count={ratingSummary?.one_star ?? 0} total={totalReviews} />
          </div>
        </div>
      ) : null}

      {reviewsLoading ? (
        <p className="text-sm text-ink/62">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink/62">No reviews yet. Be the first to review!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-[1.2rem] border border-[#eadfd8] bg-white/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={14} />
                    <span className="text-xs font-semibold text-ink/70">{review.user_name ?? 'User'}</span>
                    <span className="text-[11px] text-ink/40">
                      {new Date(review.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {review.title ? <p className="mt-1 text-sm font-semibold text-[#2a2432]">{review.title}</p> : null}
                  {review.comment ? <p className="mt-1 text-sm leading-6 text-ink/66">{review.comment}</p> : null}
                  {getReviewPhotos(review).length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getReviewPhotos(review).map((photoUrl) => (
                        <img
                          key={photoUrl}
                          src={photoUrl}
                          alt="Review upload"
                          className="h-16 w-16 rounded-[0.8rem] border border-[#eadfd8] object-cover"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>

              </div>
            </div>
          ))}

          {hasNextPage ? (
            <button
              type="button"
              onClick={loadMoreReviews}
              className="mx-auto mt-2 rounded-full border border-[#eadfd8] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 transition hover:bg-[#f8f1eb]"
            >
              Load More Reviews
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width">
        <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] xl:gap-4">
          <div className="grid items-start gap-4 lg:grid-cols-[4.8rem_minmax(0,1fr)]">
            <div className="order-2 flex gap-3 overflow-x-auto lg:order-1 lg:flex-col lg:overflow-visible">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`shrink-0 overflow-hidden rounded-[1.1rem] border-2 bg-white/70 transition ${
                    selectedImage === image ? 'border-[#c78d3f] shadow-[0_10px_18px_rgba(115,72,44,0.14)]' : 'border-transparent'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${sanitizeDisplayText(product.name)} view ${index + 1}`}
                    className="h-20 w-16 bg-white object-cover object-top sm:h-24 sm:w-20"
                  />
                </button>
              ))}
            </div>

            <div className="order-1 mx-auto w-full max-w-[46rem] lg:order-2 lg:mx-0 lg:max-w-[46rem]">
              <div className="grid items-start gap-3">
                <div className="flex items-center gap-3 px-1">
                  <BackButton fallbackPath="/" />
                  <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Home / {productCategory}</p>
                </div>
                <div
                  className="page-card relative w-full cursor-crosshair overflow-hidden p-0"
                  onMouseMove={(event) => {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
                    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
                    setZoomPreview({
                      x: Math.max(0, Math.min(100, x)),
                      y: Math.max(0, Math.min(100, y)),
                      active: true
                    });
                  }}
                  onMouseLeave={() => setZoomPreview({ ...DEFAULT_ZOOM_POSITION, active: false })}
                >
                  <img
                    src={selectedImage || product.image}
                    alt={sanitizeDisplayText(product.name)}
                    className="block h-[32rem] w-full rounded-[1.8rem] bg-white object-cover object-top lg:h-[40rem]"
                  />
                </div>

                {productDescription ? (
                  <div className="page-card p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/48">Description</p>
                    <p className="mt-3 text-sm leading-7 text-ink/68">{productDescription}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="page-card mx-auto w-full max-w-[40rem] p-6 sm:p-8 lg:mx-0 lg:max-w-none">
            {zoomPreview.active ? (
              <div className="overflow-hidden rounded-[1.8rem] border border-white/80 bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1eb_100%)] shadow-[0_18px_36px_rgba(90,50,45,0.1)]">
                <div className="border-b border-[#eadfd8] px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/48">Zoom Preview</p>
                  <p className="mt-2 text-sm text-ink/58">Move on the image to inspect zari, weave, and texture details.</p>
                </div>
                <div
                  className="h-[46rem] w-full bg-white bg-no-repeat"
                  style={{
                    backgroundImage: `url("${selectedImage || product.image}")`,
                    backgroundPosition: `${zoomPreview.x}% ${zoomPreview.y}%`,
                    backgroundSize: '420%',
                    backgroundColor: '#fff'
                  }}
                />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-medium leading-tight text-wine">{sanitizeDisplayText(product.name)}</h1>
                    <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-ink/54">
                      Style Code {product.slug.toUpperCase()} / {productColor.toUpperCase()}
                    </p>
                    {product.shortDescription?.trim() ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/62">{product.shortDescription}</p>
                    ) : null}
                    <div className="mt-3 flex items-center gap-2">
                      <StarRating rating={averageRating} size={18} />
                      <span className="text-sm font-semibold text-ink/72">{averageRating.toFixed(1)}</span>
                      <span className="text-sm text-ink/50">
                        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void toggleWishlist(product.slug)}
                    className={`product-icon-btn flex h-12 w-12 items-center justify-center ${
                      isInWishlist(product.slug) ? 'text-[#b43f5d]' : 'text-wine'
                    }`}
                    aria-label={`Add ${sanitizeDisplayText(product.name)} to wishlist`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3 5.7 5.7 0 0 1 12 5.2 5.7 5.7 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" />
                    </svg>
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#eadfd8] pb-5">
                  <p className="text-3xl font-semibold text-[#4a2a2c]">{formatPrice(safePrice)}</p>
                  {safeOriginalPrice > 0 ? (
                    <p className="text-base text-ink/42 line-through">{formatPrice(safeOriginalPrice)}</p>
                  ) : null}
                  {discountPercentage > 0 ? (
                    <p className="text-sm font-medium text-[#d9475e]">({discountPercentage}% off)</p>
                  ) : (
                    <p className="text-sm font-medium text-[#c46b55]">
                      {product.occasion ?? product.badge ?? product.offerTag ?? 'Premium selection'}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  {isOutOfStock ? (
                    <div className="mt-6 flex w-full items-center justify-center border border-[#d77a61] bg-[#fff3ef] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#a13f45]">
                      Out of Stock
                    </div>
                  ) : cartQuantity > 0 ? (
                    <div className="flex w-full items-center justify-between border border-[#221d18] px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void decrementCartItem(product.slug)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c8bc] text-xl font-semibold text-[#221d18]"
                        aria-label={`Decrease quantity of ${sanitizeDisplayText(product.name)}`}
                      >
                        -
                      </button>
                      <div className="text-center">
                        <p className="text-xs uppercase tracking-[0.16em] text-ink/50">In Cart</p>
                        <p className="mt-1 text-lg font-semibold text-[#221d18]">{cartQuantity}</p>
                      </div>
                      <button
                        type="button"
                        disabled={hasReachedStockLimit}
                        onClick={() => void incrementCartItem(product.slug)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c8bc] text-xl font-semibold text-[#221d18] disabled:cursor-not-allowed disabled:opacity-45"
                        aria-label={`Increase quantity of ${sanitizeDisplayText(product.name)}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void addToCart(product.slug)}
                      className="mt-6 flex w-full items-center justify-center border border-[#221d18] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#221d18] transition hover:bg-[#7f3150] hover:text-white"
                    >
                      Add To Cart
                    </button>
                  )}

                  <button
                    type="button"
                      onClick={() => void startBuyNow(product.slug)}
                      disabled={isOutOfStock}
                    className="mt-3 flex w-full items-center justify-center bg-[#d41462] px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#b81254] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Buy It Now
                  </button>

                  {!currentUser ? (
                    <p className="mt-3 text-center text-sm text-ink/62">Login to get more offers</p>
                  ) : null}

                  <p className="mt-3 text-center text-xs text-ink/56">
                    Please note: Return or exchange on sale products may differ from regular items.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {productHighlights.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.25rem] border border-[#eadfd8] bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1eb_100%)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-ink/70"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-t border-[#eadfd8]">
                  {[
                    { key: 'details' as const, label: 'Product Details', content: productDetailsContent },
                    {
                      key: 'returns' as const,
                      label: 'Shipping & Returns',
                      content: 'Ships across India with secure packaging. Easy support available for delivery and return queries.'
                    },
                    {
                      key: 'tags' as const,
                      label: 'Tags',
                      content: [product.category, product.color, product.occasion, product.badge, product.offerTag]
                        .filter(Boolean)
                        .join(' | ')
                    },
                    { key: 'reviews' as const, label: `Reviews (${totalReviews})`, content: '' }
                  ].map((section) => (
                    <div key={section.key} className="border-b border-[#eadfd8]">
                      <button
                        type="button"
                        onClick={() => setOpenSection((current) => (current === section.key ? null : section.key))}
                        className="flex w-full items-center justify-between py-4 text-left"
                      >
                        <span className="text-base font-semibold text-[#1f2230]">{section.label}</span>
                        <span className={`text-[#757575] transition ${openSection === section.key ? 'rotate-180' : ''}`}>
                          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
                            <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
                          </svg>
                        </span>
                      </button>
                      {openSection === section.key ? (
                        section.key === 'reviews' ? (
                          reviewContent
                        ) : (
                          <p className="pb-4 text-sm leading-7 text-ink/66">{section.content}</p>
                        )
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="font-display text-3xl text-wine">Similar Products</h2>
            <p className="text-sm font-medium uppercase tracking-[0.16em] text-ink/46">{productCategory}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {similarProducts.map((item) => (
              <article key={item.slug} className="page-card flex h-[29rem] flex-col overflow-hidden p-4">
                <button
                  type="button"
                  onClick={() => navigateToProduct(item.slug)}
                  className="relative h-[70%] w-full overflow-hidden rounded-[1.7rem] text-left"
                >
                  <img
                    src={item.image}
                    alt={sanitizeDisplayText(item.name)}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                  <span className="product-badge">{item.occasion ?? item.offerTag ?? item.badge ?? item.category}</span>
                </button>
                <div className="flex h-[30%] flex-col pt-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink/42">{item.category}</p>
                  <h3 className="mt-2 line-clamp-2 text-[1.08rem] font-medium leading-snug text-wine">
                    {sanitizeDisplayText(item.name)}
                  </h3>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#4a2a2c]">{formatPrice(Number(item.price ?? 0))}</p>
                      {item.originalPrice ? (
                        <p className="mt-1 text-sm text-ink/42 line-through">{formatPrice(Number(item.originalPrice))}</p>
                      ) : null}
                    </div>
                    <p className="rounded-full bg-[#f8efe7] px-3 py-1 text-xs font-semibold text-wine">
                      {item.color ?? 'Classic'}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <FooterPage />
      </div>
    </div>
  );
}

export default ProductDetailPage;
