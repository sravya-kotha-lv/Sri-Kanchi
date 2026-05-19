import { useMemo } from 'react';
import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import { useCatalog } from '../context/CatalogContext';
import FooterPage from './FooterPage';

const hasBridalSignal = (value?: string) => {
  const normalizedValue = value?.trim().toLowerCase() ?? '';
  return normalizedValue.includes('bridal') || normalizedValue.includes('wedding');
};

function BridalPage() {
  const { products } = useCatalog();

  const bridalProducts = useMemo(
    () =>
      products.filter((product) =>
        hasBridalSignal(product.occasion) ||
        hasBridalSignal(product.badge) ||
        hasBridalSignal(product.note) ||
        hasBridalSignal(product.offerTag) ||
        hasBridalSignal(product.shortDescription) ||
        hasBridalSignal(product.name)
      ),
    [products]
  );

  return (
    <>
      <CatalogBrowserPage
        products={bridalProducts}
        title="Bridal Sarees"
        resultsLabel="bridal sarees visible"
        defaultCategory="All"
        emptyTitle="No bridal sarees found"
        emptyDescription="Try another bridal category, colour, or price filter to explore more wedding-ready sarees."
        showCartAction={false}
        cardVariant="editorial"
      />

      <FooterPage />
    </>
  );
}

export default BridalPage;
