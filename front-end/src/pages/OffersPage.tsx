import { useEffect, useState } from 'react';
import commonApi, { type AdminDiscount, type PublicDashboardProduct } from '../api/commonapi';
import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import ProductRatingBadge from '../components/common/ProductRatingBadge';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import { formatCurrency, sanitizeDisplayText } from '../utils/displayText';
import { navigateToProduct } from '../utils/navigation';
import FooterPage from './FooterPage';

type OffersPageProps = {
  isEmbedded?: boolean;
  embeddedProducts?: PublicDashboardProduct[];
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

const getOfferValueLabel = (offer: AdminDiscount) =>
  offer.type === 'percentage' ? `${offer.value}% Off` : `${formatCurrency(Number(offer.value))} Off`;

const getOfferScopeLabel = (offer: AdminDiscount) => {
  if (offer.applies_to === 'product') {
    return 'Selected product offer';
  }

  if (offer.applies_to === 'category') {
    return 'Selected category offer';
  }

  return 'Storewide offer';
};

function OfferCard({ offer, compact = false }: { offer: AdminDiscount; compact?: boolean }) {
  return (
    <article
      className={`offer-display-card flex h-full flex-col overflow-hidden ${compact ? 'p-4' : 'p-5 sm:p-6'}`}
    >
      <div className="rounded-[1.8rem] bg-[linear-gradient(135deg,#7f3150_0%,#c96c5f_55%,#ebb06b_100%)] p-5 text-white shadow-[0_24px_38px_rgba(106,45,59,0.18)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-h-[5.75rem]">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/75">{getOfferScopeLabel(offer)}</p>
            <h3 className="mt-3 line-clamp-2 font-display text-3xl leading-tight">{offer.title}</h3>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            {offer.code}
          </span>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Offer Value</p>
            <p className="mt-2 text-3xl font-semibold">{getOfferValueLabel(offer)}</p>
          </div>
          <div className="rounded-[1.2rem] bg-white/15 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">Active Till</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(offer.ends_at)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 text-sm text-ink/68">
        <p className={`${compact ? 'min-h-[2.5rem] line-clamp-2' : ''}`}>
          {offer.description?.trim() || 'Apply this coupon at checkout to unlock the live storefront discount.'}
        </p>
        <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div className="rounded-[1.2rem] border border-[#ead8cf] bg-white/65 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/42">Minimum Order</p>
            <p className="mt-1 font-semibold text-[#4a2a2c]">
              {offer.min_order_amount ? formatCurrency(Number(offer.min_order_amount)) : 'No minimum'}
            </p>
          </div>
          <div className="rounded-[1.2rem] border border-[#ead8cf] bg-white/65 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/42">Max Discount</p>
            <p className="mt-1 font-semibold text-[#4a2a2c]">
              {offer.max_discount_amount ? formatCurrency(Number(offer.max_discount_amount)) : 'No cap'}
            </p>
          </div>
          {!compact ? (
            <div className="rounded-[1.2rem] border border-[#ead8cf] bg-white/65 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/42">Usage Limit</p>
              <p className="mt-1 font-semibold text-[#4a2a2c]">{offer.usage_limit ?? 'Unlimited'}</p>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function OffersPage({ isEmbedded = false, embeddedProducts = [] }: OffersPageProps) {
  const [offers, setOffers] = useState<AdminDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isInWishlist, toggleWishlist } = useShop();

  useEffect(() => {
    const loadOffers = async () => {
      setIsLoading(true);

      try {
        const response = await commonApi.offers.getActive({ limit: isEmbedded ? 4 : 12 });
        setOffers(response.data);
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load active offers right now.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadOffers();
  }, [isEmbedded]);
  const { getProductsBySource } = useCatalog();
  const offerProducts = getProductsBySource('offers');
  const showcaseProducts = embeddedProducts.length
    ? embeddedProducts.map((product) => {
        const productId = product.id ?? product.product_id;

        return {
        itemId: productId !== undefined && productId !== null ? String(productId) : product.slug,
        slug: product.slug,
        image: product.primary_image || '',
        name: product.name,
        category: product.category_name || 'Offer',
        color: product.color || 'Classic',
        originalPrice: Number(product.mrp || product.selling_price || 0),
        price: Number(product.selling_price || 0),
        badge: product.category_name || 'Offer',
        offerTag: product.discount_title || product.discount_code || 'Offer',
        rating: product.rating,
        reviewsCount: product.reviewsCount
      };
      })
    : offerProducts.map((product) => ({
        ...product,
        itemId: product.id !== undefined ? String(product.id) : product.slug
      }));

  if (isEmbedded) {
    return (
      <section className="px-1 pb-2 pt-0 text-ink sm:px-2 sm:pb-3 lg:px-3 lg:pb-4">
        <div className="page-shell app-width p-5 sm:p-6 lg:p-8">
          {isLoading ? <p className="text-sm text-ink/62">Loading active offers...</p> : null}
          {error ? <p className="text-sm text-[#a13f45]">{error}</p> : null}
          {!isLoading && !error ? (
            offers.length ? (
              <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-4">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} compact />
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/62">No active public offers are available right now.</p>
            )
          ) : null}
        </div>
        <div className="page-shell mx-auto max-w-[100rem] p-5 sm:p-6 lg:p-8">
          <div className="home-showcase-grid items-stretch">
            {showcaseProducts.slice(0, 4).map((product) => (
              <article
                key={`${product.itemId}-${product.slug}`}
                className="home-showcase-card offer-display-card product-card compact-home-card relative flex h-full w-full flex-col overflow-hidden p-0"
              >
                <button
                  type="button"
                  onClick={() => navigateToProduct(product.slug)}
                  className="product-image-wrap home-showcase-image-wrap text-left"
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={sanitizeDisplayText(product.name)}
                      className="product-image-media home-card-product-image cursor-pointer transition duration-500 hover:scale-105"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                      Image not available
                    </span>
                  )}
                  <span className="product-badge">{product.offerTag ?? product.badge ?? 'Offer'}</span>
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
                <div className="product-card-body justify-start gap-1.5 pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink/42">{product.category}</p>
                    <span className="text-xs font-semibold text-wine">{product.color}</span>
                  </div>
                  <h3 className="line-clamp-2 text-[1rem] font-medium leading-snug text-wine">{sanitizeDisplayText(product.name)}</h3>
                  <div className="flex items-end gap-2 overflow-hidden whitespace-nowrap">
                    <p className="text-[1rem] font-semibold leading-none text-[#4a2a2c]">{formatCurrency(product.price)}</p>
                    <p className="text-[12px] text-ink/42 line-through">{formatCurrency(product.originalPrice ?? product.price)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="px-3 pb-10 pt-0 text-ink sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
        <div className="app-width space-y-8">
          <section className="page-shell p-6 sm:p-8">
            <p className="page-eyebrow">Public Offers</p>
            <h1 className="mt-3 font-display text-4xl text-wine sm:text-5xl">Live coupon and discount offers</h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-ink/66">
              Explore currently active offers and use the coupon codes at checkout to unlock savings on your saree order.
            </p>
          </section>

          {isLoading ? <div className="page-card p-6 text-sm text-ink/62">Loading active offers...</div> : null}
          {error ? <div className="page-card p-6 text-sm text-[#a13f45]">{error}</div> : null}

          {!isLoading && !error ? (
            offers.length ? (
              <section className="grid gap-6 xl:grid-cols-2">
                {offers.map((offer) => (
                  <OfferCard key={offer.id} offer={offer} />
                ))}
              </section>
            ) : (
              <section className="page-card p-10 text-center">
                <h2 className="font-display text-3xl text-wine">No active offers found</h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/62">
                  New coupon campaigns will appear here as soon as they are activated in the storefront.
                </p>
              </section>
            )
          ) : null}
        </div>
      </div>
      <CatalogBrowserPage
        products={offerProducts}
        title="Offers"
        resultsLabel="offers visible"
        emptyTitle="No offers found"
        emptyDescription="Try a different pricing, category, or colour filter to see more discounted saree options."
        showCartAction={false}
        cardVariant="editorial"
      />
      <FooterPage />
    </>
  );
}

export default OffersPage;
