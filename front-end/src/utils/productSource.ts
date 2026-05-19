import type { CatalogProductSource } from '../data/productCatalog';

type ProductSourceRecord = {
  id?: string | number | null;
  slug?: string | null;
  source?: string | null;
  product_type?: string | null;
  productType?: string | null;
  is_new_arrival?: boolean | null;
};

const PRODUCT_SOURCE_OVERRIDES_KEY = 'saree-aura-product-source-overrides';

export const normalizeProductSource = (value?: string | null): CatalogProductSource | undefined => {
  const normalized = value?.trim().toLowerCase().replace(/[_\s]+/g, '-');

  if (!normalized) {
    return undefined;
  }

  if (normalized === 'category' || normalized === 'categories') {
    return 'category';
  }

  if (normalized === 'collection' || normalized === 'collections') {
    return 'collection';
  }

  if (normalized === 'new-arrival' || normalized === 'new-arrivals') {
    return 'new-arrivals';
  }

  if (normalized === 'offer' || normalized === 'offers') {
    return 'offers';
  }

  return undefined;
};

const readProductSourceOverrides = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(PRODUCT_SOURCE_OVERRIDES_KEY) ?? '{}') as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeProductSourceOverrides = (overrides: Record<string, string>) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(PRODUCT_SOURCE_OVERRIDES_KEY, JSON.stringify(overrides));
};

const getProductSourceKeys = (product: ProductSourceRecord) =>
  [
    product.id !== undefined && product.id !== null ? `id:${product.id}` : '',
    product.slug?.trim() ? `slug:${product.slug.trim()}` : ''
  ].filter(Boolean);

export const saveProductSourceOverride = (product: ProductSourceRecord, source?: string | null) => {
  const normalizedSource = normalizeProductSource(source);
  const keys = getProductSourceKeys(product);

  if (!keys.length) {
    return;
  }

  const overrides = readProductSourceOverrides();
  keys.forEach((key) => {
    if (normalizedSource) {
      overrides[key] = normalizedSource;
    } else {
      delete overrides[key];
    }
  });
  writeProductSourceOverrides(overrides);
};

export const getProductSourceOverride = (product: ProductSourceRecord): CatalogProductSource | undefined => {
  const overrides = readProductSourceOverrides();

  for (const key of getProductSourceKeys(product)) {
    const source = normalizeProductSource(overrides[key]);

    if (source) {
      return source;
    }
  }

  return undefined;
};

export const resolveProductSource = (
  product: ProductSourceRecord,
  fallbackSource: CatalogProductSource
): CatalogProductSource => {
  if (product.is_new_arrival) {
    return 'new-arrivals';
  }

  return (
    getProductSourceOverride(product) ??
    normalizeProductSource(product.source ?? product.product_type ?? product.productType) ??
    fallbackSource
  );
};
