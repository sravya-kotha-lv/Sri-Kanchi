import { useEffect, useMemo, useState } from 'react';
import commonApi, { type Category } from '../api/commonapi';
import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import { useCatalog } from '../context/CatalogContext';
import { buildProductSearchQuery, findMatchingProductColor, normalizeSearchText } from '../utils/searchQuery';
import FooterPage from './FooterPage';

const normalizeCategorySearchValue = (value: string) =>
  normalizeSearchText(value)
    .replace(/\bsarees?\b/g, '')
    .replace(/\s+/g, '');

const getCategorySearchAliases = (value: string) => {
  const normalized = normalizeCategorySearchValue(value);
  const aliases = new Set([normalized]);

  if (normalized.includes('banaras') || normalized.includes('banarasi')) {
    aliases.add(normalized.replace(/banarasi/g, 'banaras'));
    aliases.add(normalized.replace(/banaras/g, 'banarasi'));
  }

  return Array.from(aliases).filter(Boolean);
};

function SearchResultsPage() {
  const { products } = useCatalog();
  const [categories, setCategories] = useState<Category[]>([]);
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q')?.trim() ?? '';
  const searchColor = findMatchingProductColor(query, products);
  const searchQuery = buildProductSearchQuery(query, products);
  const matchingCategories = useMemo(() => {
    const queryAliases = getCategorySearchAliases(query);

    if (!queryAliases.length) {
      return [];
    }

    return categories.filter((category) => {
      const categoryAliases = [
        ...getCategorySearchAliases(category.name),
        ...getCategorySearchAliases(category.slug)
      ];

      return categoryAliases.some((categoryAlias) =>
        queryAliases.some(
          (queryAlias) =>
            categoryAlias === queryAlias ||
            categoryAlias.includes(queryAlias) ||
            queryAlias.includes(categoryAlias)
        )
      );
    });
  }, [categories, query]);
  const matchingCategory = matchingCategories[0] ?? null;
  const apiQuery = useMemo(
    () =>
      matchingCategories.length > 1
        ? undefined
        : matchingCategory
          ? { category_id: matchingCategory.id, sort: 'newest' as const }
        : searchColor
          ? { color: searchColor, sort: 'newest' as const }
          : { search: searchQuery || undefined, sort: 'newest' as const },
    [matchingCategories.length, matchingCategory, searchColor, searchQuery]
  );

  useEffect(() => {
    let isActive = true;

    void commonApi.categories
      .list({ limit: 100 })
      .then((response) => {
        if (isActive) {
          setCategories(response.data ?? []);
        }
      })
      .catch(() => {
        if (isActive) {
          setCategories([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <>
      <CatalogBrowserPage
        products={products}
        title={query ? `Search: ${query}` : 'Search'}
        resultsLabel="matching products visible"
        defaultCategory={matchingCategory?.name ?? 'All'}
        apiQuery={apiQuery}
        emptyTitle="No products matched your search"
        emptyDescription="Try a different keyword, category, colour, or price range to find the saree you want."
      />
      <FooterPage />
    </>
  );
}

export default SearchResultsPage;
