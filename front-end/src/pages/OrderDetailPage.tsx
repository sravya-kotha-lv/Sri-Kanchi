import { useEffect, useState } from 'react';
import commonApi, { type Order } from '../api/commonapi';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import FooterPage from './FooterPage';
import { navigateTo } from '../utils/navigation';

// Validation utilities
const validateName = (value: string): boolean => /^[a-zA-Z\s]*$/.test(value);
const validateEmail = (value: string): boolean => /^[^\s@]*@?[^\s@]*\.?[^\s@]*$/.test(value);

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

function OrderDetailPage() {
  const { products } = useCatalog();
  const { currentUser } = useShop();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewData, setReviewData] = useState({
    name: '',
    email: '',
    rating: '5',
    review: ''
  });
  const [reviewMessage, setReviewMessage] = useState('');
  const [activeReviewProductId, setActiveReviewProductId] = useState<number | null>(null);
  const [reviewPhotos, setReviewPhotos] = useState<File[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  const orderId = window.location.pathname.replace(/^\/orders\//, '').trim();
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing.');
      setLoading(false);
      return;
    }

    let isMounted = true;

    const orderRequest = isAdminUser
      ? commonApi.adminOrders.getById(orderId, currentUser?.token)
      : commonApi.order.getById(orderId);

    orderRequest
      .then((data) => {
        if (isMounted) {
          setOrder(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unable to fetch order details.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.token, isAdminUser, orderId]);

  const getStatusBadge = (status?: string) => {
    const s = status?.toLowerCase() ?? 'pending';
    if (s === 'delivered') return 'bg-[#e8f6ea] text-[#2b8a4b]';
    if (s === 'cancelled') return 'bg-[#fff0f0] text-[#d44b4b]';
    if (s === 'placed') return 'bg-[#fff8e1] text-[#f9a825]';
    return 'bg-[#e3f2fd] text-[#1976d2]';
  };

  const handleReviewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Validation based on field type
    if (name === 'name' && value && !validateName(value)) {
      return; // Reject non-letter characters
    }
    if (name === 'email' && value && !validateEmail(value)) {
      return; // Reject invalid email format
    }
    
    setReviewData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { name, email, rating, review } = reviewData;
    
    // Validation checks
    if (!name.trim()) {
      setReviewMessage('Please enter your name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setReviewMessage('Please enter a valid email address.');
      return;
    }
    if (!rating) {
      setReviewMessage('Please select a rating.');
      return;
    }
    if (!review.trim()) {
      setReviewMessage('Please write your review.');
      return;
    }
    
    setReviewMessage('✓ Thank you for your review! We appreciate your feedback.');
    // Optionally clear the form after 3 seconds
    setTimeout(() => {
      setReviewData({ name: '', email: '', rating: '5', review: '' });
      setReviewMessage('');
    }, 3000);
  };

  const canCancelOrder = !isAdminUser && ['placed', 'pending', 'processing'].includes(
    (order?.order_status ?? '').toLowerCase()
  );
  const isDeliveredOrder = (order?.order_status ?? '').toLowerCase() === 'delivered';
  const getProductReviewPath = (productId?: number) => {
    const product = products.find((item) => typeof item.id === 'number' && item.id === productId);

    return product?.slug ? `/products/${product.slug}?reviews=1` : '';
  };

  const handleReviewPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = files.filter((file) => allowedTypes.includes(file.type) && file.size <= 3 * 1024 * 1024).slice(0, 5);

    if (files.length !== validFiles.length) {
      setReviewMessage('Upload JPG, PNG, or WEBP images up to 3MB each.');
    } else {
      setReviewMessage('');
    }

    setReviewPhotos(validFiles);
  };

  const handleSubmitProductReview = async (productId: number) => {
    const rating = Number(reviewData.rating);

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setReviewMessage('Please select a rating.');
      return;
    }

    if (!reviewData.review.trim()) {
      setReviewMessage('Please write your review.');
      return;
    }

    const formData = new FormData();
    formData.append('rating', String(rating));
    formData.append('comment', reviewData.review.trim());

    reviewPhotos.forEach((file) => {
      formData.append('photos', file);
    });

    setReviewSubmitting(true);
    setReviewMessage('');

    try {
      await commonApi.rating.createReview(productId, formData);
      setReviewMessage('Review submitted successfully.');
      setReviewData({ name: '', email: '', rating: '5', review: '' });
      setReviewPhotos([]);
      setActiveReviewProductId(null);
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : 'Unable to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || cancelLoading) return;

    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    setCancelLoading(true);
    setCancelMessage('');

    try {
      const updatedOrder = await commonApi.order.cancel(order.id);
      setOrder(updatedOrder);
      setCancelMessage('Order cancelled successfully.');
    } catch (err) {
      setCancelMessage(err instanceof Error ? err.message : 'Unable to cancel order.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width flex flex-col gap-8">
        <section className="page-card p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 border-b border-[#eadfd8] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigateTo('/orders')}
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f3150] transition hover:text-wine"
              >
                ← Back to Orders
              </button>
              <h1 className="mt-3 text-3xl font-semibold text-wine sm:text-4xl">
                {order?.order_number ?? `Order #${orderId}`}
              </h1>
            </div>
            {order ? (
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusBadge(order.order_status)}`}>
                  {order.order_status ?? 'placed'}
                </span>

                {canCancelOrder ? (
                  <button
                    type="button"
                    onClick={handleCancelOrder}
                    disabled={cancelLoading}
                    className="rounded-full border border-[#d44b4b] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d44b4b] transition hover:bg-[#fff0f0] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cancelLoading ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {cancelMessage ? (
            <p className="mt-4 rounded-[1rem] bg-white/70 px-4 py-3 text-sm font-semibold text-[#7f3150]">
              {cancelMessage}
            </p>
          ) : null}

          {loading ? (
            <div className="py-14 text-center">
              <p className="text-sm text-ink/62">Loading order details...</p>
            </div>
          ) : error ? (
            <div className="py-14 text-center">
              <h2 className="font-display text-2xl text-wine">Unable to load order</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink/62">{error}</p>
              <button
                type="button"
                onClick={() => navigateTo('/orders')}
                className="liquid-btn mx-auto mt-6 flex justify-center px-6 py-3 text-sm font-semibold text-white"
              >
                Back to Orders
              </button>
            </div>
          ) : order ? (
            <div className="mt-6 flex flex-col gap-6">
              <div className="rounded-[1.5rem] border border-[#eadfd8] bg-white/70 p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-[#2a2432]">Order Information</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Order Date</p>
                    <p className="mt-1 text-sm font-semibold text-[#2a2432]">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Last Updated</p>
                    <p className="mt-1 text-sm font-semibold text-[#2a2432]">{formatDate(order.updated_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Total Amount</p>
                    <p className="mt-1 text-sm font-semibold text-[#2a2432]">{formatPrice(order.total_amount ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Status</p>
                    <p className="mt-1 text-sm font-semibold text-[#2a2432]">{order.order_status ?? 'placed'}</p>
                  </div>
                  {order.customer_name ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Customer</p>
                      <p className="mt-1 text-sm font-semibold text-[#2a2432]">{order.customer_name}</p>
                    </div>
                  ) : null}
                  {order.customer_phone ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Phone</p>
                      <p className="mt-1 text-sm font-semibold text-[#2a2432]">{order.customer_phone}</p>
                    </div>
                  ) : null}
                  {order.shipping_address ? (
                    <div className="sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Shipping Address</p>
                      <p className="mt-1 text-sm font-semibold text-[#2a2432]">{order.shipping_address}</p>
                    </div>
                  ) : null}
                  {order.payment_method ? (
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-ink/42">Payment Method</p>
                      <p className="mt-1 text-sm font-semibold text-[#2a2432]">{order.payment_method}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {Array.isArray(order.items) && order.items.length > 0 ? (
                <div className="rounded-[1.5rem] border border-[#eadfd8] bg-white/70 p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-[#2a2432]">Items</h2>
                  <div className="mt-4 flex flex-col gap-4">
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col gap-3 rounded-[1.2rem] border border-[#eadfd8] bg-white/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#2a2432]">
                            {item.product_name ?? `Product #${item.product_id}`}
                          </p>
                          {item.product_sku ? (
                            <p className="mt-1 text-xs text-ink/56">SKU: {item.product_sku}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-ink/56">
                            Qty: {item.quantity} × {formatPrice(item.unit_price)}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <p className="text-sm font-semibold text-[#2a2432]">
                            {formatPrice(item.line_total)}
                          </p>
                          {isDeliveredOrder && !isAdminUser ? (
                            getProductReviewPath(item.product_id) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReviewProductId((current) => current === item.product_id ? null : item.product_id ?? null);
                                  setReviewMessage('');
                                }}
                                className="rounded-full border border-[#7f3150] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7f3150] transition hover:bg-[#7f3150] hover:text-white"
                              >
                                Write a Review
                              </button>
                            ) : (
                              <p className="text-[11px] font-semibold text-[#7f3150]">
                                Open product page to review
                              </p>
                            )
                          ) : null}
                        </div>
                        {isDeliveredOrder && activeReviewProductId === item.product_id ? (
                          <div className="sm:col-span-2 rounded-[1.2rem] border border-[#eadfd8] bg-white/80 p-4">
                            <p className="text-sm font-semibold text-[#2a2432]">Write a product review</p>
                            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
                              Rating
                              <select
                                name="rating"
                                value={reviewData.rating}
                                onChange={handleReviewChange}
                                className="mt-2 w-full rounded-[0.9rem] border border-[#eadfd8] bg-white px-3 py-2 text-sm text-[#2c2f3d] outline-none"
                              >
                                <option value="5">5 Stars - Excellent</option>
                                <option value="4">4 Stars - Very Good</option>
                                <option value="3">3 Stars - Good</option>
                                <option value="2">2 Stars - Fair</option>
                                <option value="1">1 Star - Poor</option>
                              </select>
                            </label>
                            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
                              Review
                              <textarea
                                name="review"
                                value={reviewData.review}
                                onChange={handleReviewChange}
                                rows={3}
                                placeholder="Share your experience with this product"
                                className="mt-2 w-full rounded-[0.9rem] border border-[#eadfd8] bg-white px-3 py-2 text-sm text-[#2c2f3d] outline-none"
                              />
                            </label>
                            <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.14em] text-ink/50">
                              Product Photos
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={handleReviewPhotoChange}
                                className="mt-2 block w-full rounded-[0.9rem] border border-[#eadfd8] bg-white px-3 py-2 text-sm text-[#2c2f3d]"
                              />
                            </label>
                            {reviewPhotos.length ? (
                              <p className="mt-2 text-xs text-ink/58">{reviewPhotos.length} photo{reviewPhotos.length === 1 ? '' : 's'} selected</p>
                            ) : null}
                            {reviewMessage ? (
                              <p className={`mt-3 text-sm font-semibold ${reviewMessage.includes('success') ? 'text-[#2b8a4b]' : 'text-[#d44b4b]'}`}>
                                {reviewMessage}
                              </p>
                            ) : null}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={reviewSubmitting}
                                onClick={() => item.product_id ? void handleSubmitProductReview(item.product_id) : undefined}
                                className="rounded-full bg-[#7f3150] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#682640] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveReviewProductId(null);
                                  setReviewPhotos([]);
                                  setReviewMessage('');
                                }}
                                className="rounded-full border border-[#eadfd8] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70 transition hover:bg-[#f8f1eb]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-[#eadfd8] pt-5">
                    <span className="text-sm font-semibold text-[#2a2432]">Total</span>
                    <span className="text-lg font-semibold text-[#2a2432]">
                      {formatPrice(order.total_amount ?? 0)}
                    </span>
                  </div>
                </div>
              ) : null}

              {false && (
                <div className="rounded-[1.5rem] border border-[#d7ead5] bg-[linear-gradient(135deg,#fffdfa_0%,#eef9ee_100%)] p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-[#2b8a4b]">How was your experience?</h2>
                  <p className="mt-2 text-sm leading-7 text-ink/66 mb-6">
                    We value your feedback. Please share your review below.
                  </p>
                  
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm text-ink/70">
                        Your Name
                        <input
                          type="text"
                          name="name"
                          value={reviewData.name}
                          onChange={handleReviewChange}
                          placeholder="Enter your name"
                          className="mt-2 w-full rounded-[1rem] border border-[#d7ead5] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none focus:border-[#2b8a4b]"
                        />
                      </label>
                      <label className="text-sm text-ink/70">
                        Email Address
                        <input
                          type="email"
                          name="email"
                          value={reviewData.email}
                          onChange={handleReviewChange}
                          placeholder="your.email@example.com"
                          className="mt-2 w-full rounded-[1rem] border border-[#d7ead5] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none focus:border-[#2b8a4b]"
                        />
                      </label>
                    </div>
                    
                    <label className="text-sm text-ink/70">
                      Rating
                      <select
                        name="rating"
                        value={reviewData.rating}
                        onChange={handleReviewChange}
                        className="mt-2 w-full rounded-[1rem] border border-[#d7ead5] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none focus:border-[#2b8a4b]"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="4">⭐⭐⭐⭐ Very Good</option>
                        <option value="3">⭐⭐⭐ Good</option>
                        <option value="2">⭐⭐ Fair</option>
                        <option value="1">⭐ Poor</option>
                      </select>
                    </label>
                    
                    <label className="text-sm text-ink/70">
                      Your Review
                      <textarea
                        name="review"
                        value={reviewData.review}
                        onChange={handleReviewChange}
                        rows={4}
                        placeholder="Share your thoughts about this order..."
                        className="mt-2 w-full rounded-[1rem] border border-[#d7ead5] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none focus:border-[#2b8a4b]"
                      />
                    </label>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="rounded-[1rem] bg-[#2b8a4b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#207038]"
                      >
                        Submit Review
                      </button>
                    </div>
                    
                    {reviewMessage && (
                      <div className={`rounded-[1rem] p-4 text-sm font-semibold ${reviewMessage.includes('✓') ? 'bg-[#e8f6ea] text-[#2b8a4b]' : 'bg-[#fff0f0] text-[#d44b4b]'}`}>
                        {reviewMessage}
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <FooterPage />
      </div>
    </div>
  );
}

export default OrderDetailPage;

