// Order API types
export type OrderItem = {
  id?: number;
  order_id?: number;
  product_id?: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at?: string;
};

export type Order = {
  id: number | string;
  order_number?: string;
  user_id?: number | string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string | null;
  shipping_address?: string;
  subtotal?: number;
  delivery_charge?: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  order_status: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  [key: string]: any;
};
export type Review = {
  id: number;
  product_id: number;
  user_id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  photos?: Array<string | { image_url?: string; url?: string }>;
  images?: Array<string | { image_url?: string; url?: string }>;
  created_at: string;
  updated_at: string;
  user_name?: string;
};
 
export type RatingSummary = {
  total_reviews: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
};

export type ReviewListQuery = {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'rating';
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
};

export type ReviewPayload = {
  rating: number;
  title?: string | null;
  comment?: string | null;
};

export type ReviewListResponse = Review[];

export type MarketingEmailPayload = {
  email: string;
};

export type CreateOrderInput = {
  customer_name: string;
  customer_phone?: string;
  shipping_address: string;
  payment_method: 'cash_on_delivery';
};

export type AdminOrderListQuery = {
  page?: number;
  limit?: number;
  status?: string;
  payment_status?: string;
  search?: string;
};

export type AdminOrderListResponse = {
  orders: Order[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type AdminOrderSummary = {
  total_orders: number;
  placed_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
};

const rawApiBaseUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL as string | undefined) ??
  '/api/v1';

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = normalizedApiBaseUrl.endsWith('/api/v1')
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl}/api/v1`;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  token?: string;
  useStoredToken?: boolean;
  authRequired?: boolean;
  authErrorMessage?: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: unknown;
};

export type UserProfile = {
  id: string | number;
  name: string;
  email: string;
  phone?: string | null;
  role?: 'user' | 'admin' | 'superadmin' | 'customer';
  isActive?: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthPayload = {
  token: string;
  user: UserProfile;
};

export type ProductImage = {
  id?: number;
  product_id?: number;
  image_url?: string;
  upload_url?: string;
  url?: string;
  alt_text?: string | null;
  is_primary?: boolean;
  sort_order?: number;
  created_at?: string;
};

export type Product = {
  id: string | number;
  slug: string;
  name: string;
  category?: string;
  category_id?: number;
  occasion?: string | null;
  short_description?: string | null;
  shortDescription?: string | null;
  color?: string;
  price?: number;
  selling_price?: number | string;
  final_price?: number | string;
  discount_amount?: number | string;
  originalPrice?: number;
  mrp?: number | string;
  image?: string;
  images?: Array<ProductImage | string>;
  galleryImages?: string[];
  badge?: string;
  note?: string;
  offerTag?: string;
  source?: string;
  product_type?: string;
  productType?: string;
  description?: string;
  is_new_arrival?: boolean;
  rating?: number;
  reviewsCount?: number;
  average_rating?: number | string;
  total_reviews?: number | string;
  stock?: number;
};

export type AdminProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  description?: string | null;
  category_id: number;
  occasion?: string | null;
  fabric?: string | null;
  pattern?: string | null;
  color?: string | null;
  secondary_color?: string | null;
  size?: string | null;
  blouse_included?: boolean;
  blouse_type?: string | null;
  mrp: number;
  selling_price: number;
  stock: number;
  is_new_arrival?: boolean;
  source?: string;
  product_type?: string;
  productType?: string;
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  created_by?: number | null;
  updated_by?: number | null;
  created_at?: string;
  updated_at?: string;
  images?: ProductImage[];
};

export type ProductFilters = {
  category?: string;
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicProductListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  fabric?: string;
  occasion?: string;
  color?: string;
  newArrival?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
};

export type ProductFiltersQuery = {
  category_id?: number;
  occasion?: string;
  search?: string;
};

export type FiltersResponse = {
  categories: Array<string | number>;
  fabrics?: string[];
  occasions?: string[];
  colors: string[];
  min_price: string;
  max_price: string;
};

export type ProductFiltersResponse = {
  categories?: string[];
  colors?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
};

export type SearchSuggestion = {
  id: string | number;
  name: string;
  slug: string;
  sku?: string;
  selling_price?: number | string;
  mrp?: number | string;
  stock?: number;
  image_url?: string | null;
};

export type AdminProductListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  fabric?: string;
  color?: string;
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  is_new_arrival?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: 'id' | 'name' | 'slug' | 'sku' | 'mrp' | 'selling_price' | 'stock' | 'created_at' | 'updated_at';
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
};

export type CreateAdminProductInput = {
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  description?: string | null;
  category_id: number;
  occasion?: string | null;
  fabric?: string | null;
  pattern?: string | null;
  color?: string | null;
  secondary_color?: string | null;
  size?: string | null;
  blouse_included?: boolean;
  blouse_type?: string | null;
  mrp: number;
  selling_price: number;
  stock: number;
  is_new_arrival?: boolean;
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  created_by?: number | null;
  updated_by?: number | null;
  images?: ProductImage[];
};

export type UpdateAdminProductInput = Partial<CreateAdminProductInput>;

export type CartProduct = {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  stock?: number;
  status?: string;
  image_url?: string | null;
};

export type CartItem = {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  line_total: number;
  product: CartProduct;
};

export type AddCartItemInput = {
  product_id: number;
  quantity: number;
};

export type UpdateCartItemInput = {
  quantity: number;
};

export type WishlistItem = {
  id: number;
  product_id: number;
  created_at?: string;
  updated_at?: string;
  product: CartProduct & {
    mrp?: number;
    selling_price?: number;
  };
};

export type CartSummary = {
  id: number;
  user_id: number;
  items: CartItem[];
  summary: {
    item_count: number;
    total_quantity: number;
    subtotal: number;
  };
  created_at: string;
  updated_at: string;
};

export type WishlistSummary = {
  items: WishlistItem[];
  summary: {
    item_count: number;
  };
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
};

export type CategoryListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
};

export type CreateCategoryInput = {
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type DiscountType = 'percentage' | 'fixed';
export type DiscountAppliesTo = 'all' | 'product' | 'category';
export type DiscountStatus = 'active' | 'inactive';

export type AdminDiscount = {
  id: number;
  title: string;
  code: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  applies_to: DiscountAppliesTo;
  product_id?: number | null;
  category_id?: number | null;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  created_at?: string;
  updated_at?: string;
};

export type AdminDiscountListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  type?: DiscountType;
  applies_to?: DiscountAppliesTo;
  status?: DiscountStatus;
  sort_by?: 'id' | 'title' | 'code' | 'type' | 'value' | 'starts_at' | 'ends_at' | 'created_at';
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
};

export type CreateAdminDiscountInput = {
  title: string;
  code: string;
  description?: string | null;
  type: DiscountType;
  value: number;
  applies_to: DiscountAppliesTo;
  product_id?: number | null;
  category_id?: number | null;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  is_active?: boolean;
  starts_at: string;
  ends_at: string;
};

export type UpdateAdminDiscountInput = Partial<CreateAdminDiscountInput>;

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type InventoryAdjustmentType = 'increase' | 'decrease' | 'set' | 'reserve' | 'release';

export type AdminInventoryItem = {
  id?: number;
  product_id: number;
  product_name?: string;
  slug?: string;
  sku?: string;
  available_stock: number;
  reserved_stock: number;
  low_stock_threshold: number;
  stock_status: InventoryStatus;
  created_at?: string;
  updated_at?: string;
};

export type AdminInventoryListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  stock_status?: InventoryStatus;
  low_stock_only?: boolean;
  sort_by?: 'id' | 'product_id' | 'available_stock' | 'reserved_stock' | 'low_stock_threshold' | 'updated_at';
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
};

export type AdminLowStockListQuery = {
  page?: number;
  limit?: number;
  sort_by?: 'available_stock' | 'low_stock_threshold' | 'updated_at';
  sort_order?: 'ASC' | 'DESC' | 'asc' | 'desc';
};

export type UpdateAdminInventoryInput = {
  available_stock?: number;
  reserved_stock?: number;
  low_stock_threshold?: number;
};

export type AdjustAdminInventoryInput = {
  product_id: number;
  adjustment_type: InventoryAdjustmentType;
  quantity: number;
  low_stock_threshold?: number;
  note?: string | null;
};

export type AdminDashboardSummary = {
  total_products: number;
  active_products: number;
  inactive_products: number;
  new_arrival_products: number;
  category_count: number;
  active_discounts: number;
  low_stock_count: number;
};

export type AdminDashboardTopProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  selling_price: number;
  stock: number;
  is_new_arrival?: boolean;
  status?: 'draft' | 'active' | 'inactive' | 'archived';
  updated_at?: string;
  primary_image?: string | null;
};

export type AdminDashboardLowStockProduct = {
  product_id: number;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  available_stock: number;
  reserved_stock: number;
  low_stock_threshold: number;
  stock_status: InventoryStatus;
  updated_at?: string;
};

export type AdminDashboardCategorySummary = {
  category_id?: number | null;
  category_name: string;
  total_products: number;
  active_products: number;
  inactive_products: number;
  new_arrival_products: number;
  total_stock: number;
};

export type AdminDashboardListQuery = {
  limit?: number;
};

export type PublicDashboardSummary = {
  total_products: number;
  in_stock_products: number;
  new_arrivals: number;
  total_categories: number;
  active_offers: number;
};

export type PublicDashboardProduct = {
  id: number;
  product_id?: number | null;
  name: string;
  slug: string;
  sku: string;
  short_description?: string | null;
  fabric?: string | null;
  occasion?: string | null;
  color?: string | null;
  mrp: number;
  selling_price: number;
  stock: number;
  is_new_arrival?: boolean;
  updated_at?: string;
  category_id?: number;
  category_name?: string;
  primary_image?: string | null;
  discount_title?: string | null;
  discount_code?: string | null;
  discount_type?: DiscountType | null;
  discount_value?: number;
  discount_amount?: number;
  final_price?: number;
  is_in_stock?: boolean;
  rating?: number;
  reviewsCount?: number;
  average_rating?: number | string;
  total_reviews?: number | string;
};

export type PublicDashboardCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  product_count: number;
  starting_price: number;
  preview_image?: string | null;
};

export type PublicDashboardHomeData = {
  summary: PublicDashboardSummary;
  hero_banners: PublicDashboardProduct[];
  featured_categories: PublicDashboardCategory[];
  top_deals: PublicDashboardProduct[];
  trending_products: PublicDashboardProduct[];
};

export type PublicDashboardHomeQuery = {
  hero_limit?: number;
  category_limit?: number;
  deal_limit?: number;
  product_limit?: number;
};

export type ValidateCouponInput = {
  code: string;
  order_amount: number;
  product_id?: number | null;
  category_id?: number | null;
  user_id?: number | null;
};

export type CouponValidationResult = {
  coupon: AdminDiscount;
  orderAmount: number;
  discountAmount: number;
  finalAmount: number;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type SignupInput = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
};

export type UpdateProfileInput = {
  name?: string;
  phone?: string | null;
};

export type VerifyEmailInput = {
  email: string;
  otp: string;
};

export type ResendEmailOtpInput = {
  email: string;
};

export type ForgetPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
};

export type RegisterAdminInput = {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
  role?: 'admin' | 'superadmin';
};

export type UpdateUserRoleInput = {
  role: 'user' | 'admin' | 'superadmin' | 'customer';
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type SendNewArrivalsEmailInput = {
  email: string;
};

export type SendNewArrivalsEmailResponse = {
  email: string;
  productsCount?: number;
  emailSent?: boolean;
};

export type ContactMailInput = {
  full_name: string;
  phone_number: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactMailResponse = {
  emailSent: boolean;
};

export type AddressType = 'home' | 'work' | 'other';

export type SavedAddress = {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  pincode: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  landmark?: string | null;
  address_type: AddressType;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CreateSavedAddressInput = {
  full_name: string;
  phone: string;
  pincode: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  landmark?: string | null;
  address_type?: AddressType;
  is_default?: boolean;
};

export type UpdateSavedAddressInput = Partial<CreateSavedAddressInput>;


export const newArrivalsApi = {
  notify: (payload: SendNewArrivalsEmailInput) =>
    request<SendNewArrivalsEmailResponse>('/new-arrivals/notify', {
      method: 'POST',
      body: payload
    })
};


function buildUrl(path: string, params?: RequestOptions['params']) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = `${API_BASE_URL}${normalizedPath}`;
  const hasAbsoluteBase = /^https?:\/\//i.test(API_BASE_URL);
  const url = hasAbsoluteBase
    ? new URL(apiPath)
    : new URL(apiPath, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return hasAbsoluteBase ? url.toString() : `${url.pathname}${url.search}`;
}

function resolveStoredToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const sessionRaw = window.localStorage.getItem('saree-aura-session');
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as { token?: string } | null;
      if (session?.token) {
        return session.token;
      }
    }
  } catch {
  }

  const directToken = window.localStorage.getItem('auth_token') || window.localStorage.getItem('token');
  const normalized = directToken?.trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return undefined;
  }
  return normalized;
}

function resolveRequestToken({ token, useStoredToken }: Pick<RequestOptions, 'token' | 'useStoredToken'>) {
  return token ?? (useStoredToken ? resolveStoredToken() : undefined);
}

function buildRequestError<T>(message: string, json: ApiEnvelope<T> | T | null) {
  const error = new Error(message) as Error & { details?: unknown };

  if (json && typeof json === 'object' && 'details' in json) {
    error.details = (json as { details?: unknown }).details;
  } else if (json && typeof json === 'object' && 'errors' in json) {
    error.details = (json as { errors?: unknown }).errors;
  }

  return error;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    token,
    useStoredToken,
    authRequired = false,
    authErrorMessage = 'Authentication token is required for this request.'
  } = options;

  const resolvedToken = resolveRequestToken({ token, useStoredToken });

  if (authRequired && !resolvedToken) {
    throw new Error(authErrorMessage);
  }

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers
  };

  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormDataBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (resolvedToken && resolvedToken !== 'undefined' && resolvedToken !== 'null') {
    requestHeaders.Authorization = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? (isFormDataBody ? body : JSON.stringify(body)) : undefined
  });

  const rawText = await response.text();
  let json: ApiEnvelope<T> | T | null = null;

  if (rawText) {
    try {
      json = JSON.parse(rawText) as ApiEnvelope<T> | T;
    } catch {
      json = null;
    }
  }

  const headerToken = response.headers.get('authorization');

  if (!response.ok) {
    const message =
      (json && typeof json === 'object' && 'message' in json && typeof json.message === 'string' && json.message) ||
      `Request failed with status ${response.status}`;
    throw buildRequestError(message, json);
  }

  if (json && typeof json === 'object' && 'data' in json) {
    const data = json.data as T;

    if (
      headerToken?.startsWith('Bearer ') &&
      data &&
      typeof data === 'object' &&
      'user' in (data as Record<string, unknown>) &&
      !('token' in (data as Record<string, unknown>))
    ) {
      return {
        ...(data as Record<string, unknown>),
        token: headerToken.slice(7)
      } as T;
    }

    return data;
  }

  return json as T;
}

async function requestEnvelope<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    token,
    useStoredToken,
    authRequired = false,
    authErrorMessage = 'Authentication token is required for this request.'
  } = options;

  const resolvedToken = resolveRequestToken({ token, useStoredToken });

  if (authRequired && !resolvedToken) {
    throw new Error(authErrorMessage);
  }

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...headers
  };

  const isFormDataBody = typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !requestHeaders['Content-Type'] && !isFormDataBody) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: requestHeaders,
    body: body !== undefined ? (isFormDataBody ? body : JSON.stringify(body)) : undefined
  });

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    const message =
      (json && typeof json === 'object' && typeof json.message === 'string' && json.message) ||
      `Request failed with status ${response.status}`;
    throw buildRequestError(message, json);
  }

  return json as ApiEnvelope<T>;
}

export const authApi = {
  signup: (payload: SignupInput) => request<AuthPayload>('/auth/register', { method: 'POST', body: payload }),

  verifyEmail: async (payload: VerifyEmailInput) => {
    const response = await requestEnvelope<null>('/auth/verify-email', {
      method: 'POST',
      body: payload
    });

    return { message: response.message };
  },

  resendEmailOtp: async (payload: ResendEmailOtpInput) => {
    const response = await requestEnvelope<null>('/auth/resend-email-otp', {
      method: 'POST',
      body: payload
    });

    return { message: response.message };
  },

  forgetPassword: async (payload: ForgetPasswordInput) => {
    const response = await requestEnvelope<null>('/auth/forget-password', {
      method: 'POST',
      body: payload
    });

    return { message: response.message };
  },

  resetPassword: async (payload: ResetPasswordInput) => {
    const response = await requestEnvelope<null>('/auth/reset-password', {
      method: 'POST',
      body: payload
    });

    return { message: response.message };
  },

  login: (payload: LoginInput) => request<AuthPayload>('/auth/login', { method: 'POST', body: payload }),
  getProfile: (token: string) => request<UserProfile>('/auth/me', { token }),
  updateProfile: (payload: UpdateProfileInput, token?: string) =>
    request<UserProfile>('/auth/me', {
      method: 'PATCH',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to update your profile.'
    }),

  changePassword: async (payload: ChangePasswordInput, token: string) => {
    const response = await requestEnvelope<null>('/auth/change-password', {
      method: 'POST',
      body: payload,
      token
    });
    return { message: response.message };
  },

  registerAdmin: (payload: RegisterAdminInput, token: string) =>
    request<UserProfile>('/auth/register-admin', { method: 'POST', body: payload, token }),

  updateUserRole: (id: number | string, payload: UpdateUserRoleInput, token: string) =>
    request<UserProfile>(`/auth/users/${id}/role`, { method: 'PATCH', body: payload, token })
};

export const productApi = {
  getAll: (filters?: ProductFilters) => request<Product[]>('/products', { params: filters }),
  getAllPaginated: (query?: PublicProductListQuery) =>
    requestEnvelope<Product[]>('/products', { params: query }),
  getBySlug: (slug: string) => request<Product>(`/products/${slug}`),
  getFilters: () => request<ProductFiltersResponse>('/products/filters'),
  getSearchSuggestions: (query: string, limit = 8) =>
    request<SearchSuggestion[]>('/products/search-suggestions', {
      params: { q: query, limit }
    }),
  getSimilar: (slug: string, limit = 4) => request<Product[]>(`/products/${slug}/similar`, { params: { limit } }),
  getCategories: () => request<string[]>('/products/categories'),
  getCollections: () => request<string[]>('/products/collections'),
  getOffers: (filters?: ProductFilters) => request<Product[]>('/products/offers', { params: filters }),
  getNewArrivals: (filters?: ProductFilters) => request<Product[]>('/products/new-arrivals', { params: filters }),
  getBestSelling: (limit = 8) => request<Product[]>('/products/best-selling', { params: { limit } })
};

export const adminProductApi = {
  list: (token: string, query?: AdminProductListQuery) =>
    requestEnvelope<AdminProduct[]>('/admin/products', { token, params: query }),
  getById: (id: number | string, token: string) => request<AdminProduct>(`/admin/products/${id}`, { token }),
  create: (payload: CreateAdminProductInput, token: string) =>
    request<AdminProduct>('/admin/products', { method: 'POST', body: payload, token }),
  update: (id: number | string, payload: UpdateAdminProductInput, token: string) =>
    request<AdminProduct>(`/admin/products/${id}`, { method: 'PATCH', body: payload, token }),
  remove: (id: number | string, token: string) =>
    request<null>(`/admin/products/${id}`, { method: 'DELETE', token }),
  addImage: (id: number | string, payload: ProductImage, token: string) =>
    request<ProductImage>(`/admin/products/${id}/images`, { method: 'POST', body: payload, token }),
  listImages: (id: number | string, token: string) =>
    request<ProductImage[]>(`/admin/products/${id}/images`, { token }),
  updateImage: (id: number | string, imageId: number | string, payload: Partial<ProductImage>, token: string) =>
    request<ProductImage>(`/admin/products/${id}/images/${imageId}`, { method: 'PATCH', body: payload, token }),
  removeImage: (id: number | string, imageId: number | string, token: string) =>
    request<null>(`/admin/products/${id}/images/${imageId}`, { method: 'DELETE', token })
};

export const categoryApi = {
  list: (query?: CategoryListQuery) =>
    requestEnvelope<Category[]>('/categories', {
      params: query,
      token: ''
    }),
  getBySlug: (slug: string) => request<Category>(`/categories/${slug}`)
};

export const adminCategoryApi = {
  list: (token: string, query?: CategoryListQuery) =>
    requestEnvelope<Category[]>('/admin/categories', { token, params: query }),
  getById: (id: number | string, token: string) => request<Category>(`/admin/categories/${id}`, { token }),
  create: (payload: CreateCategoryInput | FormData, token: string) =>
    request<Category>('/admin/categories', { method: 'POST', body: payload, token }),
  update: (id: number | string, payload: UpdateCategoryInput | FormData, token: string) =>
    request<Category>(`/admin/categories/${id}`, { method: 'PATCH', body: payload, token }),
  remove: (id: number | string, token: string) =>
    request<Category>(`/admin/categories/${id}`, { method: 'DELETE', token })
};

export const adminDiscountApi = {
  list: (token: string, query?: AdminDiscountListQuery) =>
    requestEnvelope<AdminDiscount[]>('/admin/discounts', { token, params: query }),
  getById: (id: number | string, token: string) => request<AdminDiscount>(`/admin/discounts/${id}`, { token }),
  create: (payload: CreateAdminDiscountInput, token: string) =>
    request<AdminDiscount>('/admin/discounts', { method: 'POST', body: payload, token }),
  update: (id: number | string, payload: UpdateAdminDiscountInput, token: string) =>
    request<AdminDiscount>(`/admin/discounts/${id}`, { method: 'PATCH', body: payload, token }),
  remove: (id: number | string, token: string) =>
    request<null>(`/admin/discounts/${id}`, { method: 'DELETE', token })
};

export const adminInventoryApi = {
  list: (token: string, query?: AdminInventoryListQuery) =>
    requestEnvelope<AdminInventoryItem[]>('/admin/inventory', { token, params: query }),
  getLowStock: (token: string, query?: AdminLowStockListQuery) =>
    requestEnvelope<AdminInventoryItem[]>('/admin/inventory/low-stock', { token, params: query }),
  getByProductId: (productId: number | string, token: string) =>
    request<AdminInventoryItem>(`/admin/inventory/${productId}`, { token }),
  updateByProductId: (productId: number | string, payload: UpdateAdminInventoryInput, token: string) =>
    request<AdminInventoryItem>(`/admin/inventory/${productId}`, { method: 'PATCH', body: payload, token }),
  adjust: (payload: AdjustAdminInventoryInput, token: string) =>
    request<AdminInventoryItem>('/admin/inventory/adjust', { method: 'POST', body: payload, token })
};

export const adminDashboardApi = {
  getSummary: (token: string) => request<AdminDashboardSummary>('/admin/dashboard/summary', { token }),
  getTopProducts: (token: string, query?: AdminDashboardListQuery) =>
    request<AdminDashboardTopProduct[]>('/admin/dashboard/top-products', { token, params: query }),
  getLowStock: (token: string, query?: AdminDashboardListQuery) =>
    request<AdminDashboardLowStockProduct[]>('/admin/dashboard/low-stock', { token, params: query }),
  getCategorySummary: (token: string, query?: AdminDashboardListQuery) =>
    request<AdminDashboardCategorySummary[]>('/admin/dashboard/category-summary', { token, params: query })
};

export const publicDashboardApi = {
  getHome: (query?: PublicDashboardHomeQuery) =>
    request<PublicDashboardHomeData>('/public/dashboard/home', { params: query }),
  getHeroBanners: (query?: AdminDashboardListQuery) =>
    request<PublicDashboardProduct[]>('/public/dashboard/hero-banners', { params: query }),
  getFeaturedCategories: (query?: AdminDashboardListQuery) =>
    request<PublicDashboardCategory[]>('/public/dashboard/featured-categories', { params: query }),
  getTopDeals: (query?: AdminDashboardListQuery) =>
    request<PublicDashboardProduct[]>('/public/dashboard/top-deals', { params: query }),
  getTrendingProducts: (query?: AdminDashboardListQuery) =>
    request<PublicDashboardProduct[]>('/public/dashboard/trending-products', { params: query })
};

export const ratingApi = {
  getSummary: (productId: number | string) =>
    request<RatingSummary>(`/products/${productId}/rating-summary`),
  getReviews: (productId: number | string, query?: ReviewListQuery) =>
    requestEnvelope<ReviewListResponse>(`/products/${productId}/reviews`, { params: query }),
  createReview: (productId: number | string, payload: ReviewPayload | FormData, token?: string) =>
    request<Review>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to submit a review.'
    }),
  updateReview: (reviewId: number | string, payload: Partial<ReviewPayload>, token?: string) =>
    request<Review>(`/reviews/${reviewId}`, {
      method: 'PATCH',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to update your review.'
    }),
  deleteReview: (reviewId: number | string, token?: string) =>
    request<{ id: number | string }>(`/reviews/${reviewId}`, {
      method: 'DELETE',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to delete your review.'
    })
};


export const offerApi = {
  getActive: (query?: { page?: number; limit?: number; product_id?: number; category_id?: number }) =>
    requestEnvelope<AdminDiscount[]>('/offers/active', { params: query }),
  validateCoupon: (payload: ValidateCouponInput) =>
    request<CouponValidationResult>('/coupons/validate', { method: 'POST', body: payload })
};

export const wishlistApi = {
  get: (token: string) => request<WishlistSummary>('/wishlist', { token }),
  add: (productId: number, token: string) =>
    request<WishlistSummary>('/wishlist/items', { method: 'POST', body: { product_id: productId }, token }),
  remove: (itemId: number, token: string) =>
    request<WishlistSummary>(`/wishlist/items/${itemId}`, { method: 'DELETE', token }),
  clear: (token: string) => request<{ cleared: boolean }>('/wishlist', { method: 'DELETE', token })
};

export const addressApi = {
  list: (token?: string) =>
    request<SavedAddress[]>('/addresses', {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to fetch saved addresses.'
    }),
  getById: (id: number | string, token?: string) =>
    request<SavedAddress>(`/addresses/${id}`, {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to fetch this address.'
    }),
  create: (payload: CreateSavedAddressInput, token?: string) =>
    request<SavedAddress>('/addresses', {
      method: 'POST',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to save this address.'
    }),
  update: (id: number | string, payload: UpdateSavedAddressInput, token?: string) =>
    request<SavedAddress>(`/addresses/${id}`, {
      method: 'PATCH',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to update this address.'
    }),
  setDefault: (id: number | string, token?: string) =>
    request<SavedAddress>(`/addresses/${id}/default`, {
      method: 'PATCH',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to select this address.'
    }),
  remove: (id: number | string, token?: string) =>
    request<{ message?: string }>(`/addresses/${id}`, {
      method: 'DELETE',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to delete this address.'
    })
};

export const orderApi = {
  create: (payload: CreateOrderInput, token?: string) =>
    request<Order>('/orders', {
      method: 'POST',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to create an order.'
    }),
  getAll: (token?: string) =>
    request<Order[]>('/orders', {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to fetch orders.'
    }),
  getById: (id: number | string, token?: string) =>
    request<Order>(`/orders/${id}`, {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to fetch order details.'
    }),
  cancel: (id: number | string, token?: string) =>
    request<Order>(`/orders/${id}/cancel`, {
      method: 'PATCH',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to cancel this order.'
    })
};

export const adminOrderApi = {
  getSummary: (token?: string) =>
    request<AdminOrderSummary>('/admin/orders/summary', {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Admin login is required to fetch order summary.'
    }),
  getAll: (token?: string, query?: AdminOrderListQuery) =>
    request<AdminOrderListResponse>('/admin/orders', {
      token,
      params: query,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Admin login is required to fetch customer orders.'
    }),
  getById: (id: number | string, token?: string) =>
    request<Order>(`/admin/orders/${id}`, {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Admin login is required to fetch order details.'
    })
};

export const cartApi = {
  getCart: (token?: string) =>
    request<CartSummary>('/cart', {
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to fetch the cart.'
    }),

  addItem: (payload: AddCartItemInput, token?: string) =>
    request<CartSummary>('/cart/items', {
      method: 'POST',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to add items to the cart.'
    }),

  updateItemQuantity: (itemId: number, payload: UpdateCartItemInput, token?: string) =>
    request<CartSummary>(`/cart/items/${itemId}`, {
      method: 'PATCH',
      body: payload,
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to update cart items.'
    }),

  removeItem: (itemId: number, token?: string) =>
    request<CartSummary>(`/cart/items/${itemId}`, {
      method: 'DELETE',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to remove cart items.'
    }),

  clearCart: (token?: string) =>
    request<CartSummary>('/cart', {
      method: 'DELETE',
      token,
      useStoredToken: true,
      authRequired: true,
      authErrorMessage: 'Please login first to clear the cart.'
    }),

  get: (token?: string) => cartApi.getCart(token),
  add: (productId: number, quantity: number, token?: string) =>
    cartApi.addItem({ product_id: productId, quantity }, token),
  updateQuantity: (itemId: number, quantity: number, token?: string) =>
    cartApi.updateItemQuantity(itemId, { quantity }, token),
  remove: (itemId: number, token?: string) => cartApi.removeItem(itemId, token),
  clear: (token?: string) => cartApi.clearCart(token)
};

export const filtersApi = {
  get: async (params?: ProductFiltersQuery) => {
    const [filters, categoriesResponse] = await Promise.all([
      request<FiltersResponse>('/products/filters', { params }),
      categoryApi.list().catch(() => null)
    ]);

    const categoryNamesById = new Map(
      (categoriesResponse?.data ?? []).map((category) => [String(category.id), category.name])
    );

    return {
      ...filters,
      categories: (filters.categories ?? []).map((category) => {
        const normalized = String(category).trim();
        return categoryNamesById.get(normalized) ?? normalized;
      })
    };
  }
};


export const contactApi = {
  sendMail: (payload: ContactMailInput) =>
    request<ContactMailResponse>('/contact/send-mail', {
      method: 'POST',
      body: payload
    })
};


const commonApi = {
  auth: authApi,
  categories: categoryApi,
  adminCategories: adminCategoryApi,
  adminDashboard: adminDashboardApi,
  adminDiscounts: adminDiscountApi,
  adminInventory: adminInventoryApi,
  adminOrders: adminOrderApi,
  adminProducts: adminProductApi,
  newArrivals: newArrivalsApi,
  offers: offerApi,
  order: orderApi,
  addresses: addressApi,
  publicDashboard: publicDashboardApi,
  products: productApi,
  rating: ratingApi,
  wishlist: wishlistApi,
  cart: cartApi,
  filters: filtersApi,
  contact: contactApi,
};

export default commonApi;
