import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import FooterPage from './FooterPage';
import { navigateTo, navigateToProduct } from '../utils/navigation';
import BackButton from '../components/common/BackButton';

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;
function WishlistPage() {
  const { products } = useCatalog();
  const { addToCart, cartEntries, toggleWishlist, wishlistItems } = useShop();
  const moveToCart = async (itemId: string) => {
    const addResult = await addToCart(itemId);

    if (addResult.success) {
      toggleWishlist(itemId);
    }
  };

  const wishlistProducts = wishlistItems
    .map((itemId) => {
      const product = products.find((item) => String(item.id ?? '') === itemId || item.slug === itemId || item.name === itemId);

      if (!product) {
        return null;
      }

      return { itemId, product };
    })
    .filter((item): item is { itemId: string; product: (typeof products)[number] } => Boolean(item));
  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width flex flex-col gap-8">
        <section className="page-card p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-[#eadfd8] pb-5 sm:flex-row sm:items-end sm:justify-between">


<div className="flex items-start gap-4">
  <BackButton fallbackPath="/" />
  <div>
    <p className="page-eyebrow">Your Favourites</p>
    <h1 className="mt-3 font-display text-4xl text-wine">Wishlist</h1>
  </div>
</div>


              <div className="rounded-[1.3rem] border border-[#eadfd8] bg-white/70 px-4 py-3 text-sm font-semibold text-[#2a2432]">
              {wishlistItems.length} saved items / {cartEntries.length} in cart
              </div>
          </div>

          {wishlistProducts.length > 0 ? (
            <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
              {wishlistProducts.map((item) => {
                const { itemId, product } = item;
                const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                const discount = hasDiscount ? Math.round((((product.originalPrice ?? product.price) - product.price) / (product.originalPrice ?? product.price)) * 100) : 0;
                const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

                return (
                  <article key={itemId} className="page-card flex flex-col self-start overflow-hidden rounded-[2rem] p-0">
                    <button
                      type="button"
                      onClick={() => navigateToProduct(product.slug)}
                      className="relative block h-[22rem] w-full shrink-0 overflow-hidden rounded-t-[2rem] bg-[#f8f1eb] text-left sm:h-[24rem]"
                    >
                      <img src={product.image} alt={product.name} className="h-full w-full object-cover object-top transition duration-500 hover:scale-105" />
                      <span className="product-badge">
                        {isOutOfStock ? 'Out of Stock' : product.offerTag ?? product.badge ?? product.category}
                      </span>
                    </button>

                    <div className="flex flex-col gap-2 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink/44">{product.category}</p>
                      <button
                        type="button"
                        onClick={() => navigateToProduct(product.slug)}
                        className="line-clamp-2 text-left font-display text-[1.05rem] leading-tight text-wine"
                      >
                        {product.name}
                      </button>
                      <div className="flex flex-wrap items-end gap-2">
                        <p className="text-[1rem] font-semibold text-[#2a2432]">{formatPrice(product.price)}</p>
                        {hasDiscount ? <p className="text-xs text-ink/42 line-through">{formatPrice(product.originalPrice ?? product.price)}</p> : null}
                        {discount > 0 ? <span className="text-xs font-semibold text-[#2b8a4b]">{discount}% Off</span> : null}
                      </div>

                      <div className="mt-1 flex flex-col gap-1.5">
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => moveToCart(itemId)}
                          className="flex min-h-[2.15rem] w-full items-center justify-center rounded-[0.9rem] bg-[#7f3150] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_20px_rgba(127,49,80,0.16)] transition hover:bg-[#682640] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleWishlist(itemId)}
                          className="flex min-h-[2.15rem] w-full items-center justify-center rounded-[0.9rem] border border-[#d8c8bc] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f3150] transition hover:bg-[#f5ebe3]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center">
              <h2 className="font-display text-3xl text-wine">Your wishlist is empty</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/62">
                Tap the heart icon on any product to save it here and compare your favourite sarees in one place.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="liquid-btn mx-auto mt-6 flex justify-center px-6 py-3 text-sm font-semibold text-white"
              >
                Explore Sarees
              </button>
            </div>
          )}
        </section>

        <FooterPage />
      </div>
    </div>
  );
}

export default WishlistPage;
