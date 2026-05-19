import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import commonApi, { type Product as ApiProduct } from '../api/commonapi';
import type { CatalogProduct, CatalogProductSource } from '../data/productCatalog';
import { getStableProductImages } from '../utils/productImages';
import { resolveProductSource } from '../utils/productSource';

type ProductSource = CatalogProduct['source'];

type CatalogDraft = Omit<CatalogProduct, 'slug'> & {
  slug?: string;
  description?: string;
  stock?: number;
};

type CatalogContextValue = {
  products: CatalogProduct[];
  isLoading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  addProduct: (draft: CatalogDraft) => Promise<CatalogProduct>;
  updateProduct: (slug: string, draft: Partial<CatalogDraft>) => Promise<CatalogProduct | null>;
  removeProduct: (slug: string) => Promise<boolean>;
  getProductBySlug: (slug: string) => CatalogProduct | undefined;
  getProductsBySource: (source: ProductSource) => CatalogProduct[];
  getSimilarProducts: (product: CatalogProduct, limit?: number) => CatalogProduct[];
  searchProducts: (query: string) => CatalogProduct[];
};

const CATALOG_STORAGE_KEY = 'saree-aura-catalog';
const CATALOG_STORAGE_VERSION_KEY = 'saree-aura-catalog-version';
const CATALOG_STORAGE_VERSION = '2026-05-06-explicit-occasion-v3';
let catalogBootstrapPromise: Promise<void> | null = null;
let catalogBootstrapCompleted = false;

const CatalogContext = createContext<CatalogContextValue | null>(null);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function normalizeCatalogCategory(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return 'Sarees';
  }

  if (normalized.includes('soft silk') || normalized.includes('softsilk') || normalized.includes('soft pattu')) {
    return 'Soft Silk';
  }

  if (normalized.includes('kanchi') || normalized.includes('kanchipuram') || normalized.includes('kanjivaram')) {
    return 'Kanchipuram';
  }

  if (normalized.includes('banarasi')) {
    return 'Banarasi';
  }

  if (normalized.includes('gadwal')) {
    return 'Gadwal';
  }

  if (normalized.includes('organza')) {
    return 'Organza';
  }

  if (normalized.includes('cotton')) {
    return 'Cotton Sarees';
  }

  if (normalized.includes('silk')) {
    return 'Silk Sarees';
  }

  return value.trim();
}

function normalizeCatalogOccasion(value?: string) {
  const normalized = value?.trim().toLowerCase() ?? '';

  if (!normalized) {
    return undefined;
  }

  if (normalized.includes('wedding') || normalized.includes('bridal')) {
    return 'Wedding';
  }

  if (normalized.includes('party')) {
    return 'Party Wear';
  }

  if (normalized.includes('festival') || normalized.includes('festive')) {
    return 'Festival Wear';
  }

  if (normalized.includes('casual') || normalized.includes('daily') || normalized.includes('everyday') || normalized.includes('lightweight')) {
    return 'Casual Wear';
  }

  return value?.trim();
}

function inferOccasionFromProduct(product: Partial<CatalogProduct>) {
  return normalizeCatalogOccasion(product.occasion);
}

function readStoredCatalog() {
  try {
    const storedVersion = window.localStorage.getItem(CATALOG_STORAGE_VERSION_KEY);

    if (storedVersion !== CATALOG_STORAGE_VERSION) {
      return [];
    }

    const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CatalogProduct[]) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCatalog(products: CatalogProduct[]) {
  window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));
  window.localStorage.setItem(CATALOG_STORAGE_VERSION_KEY, CATALOG_STORAGE_VERSION);
}

function inferSourceByCategory(category: string) {
  const normalizedCategory = normalizeCatalogCategory(category).trim().toLowerCase();

  if (
    normalizedCategory.includes('silk saree') ||
    normalizedCategory.includes('cotton saree') ||
    normalizedCategory === 'silk sarees' ||
    normalizedCategory === 'cotton sarees'
  ) {
    return 'category';
  }

  return 'collection';
}

function inferSource(product: CatalogProduct): CatalogProductSource {
  if (product.source) {
    return product.source;
  }

  return inferSourceByCategory(product.category);
}

