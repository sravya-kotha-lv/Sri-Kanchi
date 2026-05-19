import CatalogBrowserPage from '../components/catalog/CatalogBrowserPage';
import { useCatalog } from '../context/CatalogContext';
import FooterPage from './FooterPage';

function NewArrivalsPage() {
  const { getProductsBySource } = useCatalog();

  return (
    <>
      <CatalogBrowserPage
        products={getProductsBySource('new-arrivals')}
        title="New Arrivals"
        apiQuery={{ newArrival: true, sort: 'newest' }}
        emptyTitle="No arrivals found"
        emptyDescription="New arrivals are currently unavailable."
        showCartAction={false}
        cardVariant="editorial"
      />
      <FooterPage />
    </>
  );
}

export default NewArrivalsPage;
