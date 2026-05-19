import { useEffect, useState } from 'react';
import commonApi, { type Category, type PublicDashboardCategory, type PublicDashboardHomeData } from '../api/commonapi';
import HeroSection from '../components/home/HeroSection';
import ProductSection from '../components/home/ProductSection';
import CollectionPage from './CollectionPage';
import BestSellingProductsPage from './BestSellingProductsPage';
import FooterPage from './FooterPage';

const normalizeCategoryKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const mergeFeaturedCategories = (
  featuredCategories: PublicDashboardCategory[],
  categories: Category[]
): PublicDashboardCategory[] => {
  if (!categories.length) {
    return featuredCategories;
  }

  const featuredByKey = new Map<string, PublicDashboardCategory>();

  featuredCategories.forEach((category) => {
    featuredByKey.set(normalizeCategoryKey(category.slug ?? ''), category);
    featuredByKey.set(normalizeCategoryKey(category.name), category);
  });

  return categories
    .filter((category) => {
      const normalizedName = category.name.trim().toLowerCase();

      return (
        Boolean(normalizedName) &&
        normalizedName !== 'string' &&
        !normalizedName.includes('test') &&
        !/^\d+$/.test(normalizedName)
      );
    })
    .map((category) => {
      const matchedFeatured =
        featuredByKey.get(normalizeCategoryKey(category.slug ?? '')) ??
        featuredByKey.get(normalizeCategoryKey(category.name));

      const categoryImage = category.image_url ?? category.imageUrl ?? null;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? matchedFeatured?.description ?? null,
        image_url: categoryImage,
        product_count: Number(matchedFeatured?.product_count ?? 0),
        starting_price: Number(matchedFeatured?.starting_price ?? 0),
        preview_image: categoryImage
      };
    });
};

function HomePage() {
  const [dashboardData, setDashboardData] = useState<PublicDashboardHomeData | null | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [dashboardResult, categoriesResult] = await Promise.allSettled([
          commonApi.publicDashboard.getHome({
            hero_limit: 5,
            category_limit: 20,
            deal_limit: 5,
            product_limit: 5
          }),
          commonApi.categories.list()
        ]);

        if (dashboardResult.status !== 'fulfilled') {
          throw dashboardResult.reason;
        }

        const response = dashboardResult.value;
        const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [];

        if (isMounted) {
          setDashboardData({
            ...response,
            featured_categories: mergeFeaturedCategories(response.featured_categories ?? [], categories)
          });
        }
      } catch {
        if (isMounted) {
          setDashboardData(null);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-0">
      <HeroSection />
      {dashboardData !== undefined ? <ProductSection productsOverride={dashboardData?.trending_products ?? []} /> : null}
      {dashboardData !== undefined ? <CollectionPage isEmbedded featuredCategories={dashboardData?.featured_categories ?? []} /> : null}
      {dashboardData !== undefined ? <BestSellingProductsPage isEmbedded productsOverride={dashboardData?.top_deals ?? []} /> : null}
      <FooterPage />
    </div>
  );
}

export default HomePage;
