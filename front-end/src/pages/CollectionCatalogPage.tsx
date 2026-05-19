import { useEffect, useMemo, useState } from 'react';
import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import { useCatalog } from '../context/CatalogContext';
import type { PublicProductListQuery } from '../api/commonapi';
import FooterPage from './FooterPage';

type CollectionCatalogPageProps = {
  defaultCategory?: string;
  collectionSlug?: string;
};

type CollectionMatchScope = 'all' | 'occasion' | 'category';

const normalizeCollectionValue = (value: string | undefined) =>
  value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '') ?? '';

const matchesCollectionSlug = (value: string | undefined, collectionSlug?: string) =>
  Boolean(collectionSlug) && normalizeCollectionValue(value) === normalizeCollectionValue(collectionSlug);

const getBackendOccasionValue = (value: string) => {
  const normalized = normalizeCollectionValue(value);

  if (normalized === 'festivalwear') {
    return 'festival';
  }

  return value;
};

function CollectionCatalogPage({ defaultCategory = 'All', collectionSlug }: CollectionCatalogPageProps) {
  const { getProductsBySource, products } = useCatalog();
  const collectionProducts = getProductsBySource('collection');
  const [resolvedCollectionName, setResolvedCollectionName] = useState(defaultCategory);
  const [resolvedCollectionScope, setResolvedCollectionScope] = useState<CollectionMatchScope>('all');

  useEffect(() => {
    if (!collectionSlug) {
      setResolvedCollectionName(defaultCategory);
      setResolvedCollectionScope(defaultCategory === 'All' ? 'all' : 'occasion');
      return;
    }

    const matchedOccasion = products.find((product) => matchesCollectionSlug(product.occasion, collectionSlug))?.occasion;
    const matchedCategory = collectionProducts.find((product) => matchesCollectionSlug(product.category, collectionSlug))?.category;

    if (matchedOccasion) {
      setResolvedCollectionName(matchedOccasion);
      setResolvedCollectionScope('occasion');
      return;
    }

    if (matchedCategory) {
      setResolvedCollectionName(matchedCategory);
      setResolvedCollectionScope('category');
      return;
    }

    setResolvedCollectionName(defaultCategory);
    setResolvedCollectionScope(defaultCategory === 'All' ? 'all' : 'occasion');
  }, [collectionProducts, collectionSlug, defaultCategory]);

  const visibleCollectionProducts = useMemo(() => {
    if (resolvedCollectionName === 'All' || resolvedCollectionScope === 'all') {
      return collectionProducts;
    }

    if (resolvedCollectionScope === 'category') {
      return products.filter((product) => product.category === resolvedCollectionName);
    }

    return products.filter(
      (product) => normalizeCollectionValue(product.occasion) === normalizeCollectionValue(resolvedCollectionName)
    );
  }, [collectionProducts, products, resolvedCollectionName, resolvedCollectionScope]);

  const pageTitle = resolvedCollectionName === 'All' ? 'Collections' : resolvedCollectionName;
  const collectionApiQuery = useMemo<PublicProductListQuery | undefined>(
    () =>
      resolvedCollectionScope === 'occasion' && resolvedCollectionName !== 'All'
        ? { occasion: getBackendOccasionValue(resolvedCollectionName), sort: 'newest' }
        : { sort: 'newest' },
    [resolvedCollectionName, resolvedCollectionScope]
  );
  const initialCollectionFilter = useMemo(
    () =>
      resolvedCollectionScope === 'occasion' && resolvedCollectionName !== 'All'
        ? {
            type: 'occasion' as const,
            label: resolvedCollectionName,
            occasion: getBackendOccasionValue(resolvedCollectionName)
          }
        : null,
    [resolvedCollectionName, resolvedCollectionScope]
  );

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col">
      <div className="flex-1">
        <CatalogBrowserPage
          products={visibleCollectionProducts}
          title={pageTitle}
          defaultCategory={resolvedCollectionName}
          initialFilter={initialCollectionFilter}
          filterField={resolvedCollectionScope === 'occasion' ? 'occasion' : 'category'}
          filterLabel={resolvedCollectionScope === 'occasion' ? 'Occasion' : 'Category'}
          apiQuery={collectionApiQuery}
          emptyTitle="No collections found"
          emptyDescription="Products are currently unavailable in this collection."
          cardVariant="editorial"
          equalCardHeights
        />
      </div>
      <FooterPage />
    </div>
  );
}

export default CollectionCatalogPage;