function isOfferProduct(product: Pick<CatalogProduct, 'price' | 'originalPrice'>) {
  return (product.originalPrice ?? product.price) > product.price;
}

function buildCatalogProduct(draft: CatalogDraft | Partial<CatalogDraft>, fallback?: CatalogProduct): CatalogProduct {
  const name = (draft.name ?? fallback?.name ?? '').trim();
  const slug = (draft.slug?.trim() || fallback?.slug || slugify(name)).trim();
  const category = (draft.category ?? fallback?.category ?? 'Sarees').trim() || 'Sarees';
  const occasion = inferOccasionFromProduct({
    ...fallback,
    ...draft,
    name,
    category
  });
  const image = (draft.image ?? fallback?.image ?? '').trim();
  const galleryImages = (draft.galleryImages ?? fallback?.galleryImages ?? []).filter(Boolean);

  return {
    id: draft.id ?? fallback?.id ?? slug,
    categoryId: draft.categoryId ?? fallback?.categoryId,
    slug,
    name,
    category,
    occasion,
    shortDescription: draft.shortDescription ?? fallback?.shortDescription,
    color: draft.color ?? fallback?.color ?? 'Classic',
    price: Number(draft.price ?? fallback?.price ?? 0),
    originalPrice:
      draft.originalPrice !== undefined || fallback?.originalPrice !== undefined
        ? Number(draft.originalPrice ?? fallback?.originalPrice ?? 0)
        : undefined,
    image: image || galleryImages[0] || fallback?.image || '',
    galleryImages: galleryImages.length ? galleryImages : image ? [image] : fallback?.galleryImages,
    source: inferSource({
      ...(fallback ?? {
        slug,
        name,
        category,
        occasion,
        color: draft.color ?? 'Classic',
        price: Number(draft.price ?? 0),
        image
      }),
      ...draft,
      originalPrice: draft.originalPrice ?? fallback?.originalPrice
    } as CatalogProduct),
    badge: draft.badge ?? fallback?.badge,
    note: draft.note ?? draft.description ?? fallback?.note,
    offerTag: draft.offerTag ?? fallback?.offerTag,
    rating: draft.rating ?? fallback?.rating,
    reviewsCount: draft.reviewsCount ?? fallback?.reviewsCount,
    stock: draft.stock ?? fallback?.stock
  };
}

