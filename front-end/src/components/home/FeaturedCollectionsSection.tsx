import { useEffect, useState } from 'react';
import commonApi, { type PublicDashboardCategory } from '../../api/commonapi';

function navigateTo(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function FeaturedCollectionsSection() {
  const [featuredCollections, setFeaturedCollections] = useState<PublicDashboardCategory[]>([]);

  useEffect(() => {
    let isActive = true;

    commonApi.publicDashboard
      .getFeaturedCategories({ limit: 3 })
      .then((categories) => {
        if (isActive) {
          setFeaturedCollections(categories.filter((category) => category.preview_image || category.image_url));
        }
      })
      .catch(() => {
        if (isActive) {
          setFeaturedCollections([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section id="collections" className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
      <div className="section-frame grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4 p-2">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-wine/75">Featured Collections</p>
          <h2 className="font-display text-4xl font-semibold text-[#3f2526] md:text-5xl">
            Three highlighted collections on home, with more waiting inside the collection page.
          </h2>
          <p className="text-base leading-7 text-ink/68">
            Click any collection card to move into the full collections page and continue browsing more curated categories.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {featuredCollections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(`/categories/${item.slug}`)}
              className="collection-card text-left"
            >
              <div className="overflow-hidden rounded-[26px]">
                <img
                  src={(item.preview_image || item.image_url)!}
                  alt={item.name}
                  className="h-48 w-full object-cover transition duration-500 hover:scale-105"
                />
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.24em] text-ink/45">Signature collection</p>
              <h3 className="mt-3 font-display text-3xl font-semibold text-wine">{item.name}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">
                {item.description?.trim() || 'Curated category from the storefront API.'}
              </p>
              <div className="mt-6 inline-flex rounded-full bg-white/65 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60 shadow-insetSoft">
                {item.product_count} styles
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedCollectionsSection;
