export function navigateTo(path: string) {
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

export function navigateToProduct(slug: string) {
  try {
    window.sessionStorage.removeItem('saree-aura-selected-product-image');
  } catch {
  }

  navigateTo(`/products/${slug}`);
}

export function navigateToProductImage(slug: string, image: string) {
  try {
    window.sessionStorage.setItem('saree-aura-selected-product-image', JSON.stringify({ slug, image }));
  } catch {
  }

  navigateTo(`/products/${slug}`);
}
