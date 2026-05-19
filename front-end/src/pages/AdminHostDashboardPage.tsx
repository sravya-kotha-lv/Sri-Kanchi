import { type FormEvent, useEffect, useMemo, useState } from 'react';
import commonApi, {
  type AdminDashboardCategorySummary,
  type AdminDashboardLowStockProduct,
  type AdminDashboardSummary,
  type AdminDashboardTopProduct
} from '../api/commonapi';
import { useCatalog } from '../context/CatalogContext';

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString('en-IN')}`;

const formatDateTime = (value?: string) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const monthlyEarnings = [
  { month: 'Jan', earnings: 182000, orders: 48 },
  { month: 'Feb', earnings: 164500, orders: 42 },
  { month: 'Mar', earnings: 219800, orders: 57 },
  { month: 'Apr', earnings: 243600, orders: 63 },
  { month: 'May', earnings: 198200, orders: 51 },
  { month: 'Jun', earnings: 226900, orders: 59 },
  { month: 'Jul', earnings: 251700, orders: 67 },
  { month: 'Aug', earnings: 238400, orders: 61 },
  { month: 'Sep', earnings: 212300, orders: 55 },
  { month: 'Oct', earnings: 286500, orders: 74 },
  { month: 'Nov', earnings: 305800, orders: 79 },
  { month: 'Dec', earnings: 334200, orders: 88 }
];

const payoutHistory = [
  { orderId: 'SKBS-2401', customer: 'Aparna Reddy', product: 'Banarasi Heritage Zari', orderDate: '12 Jan 2026', earnings: 14999, status: 'Pending' },
  { orderId: 'SKBS-2402', customer: 'Meghana Rao', product: 'Kanchipuram Regal Bloom', orderDate: '15 Jan 2026', earnings: 18499, status: 'Pending' },
  { orderId: 'SKBS-2391', customer: 'Sneha Varma', product: 'Soft Pattu Bridal Grace', orderDate: '08 Jan 2026', earnings: 11899, status: 'Paid' },
  { orderId: 'SKBS-2387', customer: 'Pooja Nair', product: 'Organza Pearl Garden', orderDate: '03 Jan 2026', earnings: 9599, status: 'Paid' },
  { orderId: 'SKBS-2381', customer: 'Ananya S', product: 'Temple Border Silk', orderDate: '29 Dec 2025', earnings: 14499, status: 'Pending Approval' }
];

const emptySummary: AdminDashboardSummary = {
  total_products: 0,
  active_products: 0,
  inactive_products: 0,
  new_arrival_products: 0,
  category_count: 0,
  active_discounts: 0,
  low_stock_count: 0
};

type AdminRole = 'admin' | 'superadmin';
type UserRole = 'user' | 'admin' | 'superadmin' | 'customer';
type AnalyticsCardKey = 'products' | 'active-products' | 'inactive-products' | 'new-arrivals' | 'categories' | 'discounts' | 'low-stock';

const emptyAdminForm = { name: '', email: '', phone: '', password: '', role: 'admin' as AdminRole };
const selectClassName =
  'mt-2 w-full appearance-none rounded-[1rem] border border-[#e2c8bc] bg-white/75 bg-[url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' fill=\'none\'%3E%3Cpath d=\'M5 7.5L10 12.5L15 7.5\' stroke=\'%237f3150\' stroke-width=\'1.8\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")] bg-[right_1rem_center] bg-no-repeat px-4 py-3 pr-10 text-sm text-[#2c2f3d] outline-none';

function resolveAdminToken() {
  try {
    const sessionRaw = window.localStorage.getItem('saree-aura-session');

    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as { token?: string } | null;
      const sessionToken = session?.token?.trim();

      if (sessionToken && sessionToken !== 'undefined' && sessionToken !== 'null') {
        return sessionToken;
      }
    }
  } catch {
  }

  const token =
    window.localStorage.getItem('token')?.trim() || window.localStorage.getItem('auth_token')?.trim() || '';

  if (!token || token === 'undefined' || token === 'null') {
    return null;
  }

  return token;
}

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
        <path d="M3 3l18 18" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 9.3 4.4 10 7-.3 1.1-1.2 2.8-2.7 4.2M6.1 6.1C3.9 7.5 2.5 9.7 2 12c.7 2.6 4.8 7 10 7 1.7 0 3.2-.4 4.5-1"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" aria-hidden="true">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
    </svg>
  );
}

function AdminHostDashboardPage() {
  const { products } = useCatalog();
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [roleForm, setRoleForm] = useState({ userId: '', role: 'admin' as UserRole });
  const [accessMessage, setAccessMessage] = useState('Manage admin access here.');
  const [accessLoading, setAccessLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [summary, setSummary] = useState<AdminDashboardSummary>(emptySummary);
  const [topProducts, setTopProducts] = useState<AdminDashboardTopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<AdminDashboardLowStockProduct[]>([]);
  const [categorySummary, setCategorySummary] = useState<AdminDashboardCategorySummary[]>([]);
  const [activeAnalyticsCard, setActiveAnalyticsCard] = useState<AnalyticsCardKey | null>(null);
  const [, setMessage] = useState('Dashboard details will appear here.');
  const [, setIsLoading] = useState(true);

  const dashboardCards = useMemo(() => [
    { key: 'products' as const, label: 'Total Products', value: summary.total_products, helper: 'All products in catalog' },
    { key: 'active-products' as const, label: 'Active Products', value: summary.active_products, helper: 'Currently visible products' },
    { key: 'inactive-products' as const, label: 'Inactive Products', value: summary.inactive_products, helper: 'Need activation or review' },
    { key: 'new-arrivals' as const, label: 'New Arrivals', value: summary.new_arrival_products, helper: 'Flagged as new arrival' },
    { key: 'categories' as const, label: 'Categories', value: summary.category_count, helper: 'Categories with products' },
    { key: 'discounts' as const, label: 'Active Discounts', value: summary.active_discounts, helper: 'Running offers right now' },
    { key: 'low-stock' as const, label: 'Low Stock Items', value: summary.low_stock_count, helper: 'Needs stock attention' }
  ], [summary]);

  const totalStockAcrossCategories = useMemo(
    () => categorySummary.reduce((sum, category) => sum + Number(category.total_stock || 0), 0),
    [categorySummary]
  );
  const totalTopProductStock = useMemo(
    () => topProducts.reduce((sum, product) => sum + Number(product.stock || 0), 0),
    [topProducts]
  );

  const loadDashboard = async () => {
    const token = resolveAdminToken();

    if (!token) {
      setIsLoading(false);
      setMessage('Login first to access dashboard details.');
      return;
    }
    setIsLoading(true);
    setMessage('Loading dashboard details...');
    try {
      const [summaryResponse, topProductsResponse, lowStockResponse, categorySummaryResponse] = await Promise.all([
        commonApi.adminDashboard.getSummary(token),
        commonApi.adminDashboard.getTopProducts(token, { limit: 6 }),
        commonApi.adminDashboard.getLowStock(token, { limit: 6 }),
        commonApi.adminDashboard.getCategorySummary(token, { limit: 8 })
      ]);
      setSummary(summaryResponse);
      setTopProducts(topProductsResponse);
      setLowStockProducts(lowStockResponse);
      setCategorySummary(categorySummaryResponse);
      setMessage('Dashboard details loaded successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load dashboard details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const totalEarnings = useMemo(() => monthlyEarnings.reduce((sum, item) => sum + item.earnings, 0), []);
  const totalOrders = useMemo(() => monthlyEarnings.reduce((sum, item) => sum + item.orders, 0), []);
  const pendingPayout = useMemo(() => payoutHistory.filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + item.earnings, 0), []);
  const paidAmount = useMemo(() => payoutHistory.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + item.earnings, 0), []);
  const pendingOrders = payoutHistory.filter((item) => item.status !== 'Paid').length;
  const topMonth = monthlyEarnings.reduce((best, current) => (current.earnings > best.earnings ? current : best), monthlyEarnings[0]);
  const averageOrderValue = Math.round(totalEarnings / totalOrders);
  const highestMonthlyValue = Math.max(...monthlyEarnings.map((item) => item.earnings));
  void products;
  void pendingPayout;
  void paidAmount;
  void pendingOrders;
  void topMonth;
  void averageOrderValue;

  const analyticsProducts = useMemo(() => {
    if (activeAnalyticsCard === 'active-products') {
      return topProducts.filter((product) => product.status !== 'inactive' && product.status !== 'archived');
    }

    if (activeAnalyticsCard === 'inactive-products') {
      return topProducts.filter((product) => product.status === 'inactive' || product.status === 'archived');
    }

    if (activeAnalyticsCard === 'new-arrivals') {
      return topProducts.filter((product) => product.is_new_arrival);
    }

    return topProducts;
  }, [activeAnalyticsCard, topProducts]);

  const renderAnalyticsDetails = () => {
    if (!activeAnalyticsCard) {
      return null;
    }

    const tableWrapClassName = 'mt-6 overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70 shadow-[0_18px_40px_rgba(111,72,61,0.08)]';
    const tableClassName = 'min-w-full divide-y divide-[#ead7ce] text-left text-sm';
    const tableHeadClassName = 'bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54';
    const tableHeadCellClassName = 'px-4 py-3';
    const tableCellClassName = 'px-4 py-3 align-middle text-ink/68';
    const emptyCellClassName = 'px-4 py-5 text-sm text-ink/60';

    if (activeAnalyticsCard === 'categories') {
      return (
        <section className="page-card p-6">
          <p className="page-eyebrow">Categories</p>
          <h2 className="mt-2 font-display text-3xl text-wine">Category details</h2>
          <div className={tableWrapClassName}>
            <div className="overflow-x-auto">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeadCellClassName}>Category</th>
                    <th className={tableHeadCellClassName}>Total</th>
                    <th className={tableHeadCellClassName}>Active</th>
                    <th className={tableHeadCellClassName}>Inactive</th>
                    <th className={tableHeadCellClassName}>New Arrivals</th>
                    <th className={tableHeadCellClassName}>Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                  {categorySummary.length ? categorySummary.map((category) => (
                    <tr key={`${category.category_id ?? 'analytics'}-${category.category_name}`}>
                      <td className={`${tableCellClassName} font-semibold text-wine`}>{category.category_name}</td>
                      <td className={tableCellClassName}>{category.total_products}</td>
                      <td className={tableCellClassName}>{category.active_products}</td>
                      <td className={tableCellClassName}>{category.inactive_products}</td>
                      <td className={tableCellClassName}>{category.new_arrival_products}</td>
                      <td className={`${tableCellClassName} font-semibold text-[#4a2a2c]`}>{category.total_stock}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className={emptyCellClassName}>No category details returned from the API.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    if (activeAnalyticsCard === 'low-stock') {
      return (
        <section className="page-card p-6">
          <p className="page-eyebrow">Low Stock</p>
          <h2 className="mt-2 font-display text-3xl text-wine">Low stock inventory details</h2>
          <div className={tableWrapClassName}>
            <div className="overflow-x-auto">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeadCellClassName}>Product</th>
                    <th className={tableHeadCellClassName}>SKU</th>
                    <th className={tableHeadCellClassName}>Available</th>
                    <th className={tableHeadCellClassName}>Reserved</th>
                    <th className={tableHeadCellClassName}>Threshold</th>
                    <th className={tableHeadCellClassName}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                  {lowStockProducts.length ? lowStockProducts.map((item) => (
                    <tr key={`analytics-${item.product_id}`}>
                      <td className={`${tableCellClassName} font-semibold text-wine`}>{item.name ?? `Product ${item.product_id}`}</td>
                      <td className={tableCellClassName}>{item.sku || 'SKU not available'}</td>
                      <td className={tableCellClassName}>{item.available_stock}</td>
                      <td className={tableCellClassName}>{item.reserved_stock}</td>
                      <td className={tableCellClassName}>{item.low_stock_threshold}</td>
                      <td className={tableCellClassName}>
                        <span className="rounded-full bg-[#fff1d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9c6722]">
                          {item.stock_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={6} className={emptyCellClassName}>No low-stock products returned.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    if (activeAnalyticsCard === 'discounts') {
      return (
        <section className="page-card p-6">
          <p className="page-eyebrow">Discounts</p>
          <h2 className="mt-2 font-display text-3xl text-wine">Active discount summary</h2>
          <div className={tableWrapClassName}>
            <div className="overflow-x-auto">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeadCellClassName}>Metric</th>
                    <th className={tableHeadCellClassName}>Count</th>
                    <th className={tableHeadCellClassName}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                  <tr>
                    <td className={`${tableCellClassName} font-semibold text-wine`}>Active Discounts</td>
                    <td className={`${tableCellClassName} font-semibold text-[#4a2a2c]`}>{summary.active_discounts}</td>
                    <td className={tableCellClassName}>Running offers currently reported by the admin dashboard</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    const heading =
      activeAnalyticsCard === 'active-products'
        ? 'Active product details'
        : activeAnalyticsCard === 'inactive-products'
          ? 'Inactive product details'
          : activeAnalyticsCard === 'new-arrivals'
            ? 'New arrival product details'
            : 'Product details';

    return (
      <section className="page-card p-6">
        <p className="page-eyebrow">Products</p>
        <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
        <div className={tableWrapClassName}>
          <div className="overflow-x-auto">
            <table className={tableClassName}>
              <thead className={tableHeadClassName}>
                <tr>
                  <th className={tableHeadCellClassName}>Product</th>
                  <th className={tableHeadCellClassName}>SKU</th>
                  <th className={tableHeadCellClassName}>Price</th>
                  <th className={tableHeadCellClassName}>Stock</th>
                  <th className={tableHeadCellClassName}>Image</th>
                  <th className={tableHeadCellClassName}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                {analyticsProducts.length ? analyticsProducts.map((product) => (
                  <tr key={`analytics-${product.id}`}>
                    <td className={`${tableCellClassName} font-semibold text-wine`}>{product.name}</td>
                    <td className={tableCellClassName}>{product.sku}</td>
                    <td className={`${tableCellClassName} font-semibold text-[#4a2a2c]`}>{formatCurrency(Number(product.selling_price || 0))}</td>
                    <td className={tableCellClassName}>{product.stock}</td>
                    <td className={tableCellClassName}>
                      {product.primary_image ? (
                        <img src={product.primary_image} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f8efe7] text-[10px] font-semibold text-ink/42">
                          No image
                        </span>
                      )}
                    </td>
                    <td className={tableCellClassName}>
                      <span className="rounded-full bg-[#f8efe7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-wine">
                        {product.is_new_arrival ? 'new' : product.status ?? 'active'}
                      </span>
                    </td>
                  </tr>
                )) : <tr><td colSpan={6} className={emptyCellClassName}>No products returned for this analytics card.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  };

  const handleRegisterAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = resolveAdminToken();
    if (!token) return setAccessMessage('Please login as superadmin before creating an admin.');
    setAccessLoading(true);
    setAccessMessage('Creating admin account...');
    try {
      const createdUser = await (commonApi.auth as typeof commonApi.auth & {
        registerAdmin: (payload: {
          name: string;
          email: string;
          phone: string | null;
          password: string;
          role: AdminRole;
        }, token: string) => Promise<{ id: string | number; name: string; role: string }>;
      }).registerAdmin({
        name: adminForm.name.trim(),
        email: adminForm.email.trim().toLowerCase(),
        phone: adminForm.phone.trim() || null,
        password: adminForm.password,
        role: adminForm.role
      }, token);
      setAccessMessage(`${createdUser.name} created as ${createdUser.role}. User ID: ${createdUser.id}`);
      setAdminForm(emptyAdminForm);
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Unable to create admin account.');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleUpdateUserRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = resolveAdminToken();
    if (!token) return setAccessMessage('Please login as superadmin before changing user roles.');
    if (!roleForm.userId.trim()) return setAccessMessage('Please enter the user ID before changing role.');
    setAccessLoading(true);
    setAccessMessage('Updating user role...');
    try {
      const updatedUser = await (commonApi.auth as typeof commonApi.auth & {
        updateUserRole: (userId: string, payload: { role: UserRole }, token: string) => Promise<{ name: string; role: string }>;
      }).updateUserRole(roleForm.userId.trim(), { role: roleForm.role }, token);
      setAccessMessage(`${updatedUser.name} is now ${updatedUser.role}.`);
      setRoleForm((current) => ({ ...current, userId: '' }));
    } catch (error) {
      setAccessMessage(error instanceof Error ? error.message : 'Unable to update user role.');
    } finally {
      setAccessLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-silk-radial px-3 pb-10 pt-2 text-ink sm:px-5 sm:pb-12 sm:pt-3 lg:px-8 lg:pb-14 lg:pt-4">
      <div className="app-width space-y-8">
        <section className="page-shell p-6 sm:p-8 lg:p-10">
          <div>
            <div>
              <p className="page-eyebrow">Admin / Host Dashboard</p>
              <h1 className="mt-3 font-display text-4xl text-wine sm:text-5xl">Analytics powered by admin dashboard </h1>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardCards.map((stat) => (
              <button
                key={stat.label}
                type="button"
                onClick={() => setActiveAnalyticsCard(stat.key)}
                className={`page-card p-5 text-left transition hover:-translate-y-0.5 ${
                  activeAnalyticsCard === stat.key ? 'ring-2 ring-[#7f3150]/25' : ''
                }`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-ink/42">{stat.label}</p>
                <p className="mt-3 text-3xl font-semibold text-wine">{stat.value}</p>
                <p className="mt-2 text-sm text-ink/58">{stat.helper}</p>
              </button>
            ))}
          </div>
        </section>
        {renderAnalyticsDetails()}
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="page-card overflow-hidden p-6">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.8rem] bg-[linear-gradient(135deg,#7f3150_0%,#c96c5f_50%,#ebb06b_100%)] p-6 text-white shadow-[0_24px_38px_rgba(106,45,59,0.22)]">
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">Inventory Focus</p>
                <p className="mt-4 text-3xl font-semibold">{summary.low_stock_count}</p>
                <p className="mt-3 text-sm text-white/80">Products currently in low stock state</p>
                <p className="mt-8 text-sm text-white/75">Active products: {summary.active_products} / Total products: {summary.total_products}</p>
              </div>
              <div className="overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70">
                <table className="min-w-full divide-y divide-[#ead7ce] text-left text-sm">
                  <thead className="bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54">
                    <tr>
                      <th className="px-4 py-3">Metric</th>
                      <th className="px-4 py-3">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    <tr>
                      <td className="px-4 py-3 align-middle font-semibold text-wine">Top Products Loaded</td>
                      <td className="px-4 py-3 align-middle font-semibold text-[#4a2a2c]">{topProducts.length}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 align-middle font-semibold text-wine">Category Stock</td>
                      <td className="px-4 py-3 align-middle font-semibold text-[#4a2a2c]">{totalStockAcrossCategories}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="page-card p-6">
            <p className="page-eyebrow">Insights</p>
            <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70">
              <table className="min-w-full divide-y divide-[#ead7ce] text-left text-sm">
                <thead className="bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54">
                  <tr>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                  {[
                    { label: 'Top Product Stock', value: totalTopProductStock.toString() },
                    { label: 'Low Stock Records', value: lowStockProducts.length.toString() },
                    { label: 'Categories Loaded', value: categorySummary.length.toString() },
                    { label: 'Active Discount Count', value: summary.active_discounts.toString() }
                  ].map((insight) => (
                    <tr key={insight.label}>
                      <td className="px-4 py-3 align-middle font-semibold text-wine">{insight.label}</td>
                      <td className="px-4 py-3 align-middle font-semibold text-[#4a2a2c]">{insight.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="page-card p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="page-eyebrow">Access Control</p>
              <h2 className="mt-2 font-display text-3xl text-wine">Admin registration and role management</h2>
              <p className="mt-2 text-sm leading-6 text-ink/58">{accessMessage}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <form className="rounded-[1.6rem] border border-[#ead8cf] bg-white/55 p-5 xl:max-w-[34rem]" onSubmit={handleRegisterAdmin}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/44">Register Admin</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink/70">Name<input type="text" value={adminForm.name} onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))} className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none" required /></label>
                <label className="text-sm font-semibold text-ink/70">Email<input type="email" value={adminForm.email} onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))} className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none" required /></label>
                <label className="text-sm font-semibold text-ink/70">Phone<input type="tel" value={adminForm.phone} onChange={(event) => setAdminForm((current) => ({ ...current, phone: event.target.value }))} className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none" /></label>
                <label className="text-sm font-semibold text-ink/70 sm:col-span-2 xl:max-w-[16rem]">Role<select value={adminForm.role} onChange={(event) => setAdminForm((current) => ({ ...current, role: event.target.value as AdminRole }))} className={selectClassName}><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select></label>
                <label className="text-sm font-semibold text-ink/70 sm:col-span-2">Password
                  <div className="relative mt-2">
                    <input type={showAdminPassword ? 'text' : 'password'} value={adminForm.password} onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))} className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 pr-14 text-sm text-[#2c2f3d] outline-none" required />
                    <button type="button" onClick={() => setShowAdminPassword((current) => !current)} className="absolute inset-y-0 right-4 flex items-center text-[#7a4d4f]" aria-label={showAdminPassword ? 'Hide password' : 'Show password'}>
                      <PasswordEyeIcon visible={showAdminPassword} />
                    </button>
                  </div>
                </label>
              </div>
              <button type="submit" disabled={accessLoading} className="liquid-btn mt-5 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{accessLoading ? 'Please wait...' : 'Create Admin'}</button>
            </form>
            <form className="rounded-[1.6rem] border border-[#ead8cf] bg-white/55 p-5 xl:max-w-[34rem]" onSubmit={handleUpdateUserRole}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/44">Change User Role</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-ink/70">User ID<input type="number" min="1" value={roleForm.userId} onChange={(event) => setRoleForm((current) => ({ ...current, userId: event.target.value }))} className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none" placeholder="Existing user id" required /></label>
                <label className="text-sm font-semibold text-ink/70 sm:col-span-2 xl:max-w-[16rem]">New Role<select value={roleForm.role} onChange={(event) => setRoleForm((current) => ({ ...current, role: event.target.value as UserRole }))} className={selectClassName}><option value="user">User</option><option value="customer">Customer</option><option value="admin">Admin</option><option value="superadmin">Super Admin</option></select></label>
              </div>
              <button type="submit" disabled={accessLoading} className="liquid-btn mt-5 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{accessLoading ? 'Please wait...' : 'Update Role'}</button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="page-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="page-eyebrow">Top Products</p><h2 className="mt-2 font-display text-3xl text-wine">Live top products</h2></div>
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70 shadow-[0_18px_40px_rgba(111,72,61,0.08)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ead7ce] text-left text-sm">
                  <thead className="bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Image</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {topProducts.length ? topProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-4 py-3 align-middle font-semibold text-wine">{product.name}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{product.sku}</td>
                        <td className="px-4 py-3 align-middle font-semibold text-[#4a2a2c]">{formatCurrency(Number(product.selling_price || 0))}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{product.stock}</td>
                        <td className="px-4 py-3 align-middle">
                          {product.primary_image ? (
                            <img src={product.primary_image} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f8efe7] text-[10px] font-semibold text-ink/42">No image</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="rounded-full bg-[#f8efe7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-wine">
                            {product.is_new_arrival ? 'new' : product.status ?? 'active'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-ink/68">{formatDateTime(product.updated_at)}</td>
                      </tr>
                    )) : <tr><td colSpan={7} className="px-4 py-5 text-sm text-ink/60">No top products returned.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="page-card p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="page-eyebrow">Low Stock</p><h2 className="mt-2 font-display text-3xl text-wine">Low stock products </h2></div>
            </div>
            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70 shadow-[0_18px_40px_rgba(111,72,61,0.08)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ead7ce] text-left text-sm">
                  <thead className="bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Available</th>
                      <th className="px-4 py-3">Reserved</th>
                      <th className="px-4 py-3">Threshold</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {lowStockProducts.length ? lowStockProducts.map((item) => (
                      <tr key={item.product_id}>
                        <td className="px-4 py-3 align-middle font-semibold text-wine">{item.name ?? `Product ${item.product_id}`}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{item.sku || 'SKU not available'}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{item.available_stock}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{item.reserved_stock}</td>
                        <td className="px-4 py-3 align-middle text-ink/68">{item.low_stock_threshold}</td>
                        <td className="px-4 py-3 align-middle">
                          <span className="rounded-full bg-[#fff1d8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#9c6722]">
                            {item.stock_status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={6} className="px-4 py-5 text-sm text-ink/60">No low-stock products returned.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="page-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="page-eyebrow">Category Summary</p><h2 className="mt-2 font-display text-3xl text-wine">Category-wise catalog analytics</h2></div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead><tr className="text-left text-xs uppercase tracking-[0.18em] text-ink/44"><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-center">Total</th><th className="px-4 py-2 text-center">Active</th><th className="px-4 py-2 text-center">Inactive</th><th className="px-4 py-2 text-center">New Arrivals</th><th className="px-4 py-2 text-center">Stock</th></tr></thead>
              <tbody>
                {categorySummary.length ? categorySummary.map((category) => (
                  <tr key={`${category.category_id ?? 'uncategorized'}-${category.category_name}`} className="rounded-[1.4rem] bg-white/60 text-sm text-[#4a2a2c] shadow-[0_12px_24px_rgba(111,72,61,0.06)]">
                    <td className="rounded-l-[1.2rem] px-4 py-4 font-semibold">{category.category_name}</td><td className="px-4 py-4 text-center">{category.total_products}</td><td className="px-4 py-4 text-center">{category.active_products}</td><td className="px-4 py-4 text-center">{category.inactive_products}</td><td className="px-4 py-4 text-center">{category.new_arrival_products}</td><td className="rounded-r-[1.2rem] px-4 py-4 text-center font-semibold">{category.total_stock}</td>
                  </tr>
                )) : <tr><td colSpan={6} className="rounded-[1.2rem] bg-white/60 px-4 py-5 text-sm text-ink/60">No category summary rows returned</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="page-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="page-eyebrow">Monthly Earnings</p>
                <h2 className="mt-2 text-3xl font-medium text-wine">2026 revenue graph</h2>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.16em] text-ink/42">Total</p>
                <p className="mt-2 text-2xl font-semibold text-[#4a2a2c]">{formatCurrency(totalEarnings)}</p>
              </div>
            </div>

            <div className="mt-8 flex h-[20rem] items-end gap-3 overflow-x-auto pb-2">
              {monthlyEarnings.map((item) => {
                const barHeight = Math.max(14, (item.earnings / highestMonthlyValue) * 260);

                return (
                  <div key={item.month} className="flex min-w-[3.5rem] flex-1 flex-col items-center gap-3">
                    <p className="text-[11px] font-semibold text-ink/48">{Math.round(item.earnings / 1000)}k</p>
                    <div className="flex h-[16rem] items-end">
                      <div
                        className="w-10 rounded-t-[1rem] shadow-[0_18px_24px_rgba(140,63,86,0.18)]"
                        style={{
                          height: `${barHeight}px`,
                          background: 'linear-gradient(180deg, #8c3f56 0%, #c86d60 48%, #ebb06b 100%)'
                        }}
                        title={`${item.month}: ${formatCurrency(item.earnings)}`}
                      />
                    </div>
                    <p className="text-sm font-semibold text-[#4a2a2c]">{item.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="page-card p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="page-eyebrow">Sales Snapshot</p><h2 className="mt-2 text-3xl font-medium text-wine">Catalog and payout status</h2></div></div>
            <div className="mt-6 space-y-4">
              {[{ label: 'Bridal & Premium Share', value: '62%', width: '62%', tone: 'from-[#8c3f56] to-[#c86d60]' }, { label: 'Collection Sales Share', value: '74%', width: '74%', tone: 'from-[#bf664b] to-[#ebb06b]' }, { label: 'Payouts Cleared', value: '40%', width: '40%', tone: 'from-[#a5495f] to-[#cf8d63]' }].map((item) => (
                <div key={item.label}><div className="mb-2 flex items-center justify-between text-sm font-semibold text-[#4a2a2c]"><span>{item.label}</span><span>{item.value}</span></div><div className="h-3 rounded-full bg-[#f0dfd5]"><div className={`h-3 rounded-full bg-gradient-to-r ${item.tone}`} style={{ width: item.width }} /></div></div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[#ead8cf] bg-white/60 p-5"><p className="text-xs uppercase tracking-[0.18em] text-ink/42">Upcoming Transfer</p><p className="mt-3 text-3xl font-medium text-[#4a2a2c]">18 Apr 2026</p></div>
              <div className="rounded-[1.5rem] border border-[#ead8cf] bg-white/60 p-5"><p className="text-xs uppercase tracking-[0.18em] text-ink/42">Settlement Mode</p><p className="mt-3 text-3xl font-medium text-[#4a2a2c]">Bank Transfer</p></div>
            </div>
          </div>
        </section>

        <section className="page-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="page-eyebrow">History</p><h2 className="mt-2 font-display text-3xl text-wine">Order and payout history</h2></div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead><tr className="text-left text-xs uppercase tracking-[0.18em] text-ink/44"><th className="px-4 py-2">Order</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Product</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Earning</th><th className="px-4 py-2">Status</th></tr></thead>
              <tbody>
                {payoutHistory.map((item) => (
                  <tr key={item.orderId} className="rounded-[1.4rem] bg-white/60 text-sm text-[#4a2a2c] shadow-[0_12px_24px_rgba(111,72,61,0.06)]">
                    <td className="rounded-l-[1.2rem] px-4 py-4 font-semibold">{item.orderId}</td><td className="px-4 py-4">{item.customer}</td><td className="px-4 py-4">{item.product}</td><td className="px-4 py-4">{item.orderDate}</td><td className="px-4 py-4 font-semibold">{formatCurrency(item.earnings)}</td>
                    <td className="rounded-r-[1.2rem] px-4 py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${item.status === 'Paid' ? 'bg-[#e4f4e6] text-[#2f7a45]' : item.status === 'Pending Approval' ? 'bg-[#fff1d8] text-[#9c6722]' : 'bg-[#f7e5d7] text-[#a05a3d]'}`}>{item.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminHostDashboardPage;
