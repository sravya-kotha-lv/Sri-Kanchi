import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import { type PublicDashboardCategory } from '../api/commonapi';
import ProductRatingBadge from '../components/common/ProductRatingBadge';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import { formatCurrency, sanitizeDisplayText } from '../utils/displayText';
import { navigateToProductImage } from '../utils/navigation';
import FooterPage from './FooterPage';

function navigateTo(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

type CollectionPageProps = {
  isEmbedded?: boolean;
  featuredCategories?: PublicDashboardCategory[];
};

function CollectionPage({ isEmbedded = false, featuredCategories = [] }: CollectionPageProps) {
  const { products } = useCatalog();
  const { isInWishlist, toggleWishlist } = useShop();
  const [showAll, setShowAll] = useState(false);
  const [categorySlideStart, setCategorySlideStart] = useState(0);
  const featuredCollectionProducts = useMemo(
    () =>
      products
        .filter((product) => product.source === 'collection')
        .slice(0, showAll ? products.filter((product) => product.source === 'collection').length : 4),
    [products, showAll]
  );
  const featuredCategorySlides = useMemo(
    () =>
      showAll || featuredCategories.length <= 1
        ? featuredCategories
        : [...featuredCategories, ...featuredCategories.slice(0, Math.min(4, featuredCategories.length))],
    [featuredCategories, showAll]
  );
  const getProductWishlistId = (product: (typeof products)[number]) =>
    product.id !== undefined ? String(product.id) : product.slug;
  const showCategoryControls = isEmbedded && !showAll && featuredCategories.length > 1;
  const showPreviousCategories = () => {
    setCategorySlideStart((current) => (current - 1 + featuredCategories.length) % featuredCategories.length);
  };
  const showNextCategories = () => {
    setCategorySlideStart((current) => (current + 1) % featuredCategories.length);
  };

  useEffect(() => {
    if (!showCategoryControls) {
      return undefined;
    }

    const slideTimer = window.setInterval(() => {
      setCategorySlideStart((current) => (current + 1) % featuredCategories.length);
    }, 4500);

    return () => window.clearInterval(slideTimer);
  }, [featuredCategories.length, showCategoryControls]);

  if (isEmbedded) {
    return (
      <div className="bg-silk-radial px-1 py-2 text-ink sm:px-2 sm:py-3 lg:px-3 lg:py-4">
        <div className="page-shell mx-auto max-w-[100rem] p-5 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="page-eyebrow">{featuredCategories.length ? 'Featured Categories' : 'Collections'}</p>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                className="liquid-btn px-7 py-4 text-base font-semibold text-white"
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? 'Show Less' : featuredCategories.length ? 'Explore Categories' : 'Explore Collections'}
              </button>
            </div>
          </div>

          <div className="relative mt-10">
            {showCategoryControls ? (
              <button
                type="button"
                onClick={showPreviousCategories}
                className="absolute left-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/82 text-3xl font-semibold text-wine shadow-[0_14px_28px_rgba(111,72,61,0.14)] transition hover:-translate-y-[55%] hover:bg-white sm:h-14 sm:w-14 sm:text-4xl"
                aria-label="Show previous categories"
              >
                &lt;
              </button>
            ) : null}

            {featuredCategories.length && !showAll ? (
              <div className="overflow-hidden">
                <div
                  className="featured-category-track flex transition-transform duration-700 ease-out"
                  style={{ '--category-slide': categorySlideStart } as CSSProperties}
                >
                  {featuredCategorySlides.map((category, index) => (
                    <div key={`${category.id}-${index}`} className="w-full shrink-0 px-2 sm:w-1/2 lg:w-1/4">
                      <article
                        className="home-showcase-card page-card product-card compact-home-card relative h-full w-full p-0 text-left transition duration-300 hover:-translate-y-1"
                      >
                        <button
                          type="button"
                          onClick={() => navigateTo(`/categories/${category.slug}`)}
                          className="product-image-wrap home-showcase-image-wrap text-left"
                        >
                          {category.preview_image || category.image_url ? (
                            <img
                              src={(category.preview_image || category.image_url)!}
                              alt={sanitizeDisplayText(category.name)}
                              className="product-image-media object-top transition duration-500 hover:scale-105"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                              Image not available
                            </span>
                          )}
                          {Number(category.product_count || 0) > 0 ? (
                            <span className="product-badge">{category.product_count} styles</span>
                          ) : null}
                        </button>
                        <div className="product-card-body justify-start gap-1.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-ink/42">{category.slug.replace(/-/g, ' ')}</p>
                            {Number(category.starting_price || 0) > 0 ? (
                              <span className="text-xs font-semibold text-wine">{formatCurrency(Number(category.starting_price || 0))}</span>
                            ) : null}
                          </div>
                          <h2 className="line-clamp-2 text-[1rem] font-medium leading-snug text-wine">{sanitizeDisplayText(category.name)}</h2>
                          <p className="line-clamp-2 text-[12px] leading-[1.35] text-ink/66">
                            {category.description?.trim() || 'Curated category spotlight for home browsing.'}
                          </p>
                        </div>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="home-showcase-grid items-stretch">
                {featuredCategories.length
                  ? featuredCategories.map((category) => (
                  <article
                    key={category.id}
                    className="home-showcase-card page-card product-card compact-home-card relative h-full w-full p-0 text-left transition duration-300 hover:-translate-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => navigateTo(`/categories/${category.slug}`)}
                      className="product-image-wrap home-showcase-image-wrap text-left"
                    >
                      {category.preview_image || category.image_url ? (
                        <img
                          src={(category.preview_image || category.image_url)!}
                          alt={sanitizeDisplayText(category.name)}
                          className="product-image-media object-top transition duration-500 hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                          Image not available
                        </span>
                      )}
                      {Number(category.product_count || 0) > 0 ? (
                        <span className="product-badge">{category.product_count} styles</span>
                      ) : null}
                    </button>
                    <div className="product-card-body justify-start gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/42">{category.slug.replace(/-/g, ' ')}</p>
                        {Number(category.starting_price || 0) > 0 ? (
                          <span className="text-xs font-semibold text-wine">{formatCurrency(Number(category.starting_price || 0))}</span>
                        ) : null}
                      </div>
                      <h2 className="line-clamp-2 text-[1rem] font-medium leading-snug text-wine">{sanitizeDisplayText(category.name)}</h2>
                      <p className="line-clamp-2 text-[12px] leading-[1.35] text-ink/66">
                        {category.description?.trim() || 'Curated category spotlight for home browsing.'}
                      </p>
                    </div>
                  </article>
                  ))
                  : featuredCollectionProducts.map((product) => {
                  const wishlistItemId = getProductWishlistId(product);

                  return (
                  <article
                    key={`${wishlistItemId}-${product.slug}`}
                    className="home-showcase-card page-card product-card compact-home-card relative h-full w-full p-0 text-left transition duration-300 hover:-translate-y-1"
                  >
                    <button
                      type="button"
                      onClick={() => navigateToProductImage(product.slug, product.image)}
                      className="product-image-wrap home-showcase-image-wrap text-left"
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={sanitizeDisplayText(product.name)}
                          className="product-image-media home-card-product-image transition duration-500 hover:scale-105"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                          Image not available
                        </span>
                      )}
                      <span className="product-badge">{product.badge ?? product.category}</span>
                      <ProductRatingBadge rating={product.rating} seed={product.slug} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleWishlist(wishlistItemId)}
                      className={`product-card-wishlist ${isInWishlist(wishlistItemId) ? 'product-icon-btn-active' : ''}`}
                      aria-label={`Add ${sanitizeDisplayText(product.name)} to wishlist`}
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                        <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3 5.7 5.7 0 0 1 12 5.2 5.7 5.7 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" />
                      </svg>
                    </button>
                    <div className="product-card-body justify-start gap-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-ink/42">{product.category}</p>
                        <span className="text-xs font-semibold text-wine">{product.color}</span>
                      </div>
                      <h2 className="line-clamp-2 text-[1rem] font-medium leading-snug text-wine">{sanitizeDisplayText(product.name)}</h2>
                      <div className="flex items-end gap-2 overflow-hidden whitespace-nowrap">
                        <p className="text-[1rem] font-semibold text-[#4a2a2c]">{formatCurrency(product.price)}</p>
                        <p className="text-[12px] text-ink/42 line-through">{formatCurrency(product.originalPrice ?? product.price)}</p>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}

            {showCategoryControls ? (
              <button
                type="button"
                onClick={showNextCategories}
                className="absolute right-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/82 text-3xl font-semibold text-wine shadow-[0_14px_28px_rgba(111,72,61,0.14)] transition hover:-translate-y-[55%] hover:bg-white sm:h-14 sm:w-14 sm:text-4xl"
                aria-label="Show next categories"
              >
                &gt;
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col bg-silk-radial text-ink">
      <div className="flex-1 px-1 py-8 sm:px-2 lg:px-3">
      <div className="page-shell mx-auto max-w-[100rem] p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="page-eyebrow">Collections</p>

          <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              className="liquid-btn px-7 py-4 text-base font-semibold text-white"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? 'Show Less Collections' : 'Explore Collections'}
            </button>
          </div>
        </div>

        <div className="home-showcase-grid mt-10 items-stretch">
          {featuredCollectionProducts.map((product) => (
            <article
              key={`${getProductWishlistId(product)}-${product.slug}`}
              className="home-showcase-card page-card product-card compact-home-card relative h-full w-full p-0 text-left transition duration-300 hover:-translate-y-1"
            >
              <button
                type="button"
                onClick={() => navigateToProductImage(product.slug, product.image)}
                className="product-image-wrap home-showcase-image-wrap text-left"
              >
                {product.image ? (
                  <img
                    src={product.image}
                    alt={sanitizeDisplayText(product.name)}
                    className="product-image-media object-top transition duration-500 hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                    Image not available
                  </span>
                )}
                <span className="product-badge">{product.badge ?? product.category}</span>
                <ProductRatingBadge rating={product.rating} seed={product.slug} />
              </button>
              <div className="product-card-body justify-start gap-1.5">
                <h2 className="line-clamp-2 text-[1rem] font-medium leading-snug text-wine">{sanitizeDisplayText(product.name)}</h2>
                <p className="line-clamp-2 text-[12px] leading-[1.35] text-ink/66">{product.shortDescription ?? product.category}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      </div>
      <FooterPage />
    </div>
  );
}

export default CollectionPage;
