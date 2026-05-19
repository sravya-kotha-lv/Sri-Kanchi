import { useEffect, useState } from 'react';
import commonApi, { type Order } from '../api/commonapi';
import { useShop } from '../context/ShopContext';
import FooterPage from './FooterPage';
import { navigateTo } from '../utils/navigation';

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

function OrdersPage() {
  const { currentUser } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    let isMounted = true;
    const ordersRequest = isAdminUser
      ? commonApi.adminOrders.getAll(currentUser?.token, { limit: 100 }).then((response) => response.orders)
      : commonApi.order.getAll();

    ordersRequest
      .then((data) => {
        if (isMounted) {
          setOrders(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to fetch orders.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.token, isAdminUser]);

  const getStatusBadge = (status?: string) => {
    const s = status?.toLowerCase() ?? 'pending';
    if (s === 'delivered') return 'bg-[#e8f6ea] text-[#2b8a4b]';
    if (s === 'cancelled') return 'bg-[#fff0f0] text-[#d44b4b]';
    if (s === 'placed') return 'bg-[#fff8e1] text-[#f9a825]';
    return 'bg-[#e3f2fd] text-[#1976d2]';
  };

  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width flex flex-col gap-8">
        <section className="page-card p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-[#eadfd8] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-ink/42">
                {isAdminUser ? 'Customer Orders' : 'Your Purchases'}
              </p>
              <h1 className="mt-2 font-display text-4xl text-wine">My Orders</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/62">
                {isAdminUser
                  ? 'View and track all customer orders in one place. Tap an order to see full details.'
                  : 'View and track all your orders in one place. Tap an order to see full details.'}
              </p>
            </div>
            <div className="rounded-[1.3rem] border border-[#eadfd8] bg-white/70 px-4 py-3 text-sm font-semibold text-[#2a2432]">
              {orders.length} orders
            </div>
          </div>

          {loading ? (
            <div className="py-14 text-center">
              <p className="text-sm text-ink/62">
                {isAdminUser ? 'Loading customer orders...' : 'Loading your orders...'}
              </p>
            </div>
          ) : error ? (
            <div className="py-14 text-center">
              <h2 className="font-display text-2xl text-wine">Unable to load orders</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink/62">{error}</p>
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="liquid-btn mx-auto mt-6 flex justify-center px-6 py-3 text-sm font-semibold text-white"
              >
                Continue Shopping
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-14 text-center">
              <h2 className="font-display text-3xl text-wine">No orders yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/62">
                Your order history will appear here once you place your first order.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="liquid-btn mx-auto mt-6 flex justify-center px-6 py-3 text-sm font-semibold text-white"
              >
                Explore Sarees
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => navigateTo(`/orders/${order.id}`)}
                  className="flex w-full flex-col gap-3 rounded-[1.8rem] border border-[#eadfd8] bg-white/60 p-5 text-left transition hover:bg-white/90 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#f3e7df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#7f3150]">
                        {order.order_number ?? `Order #${String(order.id)}`}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusBadge(order.order_status)}`}>
                        {order.order_status ?? 'placed'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-ink/62">
                      Placed on {formatDate(order.created_at)}
                    </p>
                    {order.customer_name ? (
                      <p className="mt-1 text-sm text-ink/62">{order.customer_name}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-ink/62">
                      {Array.isArray(order.items) ? order.items.length : 0} item
                      {Array.isArray(order.items) && order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-semibold text-[#2a2432]">
                      {formatPrice(order.total_amount ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-ink/56">Tap to view details →</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <FooterPage />
      </div>
    </div>
  );
}

export default OrdersPage;

