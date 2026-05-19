import type { Product as ApiProduct, ProductImage } from '../api/commonapi';

type ProductImageLike = ProductImage | string | { image_url?: string | null; upload_url?: string | null; url?: string | null };

const getProductImageUrl = (image: ProductImageLike) => {
  if (typeof image === 'string') {
    return image.trim();
  }

  return (image.image_url ?? image.upload_url ?? image.url ?? '').trim();
};

export const getStableProductImages = (product: ApiProduct) => {
  const apiImages = [...(product.images ?? [])]
    .filter((image) => Boolean(getProductImageUrl(image)))
    .sort((first, second) => {
      if (typeof first === 'string' || typeof second === 'string') {
        return 0;
      }

      if (first.is_primary !== second.is_primary) return first.is_primary ? -1 : 1;

      const firstOrder = first.sort_order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.sort_order ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) return firstOrder - secondOrder;

      return (first.id ?? 0) - (second.id ?? 0);
    })
    .map(getProductImageUrl);

  return Array.from(
    new Set([
      ...apiImages,
      ...(product.galleryImages ?? []).map((image) => image.trim()).filter(Boolean),
      product.image?.trim() ?? ''
    ].filter(Boolean))
  );
};
