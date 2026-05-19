import { useMemo } from 'react';
import { type PublicDashboardProduct } from '../../api/commonapi';
import ProductRatingBadge from '../common/ProductRatingBadge';
import { useCatalog } from '../../context/CatalogContext';
import { useShop } from '../../context/ShopContext';
import { formatCurrency, sanitizeDisplayText } from '../../utils/displayText';
import { navigateToProduct } from '../../utils/navigation';

type Product = {
  itemId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  badge: string;
  rating?: number;
  reviewsCount?: number;
  stock?: number;
};

type ProductSectionProps = {
  productsOverride?: PublicDashboardProduct[];
};

function ProductSection({ productsOverride = [] }: ProductSectionProps) {
  const { products: catalogProducts } = useCatalog();
  const { isInWishlist, toggleWishlist } = useShop();

  const products = useMemo<Product[]>(
    () =>
      (productsOverride.length
        ? productsOverride.slice(0, 4).map((product) => {
            const price = Number(product.selling_price || 0);
            const originalPrice = Number(product.mrp || price || 0);
            const discountPercentage =
              originalPrice > price && originalPrice > 0
                ? Math.round(((originalPrice - price) / originalPrice) * 100)
                : 0;
            const productId = product.id ?? product.product_id;

            return {
              itemId: productId !== undefined && productId !== null ? String(productId) : product.slug,
              slug: product.slug,
              name: product.name,
              image: product.primary_image || '',
              price,
              originalPrice,
              badge: discountPercentage > 0 ? `${discountPercentage}% OFF` : (product.category_name ?? 'Popular'),
              rating: product.rating ?? (Number(product.average_rating || 0) || undefined),
              reviewsCount: product.reviewsCount ?? (Number(product.total_reviews || 0) || undefined),
              stock: product.stock
            };
          })
        : catalogProducts.slice(0, 4).map((product) => ({
            itemId: product.id !== undefined ? String(product.id) : product.slug,
            slug: product.slug,
            name: product.name,
            image: product.image,
            price: product.price,
            originalPrice: product.originalPrice,
            badge: product.offerTag ?? product.badge ?? product.note ?? 'Popular',
            rating: product.rating,
            reviewsCount: product.reviewsCount,
            stock: product.stock
          }))),
    [catalogProducts, productsOverride]
  );

  return (
    <section className="px-1 pb-2 pt-6 sm:px-2 sm:pb-3 sm:pt-7 lg:px-3 lg:pb-4 lg:pt-8">
      <div className="product-shell mx-auto max-w-[100rem] px-4 py-6 sm:px-5 lg:px-6 lg:py-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="mt-1 text-[2rem] font-medium text-[#4f2c2d] md:text-[2.1rem]">
              Popular Sarees
            </h2>
          </div>
        </div>

        <div className="product-section-grid mt-8">
          {products.map((product) => {
            const wishlistItemId = product.itemId || product.slug;
            const originalPrice = product.originalPrice ?? product.price;
            const discountPercentage =
              originalPrice > product.price && originalPrice > 0
                ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
                : 0;
            const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

            return (
            <article
              key={`${wishlistItemId}-${product.slug}`}
              className="product-card product-section-card compact-home-card group relative h-[23rem]"
            >
              <button
                type="button"
                onClick={() => navigateToProduct(product.slug)}
                className="product-image-wrap product-section-image-wrap w-full text-left"
              >
                <div className="product-section-image-frame">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={sanitizeDisplayText(product.name)}
                      className="product-image-media home-card-product-image transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                      Image not available
                    </span>
                  )}
                </div>
                <div className="product-badge">{isOutOfStock ? 'Out of Stock' : product.badge}</div>
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

              <div className="product-card-body h-[5.5rem] flex-none justify-start gap-0.5 overflow-hidden">
                <div className="min-h-0">
                  <h3 className="line-clamp-2 text-[1rem] font-medium leading-snug text-[#6a3840]">
                    {sanitizeDisplayText(product.name)}
                  </h3>
                </div>
                <div className="flex min-h-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-[1rem] font-semibold leading-none text-[#4f2c2d]">
                    {formatCurrency(product.price)}
                  </p>
                  {discountPercentage > 0 ? (
                    <>
                      <p className="text-[12px] leading-none text-ink/42 line-through">{formatCurrency(originalPrice)}</p>
                      <p className="text-[11px] font-semibold leading-none text-[#d9475e]">({discountPercentage}% off)</p>
                    </>
                  ) : null}
                </div>

              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ProductSection;
