import { useMemo } from 'react';
import { type PublicDashboardProduct } from '../api/commonapi';
import ProductRatingBadge from '../components/common/ProductRatingBadge';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import { formatCurrency, sanitizeDisplayText } from '../utils/displayText';
import { navigateToProduct } from '../utils/navigation';

type BestSellingProductsPageProps = {
  isEmbedded?: boolean;
  productsOverride?: PublicDashboardProduct[];
};

function BestSellingProductsPage({ isEmbedded = false, productsOverride = [] }: BestSellingProductsPageProps) {
  const { products } = useCatalog();
  const { isInWishlist, toggleWishlist } = useShop();

  const bestSellingProducts = useMemo(
    () =>
      (productsOverride.length
        ? productsOverride.slice(0, 4).map((product) => {
            const productId = product.id ?? product.product_id;

            return {
              itemId: productId !== undefined && productId !== null ? String(productId) : product.slug,
              slug: product.slug,
              name: product.name,
              price: Number(product.selling_price || 0),
              originalPrice: Number(product.mrp || product.selling_price || 0),
              image: product.primary_image || '',
              rating: product.rating,
              reviewsCount: product.reviewsCount
            };
          })
        : products.slice(0, 4).map((product) => ({
            itemId: product.id !== undefined ? String(product.id) : product.slug,
            slug: product.slug,
            name: product.name,
            price: product.price,
            originalPrice: product.originalPrice ?? product.price,
            image: product.image,
            rating: product.rating,
            reviewsCount: product.reviewsCount
          }))),
    [products, productsOverride]
  );

  return (
    <div className={`${isEmbedded ? 'bg-silk-radial px-1 py-2 text-ink sm:px-2 sm:py-3 lg:px-3 lg:py-4' : 'min-h-screen bg-silk-radial px-1 py-8 text-ink sm:px-2 lg:px-3'}`}>
      <div className="page-shell mx-auto max-w-[100rem] p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="page-eyebrow">Best Selling Products</p>
        </div>

        <div className="home-showcase-grid mt-10 items-stretch">
          {bestSellingProducts.map((product) => {
            const discountPercentage =
              product.originalPrice > product.price && product.originalPrice > 0
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

            return (
            <article key={`${product.itemId}-${product.slug}`} className="home-showcase-card product-card page-card compact-home-card relative h-full w-full p-0">
              <button
                type="button"
                onClick={() => navigateToProduct(product.slug)}
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
                <span className="product-badge">Best Seller</span>
                <ProductRatingBadge rating={product.rating} seed={product.slug} />
              </button>

              <button
                type="button"
                onClick={() => void toggleWishlist(product.itemId)}
                className={`product-card-wishlist ${isInWishlist(product.itemId) ? 'product-icon-btn-active' : ''}`}
                aria-label={`Add ${sanitizeDisplayText(product.name)} to wishlist`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3 5.7 5.7 0 0 1 12 5.2 5.7 5.7 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" />
                </svg>
              </button>

              <div className="product-card-body justify-start gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateToProduct(product.slug)}
                  className="line-clamp-2 text-left text-[1.02rem] font-medium leading-snug text-wine"
                >
                  {sanitizeDisplayText(product.name)}
                </button>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink/62">
                  <span className="text-[1rem] font-bold leading-none text-[#4f2c2d]">
                    {formatCurrency(product.price)}
                  </span>
                  {discountPercentage > 0 ? (
                    <>
                      <span className="text-[12px] leading-none text-ink/42 line-through">{formatCurrency(product.originalPrice)}</span>
                      <span className="font-semibold leading-none text-[#d9475e]">({discountPercentage}% off)</span>
                    </>
                  ) : null}
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BestSellingProductsPage;
