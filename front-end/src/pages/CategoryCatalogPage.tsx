import { useEffect, useMemo, useState } from 'react';
import commonApi, { type PublicProductListQuery } from '../api/commonapi';
import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import { useCatalog } from '../context/CatalogContext';
import FooterPage from './FooterPage';

type CategoryCatalogPageProps = {
  defaultCategory?: string;
  categorySlug?: string;
};

const slugifyCategory = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeCategoryToken = (value: string) => slugifyCategory(value).replace(/-/g, '');
const getCategoryTokenAliases = (value: string) => {
  const token = normalizeCategoryToken(value);
  const aliases = new Set([token]);
  const withoutSaree = token.replace(/sarees?$/g, '');

  if (withoutSaree) {
    aliases.add(withoutSaree);
  }

  if (token.length > 3 && token.endsWith('s')) {
    aliases.add(token.slice(0, -1));
  }

  if (token.includes('banaras') || token.includes('banarasi') || token.includes('banaarasi')) {
    aliases.add(token.replace(/banarasi/g, 'banaras'));
    aliases.add(token.replace(/banaras/g, 'banarasi'));
    aliases.add('banarasi');
    aliases.add('banaarasi');
    aliases.add('banaras');
  }

  if (token.includes('kanchi') || token.includes('kanchipuram') || token.includes('kanjivaram') || token.includes('kanjeevaram')) {
    aliases.add('kanchi');
    aliases.add('kanchipuram');
    aliases.add('kanjivaram');
    aliases.add('kanjeevaram');
  }

  return Array.from(aliases).filter(Boolean);
};

const doCategoryAliasesMatch = (value: string | undefined, aliases: string[]) => {
  const valueAliases = getCategoryTokenAliases(value ?? '');

  return valueAliases.some((valueAlias) =>
    aliases.some(
      (alias) =>
        valueAlias === alias ||
        valueAlias.includes(alias) ||
        alias.includes(valueAlias)
    )
  );
};

const categoryFallbackNames: Record<string, string> = {
  banarasi: 'Banarasi',
  banaras: 'Banarasi',
  kanchipuram: 'Kanchipuram',
  kanchi: 'Kanchipuram',
  kanjivaram: 'Kanchipuram',
  kanjeevaram: 'Kanchipuram',
  'cotton-sarees': 'Cotton Sarees',
  cotton: 'Cotton Sarees'
};

const getCategoryFallbackName = (categorySlug: string, defaultCategory: string) =>
  categoryFallbackNames[categorySlug] ??
  (categorySlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') ||
    defaultCategory);

function CategoryCatalogPage({ defaultCategory = 'All', categorySlug }: CategoryCatalogPageProps) {
  const { products } = useCatalog();
  const [resolvedCategoryName, setResolvedCategoryName] = useState(defaultCategory);
  const [resolvedCategoryId, setResolvedCategoryId] = useState<number | undefined>(undefined);
  const [categoryExists, setCategoryExists] = useState(true);

  useEffect(() => {
    let isMounted = true;

    if (!categorySlug) {
      setResolvedCategoryName(defaultCategory);
      setResolvedCategoryId(undefined);
      setCategoryExists(true);
      return () => {
        isMounted = false;
      };
    }

    const categorySlugAliases = getCategoryTokenAliases(categorySlug);
    const matchedProductCategory = products.find((product) => doCategoryAliasesMatch(product.category, categorySlugAliases))?.category;
    const fallbackCategoryName =
      matchedProductCategory ??
      getCategoryFallbackName(categorySlug, defaultCategory);

    setResolvedCategoryName(fallbackCategoryName);
    setResolvedCategoryId(undefined);

    commonApi.categories
      .list()
      .then((response) => {
        const matchedProductCategoryAfterLoad = products.find((product) =>
          doCategoryAliasesMatch(product.category, categorySlugAliases)
        )?.category;
        const exactMatchedCategory = response.data.find((category) => {
          return (
            category.slug === categorySlug ||
            slugifyCategory(category.name) === categorySlug ||
            doCategoryAliasesMatch(category.name, categorySlugAliases) ||
            doCategoryAliasesMatch(category.slug, categorySlugAliases)
          );
        });
        const relatedMatchedCategories = response.data.filter((category) => {
          return doCategoryAliasesMatch(category.name, categorySlugAliases) || doCategoryAliasesMatch(category.slug, categorySlugAliases);
        });
        const matchedCategory = exactMatchedCategory ?? relatedMatchedCategories[0];

        if (isMounted && (matchedProductCategoryAfterLoad || matchedCategory?.name?.trim())) {
          setResolvedCategoryName(matchedProductCategoryAfterLoad ?? matchedCategory.name.trim());
          setResolvedCategoryId(
            exactMatchedCategory ? matchedCategory.id : relatedMatchedCategories.length > 1 ? undefined : matchedCategory.id
          );
          setCategoryExists(true);
        } else if (isMounted) {
          setCategoryExists(Boolean(matchedProductCategory));
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedCategoryName(fallbackCategoryName);
          setResolvedCategoryId(undefined);
          setCategoryExists(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [categorySlug, defaultCategory, products]);

  const pageTitle = resolvedCategoryName === 'All' ? 'Categories' : resolvedCategoryName;
  const categoryApiQuery = useMemo<PublicProductListQuery | undefined>(
    () =>
      resolvedCategoryId
        ? { category_id: resolvedCategoryId, sort: 'newest' }
        : { sort: 'newest' },
    [categorySlug, resolvedCategoryId]
  );
  const initialCategoryFilter = useMemo(
    () =>
      resolvedCategoryName === 'All'
        ? null
        : {
            type: 'category' as const,
            label: resolvedCategoryName,
            categoryId: resolvedCategoryId
          },
    [resolvedCategoryId, resolvedCategoryName]
  );

  return (
    <>
      <CatalogBrowserPage
        products={products}
        title={pageTitle}
        defaultCategory={resolvedCategoryName}
        initialFilter={initialCategoryFilter}
        apiQuery={categoryApiQuery}
        emptyTitle={categoryExists ? 'No products found' : 'No category found'}
        emptyDescription={
          categoryExists
            ? 'Products are currently unavailable in this category.'
            : 'This category is not available right now.'
        }
        showCartAction={false}
        cardVariant="editorial"
        syncTitleWithCategoryFilter
        allCategoriesTitle="All Sarees"
      />
      <FooterPage />
    </>
  );
}

export default CategoryCatalogPage;
