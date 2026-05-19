import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import ScrollToTop from './components/common/ScrollToTop';
import Header from './components/layout/Header';
import { useShop } from './context/ShopContext';
import { navigateTo } from './utils/navigation';

const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminHostDashboardPage = lazy(() => import('./pages/AdminHostDashboardPage'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const BestSellingProductsPage = lazy(() => import('./pages/BestSellingProductsPage'));
const BridalPage = lazy(() => import('./pages/BridalPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CategoryCatalogPage = lazy(() => import('./pages/CategoryCatalogPage'));
const CollectionCatalogPage = lazy(() => import('./pages/CollectionCatalogPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NewArrivalsPage = lazy(() => import('./pages/NewArrivalsPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage'));
const TermsAndConditionsPage = lazy(() => import('./pages/TermsAndConditionsPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));




function PageLoader() {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-10">
      <div className="page-card mx-auto max-w-4xl p-8 text-center">
        <p className="text-sm font-semibold text-ink/62">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const [locationPath, setLocationPath] = useState(`${window.location.pathname}${window.location.search}`);
  const pathname = locationPath.split('?')[0] || '/';
  const { currentUser } = useShop();
  const isAdminUser =
    currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const isSuperAdminUser = currentUser?.role === 'superadmin';
  const shouldRedirectToHome =
    (pathname === '/admin' && !isAdminUser) ||
    (pathname === '/admin/host-dashboard' && !isSuperAdminUser);
  const resolvedPathname = shouldRedirectToHome ? '/' : pathname;

  useEffect(() => {
    const onPopState = () => setLocationPath(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', onPopState);

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (shouldRedirectToHome) {
      navigateTo('/');
    }
  }, [shouldRedirectToHome]);

  const pageElement = useMemo(() => {

    if (resolvedPathname.startsWith('/orders/')) {
    return <OrderDetailPage />;
  }
    if (resolvedPathname.startsWith('/products/')) {
      return <ProductDetailPage />;
    }

    if (resolvedPathname.startsWith('/categories/')) {
      const categorySlug = resolvedPathname.replace(/^\/categories\//, '').trim();

      return <CategoryCatalogPage categorySlug={categorySlug} />;
    }

    if (resolvedPathname.startsWith('/collections/')) {
      const collectionSlug = resolvedPathname.replace(/^\/collections\//, '').trim();

      return <CollectionCatalogPage collectionSlug={collectionSlug} />;
    }

    switch (resolvedPathname) {
      case '/categories':
        return <CategoryCatalogPage defaultCategory="All" />;
      case '/collections':
        return <CollectionCatalogPage defaultCategory="All" />;
      case '/new-arrivals':
        return <NewArrivalsPage />;
      case '/login':
        return <LoginPage />;
      case '/wishlist':
        return <WishlistPage />;
      case '/cart':
        return <CartPage />;
      case '/profile':
        return <ProfilePage />;

        case '/orders':
  return <OrdersPage />;

      case '/search':
        return <SearchResultsPage />;
      case '/admin':
        return <AdminDashboardPage />;
      case '/admin/host-dashboard':
        return <AdminHostDashboardPage />;
      case '/about-us':
        return <AboutUsPage />;
      case '/contact':
        return <ContactPage />;
      case '/terms-and-conditions':
        return <TermsAndConditionsPage />;
      case '/privacy-policy':
        return <PrivacyPolicyPage />;
      case '/bridal':
        return <BridalPage />;
      case '/best-selling-products':
        return <BestSellingProductsPage />;
      case '/':
      default:
        return <HomePage />;
    }
  }, [resolvedPathname]);

  return (
    <div className="min-h-screen bg-silk-radial pt-32 text-ink sm:pt-36 lg:pt-36">
      <ScrollToTop pathname={resolvedPathname} />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-8%] h-64 w-64 rounded-full bg-[#fff2df]/70 blur-3xl" />
        <div className="absolute bottom-[10%] right-[-8%] h-72 w-72 rounded-full bg-[#d77a61]/15 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(120deg,transparent_0%,rgba(105,32,58,0.8)_50%,transparent_100%)] [background-size:20rem_20rem]" />
      </div>

      <Header />
      <main className="relative z-10">
        <Suspense fallback={<PageLoader />}>{pageElement}</Suspense>
      </main>
    </div>
  );
}

export default App;


