import type { CatalogProduct } from '../data/productCatalog';

const ignoredSearchWords = new Set([
  'saree',
  'sarees',
  'color',
  'colour',
  'colors',
  'colours',
  'product',
  'products'
]);

export const normalizeSearchText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const getSearchTokens = (value: string) =>
  normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token && !ignoredSearchWords.has(token))
    .map((token) => (token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token));

const getDistance = (left: string, right: string) => {
  const distances = Array.from({ length: left.length + 1 }, (_, index) =>
    Array.from({ length: right.length + 1 }, (_value, innerIndex) => (index === 0 ? innerIndex : innerIndex === 0 ? index : 0))
  );

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      distances[leftIndex][rightIndex] = Math.min(
        distances[leftIndex - 1][rightIndex] + 1,
        distances[leftIndex][rightIndex - 1] + 1,
        distances[leftIndex - 1][rightIndex - 1] + cost
      );
    }
  }

  return distances[left.length][right.length];
};

const isCloseToken = (token: string, candidate: string) => {
  if (token === candidate || candidate.includes(token) || token.includes(candidate)) {
    return true;
  }

  const allowedDistance = candidate.length > 5 ? 2 : 1;
  return token.length > 2 && getDistance(token, candidate) <= allowedDistance;
};

export const findMatchingProductColor = (query: string, products: CatalogProduct[]) => {
  const tokens = getSearchTokens(query);

  if (!tokens.length) {
    return '';
  }

  const colorOptions = products
    .map((product) => ({
      value: product.color,
      tokens: getSearchTokens(product.color)
    }))
    .filter((color) => color.value.trim() && color.tokens.length);
  const matchedColor = tokens.find((token) =>
    colorOptions.some((color) => color.tokens.some((colorToken) => isCloseToken(token, colorToken)))
  );

  return matchedColor
    ? colorOptions.find((color) => color.tokens.some((colorToken) => isCloseToken(matchedColor, colorToken)))?.value ?? matchedColor
    : '';
};

export const buildProductSearchQuery = (query: string, products: CatalogProduct[]) => {
  const tokens = getSearchTokens(query);

  if (!tokens.length) {
    return normalizeSearchText(query);
  }

  const matchedColor = findMatchingProductColor(query, products);

  if (matchedColor) {
    return matchedColor;
  }

  return tokens.join(' ');
};