function toNumber(value: number | string | undefined, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function mapApiProductToCatalog(product: ApiProduct, categoriesById: Map<number, string>): CatalogProduct {
  const galleryImages = getStableProductImages(product);
  const primaryImage = product.image?.trim() || galleryImages[0] || '';
  const category =
    product.category?.trim() ||
    (product.category_id !== undefined ? categoriesById.get(product.category_id)?.trim() : undefined) ||
    'Sarees';
  const price = toNumber(product.selling_price ?? product.price);
  const originalPriceValue =
    product.mrp !== undefined || product.originalPrice !== undefined
      ? toNumber(product.mrp ?? product.originalPrice)
      : undefined;
  const inferredSource = inferSourceByCategory(category);

  return buildCatalogProduct({
    id: product.id,
    categoryId: product.category_id,
    slug: product.slug,
    name: product.name,
    category,
    occasion: product.occasion?.trim() || undefined,
    shortDescription: product.short_description?.trim() || undefined,
    color: product.color ?? 'Classic',
    price,
    originalPrice: originalPriceValue,
    image: primaryImage,
    galleryImages: galleryImages.length ? galleryImages : primaryImage ? [primaryImage] : [],
    badge: product.badge,
    note: product.note ?? product.description,
    offerTag: product.offerTag,
    rating: toNumber(product.rating ?? product.average_rating, undefined),
    reviewsCount: toNumber(product.reviewsCount ?? product.total_reviews, undefined),
    stock: product.stock,
    source: resolveProductSource(product, inferredSource)
  });
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>(() => readStoredCatalog());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProducts = async () => {
    setIsLoading(true);

    try {
      const [publicProducts, categoriesResponse] = await Promise.all([
        commonApi.products.getAll(),
        commonApi.categories.list().catch(() => null)
      ]);
      const categoriesById = new Map((categoriesResponse?.data ?? []).map((category) => [category.id, category.name]));
      const mappedProducts = publicProducts
        .map((product) => mapApiProductToCatalog(product, categoriesById))
        .filter((product) => product.slug && product.name);

      if (mappedProducts.length) {
        setProducts(mappedProducts);
        persistCatalog(mappedProducts);
        setError(null);
      } else {
        setProducts([]);
        persistCatalog([]);
        setError('Products API returned no items.');
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unable to load products from API.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    persistCatalog(products);

    const bootstrapCatalog = () => {
      if (window.location.pathname === '/login') {
        setIsLoading(false);
        return;
      }

      if (catalogBootstrapCompleted) {
        setIsLoading(false);
        return;
      }

      if (!catalogBootstrapPromise) {
        catalogBootstrapPromise = refreshProducts().finally(() => {
          catalogBootstrapCompleted = true;
          catalogBootstrapPromise = null;
        });
      }

      void catalogBootstrapPromise;
    };

    bootstrapCatalog();
    window.addEventListener('popstate', bootstrapCatalog);

    return () => window.removeEventListener('popstate', bootstrapCatalog);
  }, []);

  const addProduct = async (draft: CatalogDraft) => {
    const created = buildCatalogProduct(draft);

    setProducts((currentProducts) => {
      const nextProducts = [created, ...currentProducts];
      persistCatalog(nextProducts);
      return nextProducts;
    });

    return created;
  };

  const updateProduct = async (slug: string, draft: Partial<CatalogDraft>) => {
    let updatedProduct: CatalogProduct | null = null;

    setProducts((currentProducts) => {
      const nextProducts = currentProducts.map((product) => {
        if (product.slug !== slug) {
          return product;
        }

        updatedProduct = buildCatalogProduct(draft, product);
        return updatedProduct;
      });

      persistCatalog(nextProducts);
      return nextProducts;
    });

    return updatedProduct;
  };

  const removeProduct = async (slug: string) => {
    let removed = false;

    setProducts((currentProducts) => {
      const nextProducts = currentProducts.filter((product) => {
        const keep = product.slug !== slug;
        if (!keep) {
          removed = true;
        }
        return keep;
      });

      persistCatalog(nextProducts);
      return nextProducts;
    });

    return removed;
  };

  const getProductBySlug = (slug: string) => products.find((product) => product.slug === slug);

  const getProductsBySource = (source: ProductSource) => {
    if (source === 'offers') {
      return products.filter((product) => isOfferProduct(product));
    }

    if (source === 'new-arrivals') {
      return products.filter((product) => product.source === 'new-arrivals');
    }

    if (source === 'category') {
      return products.filter((product) => product.source === 'category');
    }

    return products.filter((product) => product.source === source);
  };

  const getSimilarProducts = (product: CatalogProduct, limit = 4) =>
    products
      .filter((item) => item.slug !== product.slug && (item.category === product.category || item.source === product.source))
      .slice(0, limit);

  const normalizeSearchValue = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');

  const toSearchVariants = (value: string) => {
    const normalized = normalizeSearchValue(value);
    const tokens = normalized.split(/\s+/).filter(Boolean);

    return Array.from(new Set([
      normalized,
      ...tokens,
      ...tokens
        .filter((token) => token.length > 3 && token.endsWith('s'))
        .map((token) => token.slice(0, -1))
    ]));
  };

  const searchProducts = (query: string) => {
    const queryVariants = toSearchVariants(query);
    const normalizedQuery = queryVariants[0] ?? '';

    if (!normalizedQuery) {
      return [];
    }

    return products.filter((product) =>
      [product.name, product.category, product.occasion, product.shortDescription, product.color, product.badge, product.note, product.offerTag]
        .filter(Boolean)
        .some((value) => {
          const searchableValue = normalizeSearchValue(value!);

          return queryVariants.some((variant) => searchableValue.includes(variant));
        })
    );
  };

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      isLoading,
      error,
      refreshProducts,
      addProduct,
      updateProduct,
      removeProduct,
      getProductBySlug,
      getProductsBySource,
      getSimilarProducts,
      searchProducts
    }),
    [error, isLoading, products]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }

  return context;
}
