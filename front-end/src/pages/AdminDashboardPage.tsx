import { type ChangeEvent, type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import commonApi, {
  type AdminOrderSummary,
  type AdminInventoryItem,
  type AdminDiscount,
  type AdminProduct,
  type Category,
  type CreateAdminDiscountInput,
  type CreateAdminProductInput,
  type Order,
  type Product,
  type UpdateAdminInventoryInput,
  type UpdateAdminDiscountInput,
  type UpdateAdminProductInput
} from '../api/commonapi';
import type { CatalogProduct } from '../data/productCatalog';
import { useCatalog } from '../context/CatalogContext';
import { navigateTo } from '../utils/navigation';
import { resolveProductSource, saveProductSourceOverride } from '../utils/productSource';

type ProductFormState = {
  name: string;
  slug: string;
  sku: string;
  source: CatalogProduct['source'] | '';
  categoryId: string;
  occasion: string;
  fabric: string;
  color: string;
  blouseIncluded: boolean;
  price: string;
  originalPrice: string;
  image: string;
  images: string[];
  shortDescription: string;
  description: string;
  offerTag: string;
  stock: string;
  status: NonNullable<AdminProduct['status']> | '';
};

type ProductView = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  source: CatalogProduct['source'];
  categoryId: number;
  categoryName: string;
  occasion: string;
  fabric: string;
  color: string;
  blouseIncluded: boolean;
  price: number;
  originalPrice: number;
  image: string;
  shortDescription: string;
  description: string;
  offerTag: string;
  stock: number;
  status: NonNullable<AdminProduct['status']>;
  raw: AdminProduct;
};

type DiscountFormState = {
  title: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed';
  value: string;
  appliesTo: 'all' | 'product' | 'category';
  productId: string;
  categoryId: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

type CategoryFormState = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
  imagePreviewUrl: string;
  isActive: boolean;
};

type ProductFieldErrors = Partial<
  Record<
    | 'name'
    | 'slug'
    | 'sku'
    | 'categoryId'
    | 'occasion'
    | 'fabric'
    | 'color'
    | 'price'
    | 'originalPrice'
    | 'image'
    | 'shortDescription'
    | 'description'
    | 'offerTag'
    | 'stock',
    string
  >
>;

type CategoryFieldErrors = Partial<Record<'name' | 'slug' | 'image', string>>;
type DiscountFieldErrors = Partial<
  Record<'title' | 'code' | 'value' | 'productId' | 'categoryId' | 'startsAt' | 'endsAt', string>
>;
type AdminView = 'overall' | 'product-manager' | 'category-manager' | 'discount-manager' | 'inventory-manager' | 'order-management';
type OverviewSection = 'products' | 'categories' | 'discounts' | 'inventory' | 'orders';
type OverviewFilter =
  | 'all-products'
  | 'collections'
  | 'new-arrivals'
  | 'offers'
  | 'all-categories'
  | 'active-categories'
  | 'inactive-categories'
  | 'categories-with-image'
  | 'all-discounts'
  | 'active-discounts'
  | 'product-discounts'
  | 'category-discounts'
  | 'all-inventory'
  | 'low-stock'
  | 'available-stock'
  | 'reserved-stock'
  | 'all-orders'
  | 'placed-orders'
  | 'processing-orders'
  | 'shipped-orders'
  | 'delivered-orders'
  | 'cancelled-orders'
  | 'total-revenue';

const emptyForm: ProductFormState = {
  name: '',
  slug: '',
  sku: '',
  source: '',
  categoryId: '',
  occasion: '',
  fabric: '',
  color: '',
  blouseIncluded: false,
  price: '',
  originalPrice: '',
  image: '',
  images: [],
  shortDescription: '',
  description: '',
  offerTag: '',
  stock: '',
  status: ''
};

const emptyDiscountForm: DiscountFormState = {
  title: '',
  code: '',
  description: '',
  type: 'percentage',
  value: '',
  appliesTo: 'all',
  productId: '',
  categoryId: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  perUserLimit: '',
  isActive: true,
  startsAt: '',
  endsAt: ''
};

const emptyCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  imageUrl: '',
  imageFile: null,
  imagePreviewUrl: '',
  isActive: true
};

const emptyAdminOrderSummary: AdminOrderSummary = {
  total_orders: 0,
  placed_orders: 0,
  processing_orders: 0,
  shipped_orders: 0,
  delivered_orders: 0,
  cancelled_orders: 0,
  total_revenue: 0
};

const adminFieldClassName = 'block text-sm font-semibold leading-5 text-ink/70';
const adminControlClassName =
  'mt-1.5 h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10';
const adminSelectClassName =
  `${adminControlClassName} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 20 20' fill='none'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%237f3150' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")] bg-[right_0.85rem_center] bg-no-repeat pr-9`;
const adminTextareaClassName = `${adminControlClassName} h-auto min-h-24 resize-y`;
const adminCheckboxClassName =
  'flex min-h-11 items-center gap-3 rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 text-sm font-semibold text-ink/70';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildSku = (name: string) => `SKU-${slugify(name || 'product').toUpperCase()}-${Date.now().toString().slice(-6)}`;

const buildProductSlug = (form: ProductFormState, existingProduct?: ProductView) => {
  const typedSlug = slugify(form.slug);

  if (typedSlug) {
    return typedSlug;
  }

  if (existingProduct?.slug) {
    return existingProduct.slug;
  }

  const nameSlug = slugify(sanitizeTextOnly(form.name)) || 'product';
  const skuSlug = slugify(sanitizeSku(form.sku)) || Date.now().toString();

  return `${nameSlug}-${skuSlug}`;
};

const normalizeCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 50);

const sanitizeTextOnly = (value: string) => value.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ');

const sanitizeDescriptionText = (value: string) =>
  value.replace(/[^a-zA-Z0-9\s.,'&()/-]/g, '').replace(/\s{2,}/g, ' ');

const sanitizeShortDescriptionText = (value: string) => value.replace(/[^a-zA-Z\s.,]/g, '').replace(/\s{2,}/g, ' ');

const sanitizeSku = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 60);

const sanitizePriceInput = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = normalized.split('.');
  const decimal = decimalParts.join('').slice(0, 2);

  return decimalParts.length ? `${whole}.${decimal}` : whole;
};

const sanitizeIntegerInput = (value: string) => value.replace(/\D/g, '');

const hasOnlyText = (value: string) => /^[a-zA-Z\s]+$/.test(value.trim());

const hasValidPrice = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim()) && Number(value) > 0;

const hasValidInteger = (value: string, minimum = 0) => /^\d+$/.test(value.trim()) && Number(value) >= minimum;

const formatAdminCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const getOrderStatusFilter = (filter: OverviewFilter) => {
  if (filter === 'placed-orders') return 'placed';
  if (filter === 'processing-orders') return 'processing';
  if (filter === 'shipped-orders') return 'shipped';
  if (filter === 'delivered-orders') return 'delivered';
  if (filter === 'cancelled-orders') return 'cancelled';

  return undefined;
};

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
};

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

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const details = (error as Error & { details?: string[] }).details;

    if (Array.isArray(details) && details.length) {
      return details.join(', ');
    }

    return error.message;
  }

  return fallback;
}

function isForbiddenError(error: unknown) {
  return error instanceof Error && /403|forbidden/i.test(error.message);
}

const getProductSource = (product: AdminProduct): CatalogProduct['source'] => {
  return resolveProductSource(product, 'category');
};

function isOfferProduct(product: Pick<AdminProduct, 'mrp' | 'selling_price'>) {
  return product.mrp > product.selling_price;
}

function isCollectionProduct(product: ProductView) {
  if (product.source === 'collection') {
    return true;
  }

  const category = product.categoryName.trim().toLowerCase();

  if (!category) {
    return false;
  }

  return !category.includes('silk saree') && !category.includes('cotton saree');
}

function mapAdminProductToView(product: AdminProduct, categories: Category[]): ProductView {
  const categoryName = categories.find((category) => category.id === product.category_id)?.name ?? `Category ${product.category_id}`;
  const image = product.images?.[0]?.image_url ?? '';
  const source = getProductSource(product);
  const shortDescription = product.short_description ?? '';
  const hasOffer = isOfferProduct(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    source,
    categoryId: product.category_id,
    categoryName,
    occasion: product.occasion ?? '',
    fabric: product.fabric ?? '',
    color: product.color ?? '',
    blouseIncluded: Boolean(product.blouse_included),
    price: product.selling_price,
    originalPrice: product.mrp,
    image,
    shortDescription: hasOffer ? '' : shortDescription,
    description: product.description ?? '',
    offerTag: hasOffer ? shortDescription : '',
    stock: product.stock,
    status: product.status ?? 'active',
    raw: product
  };
}

function mapProductToForm(product: ProductView | null): ProductFormState {
  if (!product) {
    return emptyForm;
  }

  const images = (product.raw.images ?? [])
    .map((image) => image.image_url?.trim())
    .filter((image): image is string => Boolean(image));

  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    source: product.source,
    categoryId: String(product.categoryId),
    occasion: product.occasion,
    fabric: product.fabric,
    color: product.color,
    blouseIncluded: product.blouseIncluded,
    price: String(product.price),
    originalPrice: String(product.originalPrice),
    image: product.image,
    images: images.length ? images : product.image ? [product.image] : [],
    shortDescription: product.shortDescription,
    description: product.description,
    offerTag: product.offerTag,
    stock: String(product.stock),
    status: product.status
  };
}

function mapDiscountToForm(discount: AdminDiscount | null): DiscountFormState {
  if (!discount) {
    return emptyDiscountForm;
  }

  return {
    title: discount.title,
    code: discount.code,
    description: discount.description ?? '',
    type: discount.type,
    value: String(discount.value),
    appliesTo: discount.applies_to,
    productId: discount.product_id ? String(discount.product_id) : '',
    categoryId: discount.category_id ? String(discount.category_id) : '',
    minOrderAmount: discount.min_order_amount !== null && discount.min_order_amount !== undefined ? String(discount.min_order_amount) : '',
    maxDiscountAmount:
      discount.max_discount_amount !== null && discount.max_discount_amount !== undefined ? String(discount.max_discount_amount) : '',
    usageLimit: discount.usage_limit !== null && discount.usage_limit !== undefined ? String(discount.usage_limit) : '',
    perUserLimit: discount.per_user_limit !== null && discount.per_user_limit !== undefined ? String(discount.per_user_limit) : '',
    isActive: discount.is_active,
    startsAt: formatDateTimeLocal(discount.starts_at),
    endsAt: formatDateTimeLocal(discount.ends_at)
  };
}

function getCategoryImageUrl(category: Category) {
  return category.image_url ?? category.imageUrl ?? '';
}

function isCategoryActive(category: Category) {
  return category.is_active ?? category.isActive ?? false;
}

function mapCategoryToForm(category: Category | null): CategoryFormState {
  if (!category) {
    return emptyCategoryForm;
  }

  const imageUrl = getCategoryImageUrl(category);

  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    imageUrl,
    imageFile: null,
    imagePreviewUrl: imageUrl,
    isActive: isCategoryActive(category)
  };
}

function mapPublicProductToAdminProduct(product: Product): AdminProduct {
  const mrp = Number(product.mrp ?? product.originalPrice ?? product.selling_price ?? product.price ?? 0);
  const sellingPrice = Number(product.selling_price ?? product.price ?? mrp);
  const productImages = (product.images ?? [])
    .map((image, index) => {
      const imageUrl = typeof image === 'string' ? image : image.image_url ?? image.upload_url ?? image.url ?? '';

      return imageUrl.trim()
        ? {
            image_url: imageUrl.trim(),
            alt_text: product.name,
            is_primary: index === 0,
            sort_order: index + 1
          }
        : null;
    })
    .filter((image): image is NonNullable<typeof image> => Boolean(image));

  return {
    id: typeof product.id === 'number' ? product.id : Number(product.id ?? 0),
    name: product.name,
    slug: product.slug,
    sku: `PUBLIC-${String(product.id ?? product.slug).toUpperCase()}`,
    short_description: product.short_description ?? product.note ?? product.offerTag ?? null,
    description: product.description ?? null,
    category_id: Number(product.category_id ?? product.id ?? 0),
    occasion: product.occasion ?? null,
    color: product.color ?? null,
    mrp,
    selling_price: sellingPrice,
    stock: Number(product.stock ?? 0),
    is_new_arrival: resolveProductSource(product, 'category') === 'new-arrivals',
    status: 'active',
    images: product.image
      ? [
          {
            image_url: product.image,
            alt_text: product.name,
            is_primary: true,
            sort_order: 1
          }
        ]
      : productImages
  };
}

function resolveLatestAdminToken() {
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

function AdminDashboardPage() {
  const { refreshProducts } = useCatalog();
  const [message, setMessage] = useState('Manage products, pricing, and catalogue visibility from one place.');
  const [operationNotice, setOperationNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [activeAdminView, setActiveAdminView] = useState<AdminView>('overall');
  const [activeOverviewSection, setActiveOverviewSection] = useState<OverviewSection>('products');
  const [activeOverviewFilter, setActiveOverviewFilter] = useState<OverviewFilter>('all-products');
  const [showOverviewDetails, setShowOverviewDetails] = useState(false);
  const [activePanel, setActivePanel] = useState<'add' | 'update' | 'remove' | null>(null);
  const [addForm, setAddForm] = useState<ProductFormState>(emptyForm);
  const [updateForm, setUpdateForm] = useState<ProductFormState>(emptyForm);
  const [addProductErrors, setAddProductErrors] = useState<ProductFieldErrors>({});
  const [updateProductErrors, setUpdateProductErrors] = useState<ProductFieldErrors>({});
  const [addCategoryForm, setAddCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [updateCategoryForm, setUpdateCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [addCategoryErrors, setAddCategoryErrors] = useState<CategoryFieldErrors>({});
  const [updateCategoryErrors, setUpdateCategoryErrors] = useState<CategoryFieldErrors>({});
  const [addDiscountErrors, setAddDiscountErrors] = useState<DiscountFieldErrors>({});
  const [updateDiscountErrors, setUpdateDiscountErrors] = useState<DiscountFieldErrors>({});
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [adminCategories, setAdminCategories] = useState<Category[]>([]);
  const [adminDiscounts, setAdminDiscounts] = useState<AdminDiscount[]>([]);
  const [adminOrderSummary, setAdminOrderSummary] = useState<AdminOrderSummary>(emptyAdminOrderSummary);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [isLoadingAdminOrders, setIsLoadingAdminOrders] = useState(false);
  const [adminOrderSearchTerm, setAdminOrderSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [inventoryItems, setInventoryItems] = useState<AdminInventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<AdminInventoryItem[]>([]);
  const [selectedInventoryProductId, setSelectedInventoryProductId] = useState('');
  const [inventoryForm, setInventoryForm] = useState({
    available_stock: '',
    reserved_stock: '',
    low_stock_threshold: ''
  });
  const [inventoryAdjustForm, setInventoryAdjustForm] = useState({
    product_id: '',
    adjustment_type: 'increase',
    quantity: '',
    low_stock_threshold: '',
    note: ''
  });
  const [addDiscountForm, setAddDiscountForm] = useState<DiscountFormState>(emptyDiscountForm);
  const [updateDiscountForm, setUpdateDiscountForm] = useState<DiscountFormState>(emptyDiscountForm);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isAdjustingInventory, setIsAdjustingInventory] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<AdminProduct[] | null>(null);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [expandedProductImageIds, setExpandedProductImageIds] = useState<number[]>([]);
  const [expandedCategoryDescriptionIds, setExpandedCategoryDescriptionIds] = useState<number[]>([]);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [discountSearchTerm, setDiscountSearchTerm] = useState('');
  const [discountSearchResults, setDiscountSearchResults] = useState<AdminDiscount[] | null>(null);
  const [isSearchingDiscounts, setIsSearchingDiscounts] = useState(false);
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventorySearchResults, setInventorySearchResults] = useState<AdminInventoryItem[] | null>(null);
  const [isSearchingInventory, setIsSearchingInventory] = useState(false);

  const showOperationNotice = (text: string, kind: 'success' | 'error' = 'success') => {
    setOperationNotice({ kind, text });
  };

  const handleDashboardBack = () => {
    if (showOverviewDetails) {
      setShowOverviewDetails(false);
      setProductSearchTerm('');
      setProductSearchResults(null);
      return;
    }

    if (activePanel) {
      setActivePanel(null);
      return;
    }

    navigateTo('/');
  };

  const token = resolveAdminToken();

  const productViews = useMemo(
    () => adminProducts.map((product) => mapAdminProductToView(product, adminCategories)),
    [adminCategories, adminProducts]
  );

  const searchedProductViews = useMemo(
    () => (productSearchResults ?? adminProducts).map((product) => mapAdminProductToView(product, adminCategories)),
    [adminCategories, adminProducts, productSearchResults]
  );

  const selectedProduct = useMemo(
    () => productViews.find((product) => String(product.id) === selectedProductId) ?? null,
    [productViews, selectedProductId]
  );

  const selectedDiscount = useMemo(
    () => adminDiscounts.find((discount) => String(discount.id) === selectedDiscountId) ?? null,
    [adminDiscounts, selectedDiscountId]
  );

  const selectedCategory = useMemo(
    () => adminCategories.find((category) => String(category.id) === selectedCategoryId) ?? null,
    [adminCategories, selectedCategoryId]
  );

  const selectedInventoryItem = useMemo(
    () => inventoryItems.find((item) => String(item.product_id) === selectedInventoryProductId) ?? null,
    [inventoryItems, selectedInventoryProductId]
  );

  const sortedInventoryItems = useMemo(
    () =>
      [...inventoryItems].sort((first, second) =>
        (first.product_name ?? `Product ${first.product_id}`).localeCompare(
          second.product_name ?? `Product ${second.product_id}`,
          undefined,
          { sensitivity: 'base' }
        )
      ),
    [inventoryItems]
  );

  const sortedLowStockItems = useMemo(
    () =>
      [...lowStockItems].sort((first, second) =>
        (first.product_name ?? `Product ${first.product_id}`).localeCompare(
          second.product_name ?? `Product ${second.product_id}`,
          undefined,
          { sensitivity: 'base' }
        )
      ),
    [lowStockItems]
  );

  const dashboardStats = useMemo(
    () => [
      { label: 'Total Products', value: productViews.length, section: 'products' as const, filter: 'all-products' as const },
      { label: 'Collections', value: productViews.filter(isCollectionProduct).length, section: 'products' as const, filter: 'collections' as const },
      { label: 'New Arrivals', value: productViews.filter((product) => product.source === 'new-arrivals').length, section: 'products' as const, filter: 'new-arrivals' as const },
      { label: 'Discounts', value: adminDiscounts.length, section: 'discounts' as const, filter: 'all-discounts' as const },
      { label: 'Active Discounts', value: adminDiscounts.filter((discount) => discount.is_active).length, section: 'discounts' as const, filter: 'active-discounts' as const },
      { label: 'Inventory Records', value: inventoryItems.length, section: 'inventory' as const, filter: 'all-inventory' as const },
      { label: 'Low Stock Items', value: lowStockItems.length, section: 'inventory' as const, filter: 'low-stock' as const }
    ],
    [adminDiscounts, inventoryItems.length, lowStockItems.length, productViews]
  );

  const productStats = useMemo(
    () => [
      { label: 'Total Products', value: productViews.length, section: 'products' as const, filter: 'all-products' as const },
      { label: 'Collections', value: productViews.filter(isCollectionProduct).length, section: 'products' as const, filter: 'collections' as const },
      { label: 'New Arrivals', value: productViews.filter((product) => product.source === 'new-arrivals').length, section: 'products' as const, filter: 'new-arrivals' as const },
      { label: 'Offers', value: productViews.filter((product) => isOfferProduct(product.raw)).length, section: 'products' as const, filter: 'offers' as const }
    ],
    [productViews]
  );

  const categoryStats = useMemo(
    () => [
      { label: 'Total Categories', value: adminCategories.length, section: 'categories' as const, filter: 'all-categories' as const },
      { label: 'Active Categories', value: adminCategories.filter(isCategoryActive).length, section: 'categories' as const, filter: 'active-categories' as const },
      { label: 'Inactive Categories', value: adminCategories.filter((category) => !isCategoryActive(category)).length, section: 'categories' as const, filter: 'inactive-categories' as const }
    ],
    [adminCategories]
  );

  const discountStats = useMemo(
    () => [
      { label: 'Discounts', value: adminDiscounts.length, section: 'discounts' as const, filter: 'all-discounts' as const },
      { label: 'Active Discounts', value: adminDiscounts.filter((discount) => discount.is_active).length, section: 'discounts' as const, filter: 'active-discounts' as const },
      { label: 'Product Offers', value: adminDiscounts.filter((discount) => discount.applies_to === 'product').length, section: 'discounts' as const, filter: 'product-discounts' as const },
      { label: 'Category Offers', value: adminDiscounts.filter((discount) => discount.applies_to === 'category').length, section: 'discounts' as const, filter: 'category-discounts' as const }
    ],
    [adminDiscounts]
  );

  const inventoryStats = useMemo(
    () => [
      { label: 'Inventory Records', value: inventoryItems.length, section: 'inventory' as const, filter: 'all-inventory' as const },
      { label: 'Low Stock Items', value: lowStockItems.length, section: 'inventory' as const, filter: 'low-stock' as const },
      { label: 'Available Stock', value: inventoryItems.reduce((sum, item) => sum + Number(item.available_stock || 0), 0), section: 'inventory' as const, filter: 'available-stock' as const },
      { label: 'Reserved Stock', value: inventoryItems.reduce((sum, item) => sum + Number(item.reserved_stock || 0), 0), section: 'inventory' as const, filter: 'reserved-stock' as const }
    ],
    [inventoryItems, lowStockItems.length]
  );

  const orderStats = useMemo(
    () => [
      { label: 'Total Orders', value: adminOrderSummary.total_orders, section: 'orders' as const, filter: 'all-orders' as const },
      { label: 'Placed Orders', value: adminOrderSummary.placed_orders, section: 'orders' as const, filter: 'placed-orders' as const },
      { label: 'Processing Orders', value: adminOrderSummary.processing_orders, section: 'orders' as const, filter: 'processing-orders' as const },
      { label: 'Dispatched Orders', value: adminOrderSummary.shipped_orders, section: 'orders' as const, filter: 'shipped-orders' as const },
      { label: 'Delivered Orders', value: adminOrderSummary.delivered_orders, section: 'orders' as const, filter: 'delivered-orders' as const },
      { label: 'Cancelled Orders', value: adminOrderSummary.cancelled_orders, section: 'orders' as const, filter: 'cancelled-orders' as const },
      { label: 'Total Revenue', value: formatAdminCurrency(adminOrderSummary.total_revenue), section: 'orders' as const, filter: 'total-revenue' as const }
    ],
    [adminOrderSummary]
  );

  const displayedStats =
    activeAdminView === 'product-manager'
      ? productStats
      : activeAdminView === 'category-manager'
        ? categoryStats
        : activeAdminView === 'discount-manager'
          ? discountStats
          : activeAdminView === 'inventory-manager'
            ? inventoryStats
            : activeAdminView === 'order-management'
              ? orderStats
              : dashboardStats;

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const latestToken = resolveLatestAdminToken();

      if (!latestToken) {
        const [publicCategories, publicProducts] = await Promise.all([
          commonApi.categories.list({ limit: 100 }).catch(() => null),
          commonApi.products.getAll({ limit: 100 }).catch(() => [])
        ]);

        setAdminCategories(publicCategories?.data ?? []);
        setAdminProducts(publicProducts.map(mapPublicProductToAdminProduct));
        setAdminDiscounts([]);
        setInventoryItems([]);
        setLowStockItems([]);
        setAdminOrderSummary(emptyAdminOrderSummary);
        setAdminOrders([]);
        setMessage('Public catalog data refreshed. Login as admin to load discount and inventory data.');
        return;
      }

      const [categoryResult, productResult, discountResult, inventoryResult, lowStockResult, orderSummaryResult] = await Promise.allSettled([
        commonApi.adminCategories.list(latestToken, { limit: 100 }),
        commonApi.adminProducts.list(latestToken, { limit: 100 }),
        commonApi.adminDiscounts.list(latestToken, { limit: 100 }),
        commonApi.adminInventory.list(latestToken, { limit: 100 }),
        commonApi.adminInventory.getLowStock(latestToken, { limit: 100 }),
        commonApi.adminOrders.getSummary(latestToken)
      ]);

      const categoriesLoaded = categoryResult.status === 'fulfilled';
      const productsLoaded = productResult.status === 'fulfilled';
      const discountsLoaded = discountResult.status === 'fulfilled';
      const inventoryLoaded = inventoryResult.status === 'fulfilled';
      const lowStockLoaded = lowStockResult.status === 'fulfilled';
      const orderSummaryLoaded = orderSummaryResult.status === 'fulfilled';

      if (categoriesLoaded) {
        setAdminCategories(categoryResult.value.data);
      }

      if (productsLoaded) {
        setAdminProducts(productResult.value.data);
      }

      if (discountsLoaded) {
        setAdminDiscounts(discountResult.value.data);
      } else if (isForbiddenError(discountResult.reason)) {
        setAdminDiscounts([]);
      }

      if (inventoryLoaded) {
        setInventoryItems(inventoryResult.value.data);
      }

      if (lowStockLoaded) {
        setLowStockItems(lowStockResult.value.data);
      }

      if (orderSummaryLoaded) {
        setAdminOrderSummary(orderSummaryResult.value);
      } else {
        setAdminOrderSummary(emptyAdminOrderSummary);
      }

      if (!categoriesLoaded) {
        const publicCategories = await commonApi.categories.list({ limit: 100 }).catch(() => null);

        if (publicCategories?.data?.length) {
          setAdminCategories(publicCategories.data);
        } else {
          throw categoryResult.reason;
        }
      }

      if (!productsLoaded) {
        throw productResult.reason;
      }

      if (!discountsLoaded && !isForbiddenError(discountResult.reason)) {
        throw discountResult.reason;
      }

      setMessage(
        discountsLoaded && orderSummaryLoaded
          ? 'Admin products, discounts, inventory, and orders loaded successfully.'
          : 'Products loaded. Some admin APIs are currently unavailable for this account.'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdminOrders = async (filter: OverviewFilter, searchTerm = adminOrderSearchTerm) => {
    const latestToken = resolveLatestAdminToken();

    if (!latestToken) {
      setAdminOrders([]);
      showOperationNotice('Admin login is required to load order details.', 'error');
      return;
    }

    setIsLoadingAdminOrders(true);

    try {
      const status = getOrderStatusFilter(filter);
      const search = searchTerm.trim();
      const response = await commonApi.adminOrders.getAll(latestToken, {
        limit: 100,
        ...(status ? { status } : {}),
        ...(search ? { search } : {})
      });

      setAdminOrders(response.orders);
    } catch (error) {
      setAdminOrders([]);
      showOperationNotice(getErrorMessage(error, 'Unable to load admin orders.'), 'error');
    } finally {
      setIsLoadingAdminOrders(false);
    }
  };

  const handleOverviewStatClick = (section: OverviewSection, filter: OverviewFilter) => {
    setActiveOverviewSection(section);
    setActiveOverviewFilter(filter);
    setShowOverviewDetails(true);

    if (section === 'orders') {
      void loadAdminOrders(filter, adminOrderSearchTerm);
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  useEffect(() => {
    if (!showOverviewDetails || activeOverviewSection !== 'orders') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAdminOrders(activeOverviewFilter, adminOrderSearchTerm);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [activeOverviewFilter, activeOverviewSection, adminOrderSearchTerm, showOverviewDetails]);

  useEffect(() => {
    if (!selectedProductId && productViews[0]) {
      setSelectedProductId(String(productViews[0].id));
      return;
    }

    if (selectedProductId && !selectedProduct) {
      setSelectedProductId(productViews[0] ? String(productViews[0].id) : '');
      return;
    }

    setUpdateForm(mapProductToForm(selectedProduct));
  }, [productViews, selectedProduct, selectedProductId]);

  useEffect(() => {
    if (!selectedDiscountId && adminDiscounts[0]) {
      setSelectedDiscountId(String(adminDiscounts[0].id));
      return;
    }

    if (selectedDiscountId && !selectedDiscount) {
      setSelectedDiscountId(adminDiscounts[0] ? String(adminDiscounts[0].id) : '');
      return;
    }

    setUpdateDiscountForm(mapDiscountToForm(selectedDiscount));
  }, [adminDiscounts, selectedDiscount, selectedDiscountId]);

  useEffect(() => {
    if (!selectedCategoryId && adminCategories[0]) {
      setSelectedCategoryId(String(adminCategories[0].id));
      return;
    }

    if (selectedCategoryId && !selectedCategory) {
      setSelectedCategoryId(adminCategories[0] ? String(adminCategories[0].id) : '');
      return;
    }

    setUpdateCategoryForm(mapCategoryToForm(selectedCategory));
  }, [adminCategories, selectedCategory, selectedCategoryId]);

  useEffect(() => {
    if (!selectedInventoryProductId && inventoryItems[0]) {
      setSelectedInventoryProductId(String(inventoryItems[0].product_id));
      return;
    }

    if (selectedInventoryItem) {
      setInventoryForm({
        available_stock: String(selectedInventoryItem.available_stock),
        reserved_stock: String(selectedInventoryItem.reserved_stock),
        low_stock_threshold: String(selectedInventoryItem.low_stock_threshold)
      });
    }
  }, [inventoryItems, selectedInventoryItem, selectedInventoryProductId]);

  useEffect(() => {
    if (!inventoryAdjustForm.product_id && productViews[0]) {
      setInventoryAdjustForm((current) => ({
        ...current,
        product_id: String(productViews[0].id)
      }));
    }
  }, [inventoryAdjustForm.product_id, productViews]);

  useEffect(() => {
    if (!operationNotice) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setOperationNotice(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [operationNotice]);

  useEffect(() => {
    const search = productSearchTerm.trim();

    if (!search) {
      setProductSearchResults(null);
      setIsSearchingProducts(false);
      return undefined;
    }

    if (!showOverviewDetails || activeOverviewSection !== 'products') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchingProducts(true);

      const searchRequest = token
        ? commonApi.adminProducts.list(token, { search, limit: 100, sort_by: 'name', sort_order: 'ASC' }).then((response) => response.data)
        : commonApi.products.getAll({ search, limit: 100 }).then((products) => products.map(mapPublicProductToAdminProduct));

      searchRequest
        .then((products) => {
          setProductSearchResults(products);
        })
        .catch(() => {
          setProductSearchResults([]);
        })
        .finally(() => {
          setIsSearchingProducts(false);
        });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeOverviewSection, productSearchTerm, showOverviewDetails, token]);

  useEffect(() => {
    const search = discountSearchTerm.trim();

    if (!search) {
      setDiscountSearchResults(null);
      setIsSearchingDiscounts(false);
      return undefined;
    }

    if (!showOverviewDetails || activeOverviewSection !== 'discounts') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchingDiscounts(true);

      const searchRequest = token
        ? commonApi.adminDiscounts.list(token, { search, limit: 100, sort_by: 'title', sort_order: 'ASC' }).then((response) => response.data)
        : Promise.resolve(
            adminDiscounts.filter(
              (discount) =>
                discount.title.toLowerCase().includes(search.toLowerCase()) ||
                discount.code.toLowerCase().includes(search.toLowerCase())
            )
          );

      searchRequest
        .then((discounts) => setDiscountSearchResults(discounts))
        .catch(() => setDiscountSearchResults([]))
        .finally(() => setIsSearchingDiscounts(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeOverviewSection, adminDiscounts, discountSearchTerm, showOverviewDetails, token]);

  useEffect(() => {
    const search = inventorySearchTerm.trim();

    if (!search) {
      setInventorySearchResults(null);
      setIsSearchingInventory(false);
      return undefined;
    }

    if (!showOverviewDetails || activeOverviewSection !== 'inventory') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearchingInventory(true);

      const searchRequest = token
        ? commonApi.adminInventory.list(token, { search, limit: 100 }).then((response) => response.data)
        : Promise.resolve(
            inventoryItems.filter((item) =>
              (item.product_name ?? `Product ${item.product_id}`).toLowerCase().includes(search.toLowerCase())
            )
          );

      searchRequest
        .then((items) => setInventorySearchResults(items))
        .catch(() => setInventorySearchResults([]))
        .finally(() => setIsSearchingInventory(false));
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeOverviewSection, inventoryItems, inventorySearchTerm, showOverviewDetails, token]);

  const syncAfterMutation = async () => {
    const [adminReloadResult, catalogRefreshResult] = await Promise.allSettled([loadAdminData(), refreshProducts()]);

    if (adminReloadResult.status === 'rejected') {
      throw adminReloadResult.reason;
    }

    if (catalogRefreshResult.status === 'rejected') {
      setMessage(
        getErrorMessage(catalogRefreshResult.reason, 'Product was saved, but storefront catalog refresh did not finish.')
      );
    }
  };

  const buildPayload = (form: ProductFormState, existingProduct?: ProductView): CreateAdminProductInput | UpdateAdminProductInput => ({
    name: sanitizeTextOnly(form.name).trim(),
    slug: buildProductSlug(form, existingProduct),
    sku: sanitizeSku(form.sku) || existingProduct?.sku || buildSku(form.name),
    category_id: Number(form.categoryId),
    occasion: sanitizeTextOnly(form.occasion).trim() || null,
    fabric: sanitizeTextOnly(form.fabric).trim() || null,
    color: sanitizeTextOnly(form.color).trim() || null,
    blouse_included: form.blouseIncluded,
    mrp: Number(form.originalPrice || form.price),
    selling_price: Number(form.price),
    stock: Number(form.stock || 0),
    short_description: (form.source === 'offers' ? sanitizeTextOnly(form.offerTag) : sanitizeShortDescriptionText(form.shortDescription)).trim() || null,
    description: sanitizeDescriptionText(form.description).trim() || null,
    is_new_arrival: form.source === 'new-arrivals',
    status: form.status || undefined,
    images: (form.images.length ? form.images : form.image.trim() ? [form.image.trim()] : []).length
      ? (form.images.length ? form.images : [form.image.trim()]).map((image, index) => ({
          image_url: image.trim(),
          alt_text: sanitizeTextOnly(form.name).trim(),
          is_primary: index === 0,
          sort_order: index + 1
        }))
      : undefined
  });

  const validateProductForm = (form: ProductFormState): ProductFieldErrors => {
    const errors: ProductFieldErrors = {};

    if (!form.name.trim()) {
      errors.name = 'Product name is required.';
    } else if (!hasOnlyText(form.name)) {
      errors.name = 'Use letters and spaces only.';
    }

    if (!form.sku.trim()) {
      errors.sku = 'SKU is required.';
    } else if (!/^[A-Z0-9-]+$/i.test(form.sku.trim())) {
      errors.sku = 'Use letters, numbers, and hyphen only.';
    }

    if (form.slug.trim() && !/^[a-z-]+$/i.test(form.slug.trim())) {
      errors.slug = 'Use letters and hyphen only.';
    }

    if (!form.categoryId) {
      errors.categoryId = 'Category is required.';
    }

    if (form.fabric.trim() && !hasOnlyText(form.fabric)) {
      errors.fabric = 'Use letters and spaces only.';
    }

    if (!form.price || !hasValidPrice(form.price)) {
      errors.price = 'Enter a valid selling price.';
    }

    if (!form.originalPrice || !hasValidPrice(form.originalPrice)) {
      errors.originalPrice = 'Enter a valid MRP.';
    }

    if (hasValidPrice(form.price) && hasValidPrice(form.originalPrice) && Number(form.price) > Number(form.originalPrice)) {
      errors.price = 'Selling price cannot be greater than MRP.';
      errors.originalPrice = 'MRP should be greater than or equal to selling price.';
    }

    if (!form.stock.trim() || !hasValidInteger(form.stock)) {
      errors.stock = 'Enter a valid stock number.';
    }

    if (!form.images.length && !form.image.trim()) {
      errors.image = 'At least one product image is required.';
    }

    return errors;
  };

  const mapProductApiErrorToFieldErrors = (error: unknown): ProductFieldErrors => {
    const message = getErrorMessage(error, '');

    if (/sku already exists/i.test(message)) {
      return { sku: 'SKU already exists.' };
    }

    if (/slug already exists/i.test(message)) {
      return { slug: 'Slug already exists.' };
    }

    if (/category not found/i.test(message)) {
      return { categoryId: 'Choose a valid category.' };
    }

    return {};
  };

  const handleAdd = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for creating products.');
      return;
    }

    const validationErrors = validateProductForm(addForm);

    if (Object.keys(validationErrors).length > 0) {
      setAddProductErrors(validationErrors);
      setMessage('');
      return;
    }

    setAddProductErrors({});
    setIsLoading(true);

    try {
      const payload = buildPayload(addForm) as CreateAdminProductInput;
      const createdProduct = await commonApi.adminProducts.create(payload, token);
      saveProductSourceOverride(createdProduct, addForm.source);
      await syncAfterMutation();
      setAddForm((current) => ({ ...emptyForm, categoryId: current.categoryId }));
      setAddProductErrors({});
      setSelectedProductId(String(createdProduct.id));
      setMessage(`${createdProduct.name} has been created successfully.`);
      showOperationNotice('Your product added successfully.');
    } catch (error) {
      const fieldErrors = mapProductApiErrorToFieldErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        setAddProductErrors(fieldErrors);
        setMessage('');
      } else {
        setMessage(getErrorMessage(error, 'Unable to add product.'));
      }
      showOperationNotice('Unable to add product.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSelection = (id: string) => {
    setSelectedProductId(id);
    const nextProduct = productViews.find((product) => String(product.id) === id) ?? null;
    setUpdateForm(mapProductToForm(nextProduct));
    setUpdateProductErrors({});
  };

  const openProductUpdateFromOverview = (product: ProductView) => {
    setActiveAdminView('product-manager');
    setActivePanel('update');
    setShowOverviewDetails(false);
    setSelectedProductId(String(product.id));
    setUpdateForm(mapProductToForm(product));
    setUpdateProductErrors({});
  };

  const handleUpdate = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for updating products.');
      return;
    }

    if (!selectedProduct) {
      setMessage('Choose a product before updating.');
      return;
    }

    const validationErrors = validateProductForm(updateForm);

    if (Object.keys(validationErrors).length > 0) {
      setUpdateProductErrors(validationErrors);
      setMessage('');
      return;
    }

    setUpdateProductErrors({});
    setIsLoading(true);

    try {
      const payload = buildPayload(updateForm, selectedProduct) as UpdateAdminProductInput;
      const updatedProduct = await commonApi.adminProducts.update(selectedProduct.id, payload, token);
      saveProductSourceOverride(updatedProduct, updateForm.source);
      await syncAfterMutation();
      setSelectedProductId(String(updatedProduct.id));
      setMessage(`${updatedProduct.name} has been updated successfully.`);
      showOperationNotice('Your product updated successfully.');
    } catch (error) {
      const fieldErrors = mapProductApiErrorToFieldErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        setUpdateProductErrors(fieldErrors);
        setMessage('');
      } else {
        setMessage(getErrorMessage(error, 'Unable to update product.'));
      }
      showOperationNotice('Unable to update product.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductStatusToggle = async (id: number) => {
    if (!token) {
      setMessage('Please login first. Admin token is required for updating product status.');
      return;
    }

    const product = productViews.find((item) => item.id === id);

    if (!product) {
      return;
    }

    const productIsActive = product.status === 'active';

    if (productIsActive) {
      const confirmed = window.confirm(`Do you really want to deactivate ${product.name}?`);

      if (!confirmed) {
        return;
      }
    }

    setIsLoading(true);

    try {
      if (productIsActive) {
        await commonApi.adminProducts.remove(id, token);
      } else {
        await commonApi.adminProducts.update(id, { status: 'active' }, token);
      }

      await syncAfterMutation();
      setSelectedProductId('');
      setMessage(`${product.name} has been ${productIsActive ? 'deactivated' : 'activated'} successfully.`);
      showOperationNotice(`Your product ${productIsActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to update product status.'));
      showOperationNotice('Unable to update product status.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>, setForm: Dispatch<SetStateAction<ProductFormState>>) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      setForm((current) => ({
        ...current,
        image: '',
        images: []
      }));
      return;
    }

    if (files.some((file) => !file.type.startsWith('image/'))) {
      setMessage('Please choose valid image files only.');
      event.target.value = '';
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
              const result = typeof reader.result === 'string' ? reader.result : '';

              if (!result) {
                reject(new Error('Unable to read the selected image.'));
                return;
              }

              resolve(result);
            };

            reader.onerror = () => reject(new Error('Unable to read the selected image.'));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((nextImages) => {
        setForm((current) => {
          const images = [...current.images, ...nextImages];

          return {
            ...current,
            image: images[0] ?? '',
            images
          };
        });
        setMessage(`${files.length} image${files.length === 1 ? '' : 's'} ready to use for this product.`);
      })
      .catch(() => {
        setMessage('Unable to read one or more selected images.');
      });
    event.target.value = '';
  };

  const buildDiscountPayload = (
    form: DiscountFormState
  ): CreateAdminDiscountInput | UpdateAdminDiscountInput => {
    const startsAtIso = form.startsAt ? new Date(form.startsAt).toISOString() : '';
    const endsAtIso = form.endsAt ? new Date(form.endsAt).toISOString() : '';

    return {
      title: sanitizeTextOnly(form.title).trim(),
      code: normalizeCode(form.code),
      description: sanitizeDescriptionText(form.description).trim() || null,
      type: form.type,
      value: Number(form.value),
      applies_to: form.appliesTo,
      product_id: form.appliesTo === 'product' && form.productId ? Number(form.productId) : null,
      category_id: form.appliesTo === 'category' && form.categoryId ? Number(form.categoryId) : null,
      min_order_amount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      max_discount_amount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
      usage_limit: form.usageLimit ? Number(form.usageLimit) : null,
      per_user_limit: form.perUserLimit ? Number(form.perUserLimit) : null,
      is_active: form.isActive,
      starts_at: startsAtIso,
      ends_at: endsAtIso
    };
  };

  const validateDiscountForm = (form: DiscountFormState): DiscountFieldErrors => {
    const errors: DiscountFieldErrors = {};

    if (!form.title.trim()) {
      errors.title = 'Discount title is required.';
    } else if (!hasOnlyText(form.title)) {
      errors.title = 'Use letters and spaces only.';
    }

    if (!form.code.trim()) {
      errors.code = 'Coupon code is required.';
    }

    if (!form.value) {
      errors.value = 'Discount value is required.';
    } else if (!hasValidPrice(form.value)) {
      errors.value = 'Enter a valid discount value.';
    } else if (form.type === 'percentage' && Number(form.value) > 100) {
      errors.value = 'Percentage discount cannot exceed 100.';
    }

    if (form.appliesTo === 'product' && !form.productId) {
      errors.productId = 'Choose a product.';
    }

    if (form.appliesTo === 'category' && !form.categoryId) {
      errors.categoryId = 'Choose a category.';
    }

    if (!form.startsAt) {
      errors.startsAt = 'Start date is required.';
    }

    if (!form.endsAt) {
      errors.endsAt = 'End date is required.';
    }

    if (form.startsAt && form.endsAt && new Date(form.startsAt) >= new Date(form.endsAt)) {
      errors.endsAt = 'End date should be after start date.';
    }

    return errors;
  };

  const handleAddDiscount = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for creating discounts.');
      return;
    }

    const validationErrors = validateDiscountForm(addDiscountForm);

    if (Object.keys(validationErrors).length) {
      setAddDiscountErrors(validationErrors);
      setMessage('');
      return;
    }

    setAddDiscountErrors({});
    setIsLoading(true);

    try {
      const payload = buildDiscountPayload(addDiscountForm) as CreateAdminDiscountInput;
      const createdDiscount = await commonApi.adminDiscounts.create(payload, token);
      await syncAfterMutation();
      setAddDiscountForm(emptyDiscountForm);
      setSelectedDiscountId(String(createdDiscount.id));
      setMessage(`${createdDiscount.title} discount has been created successfully.`);
      showOperationNotice('Your discount added successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to add discount.'));
      showOperationNotice('Unable to add discount.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDiscountSelection = (id: string) => {
    setSelectedDiscountId(id);
    const nextDiscount = adminDiscounts.find((discount) => String(discount.id) === id) ?? null;
    setUpdateDiscountForm(mapDiscountToForm(nextDiscount));
  };

  const openDiscountUpdateFromOverview = (discount: AdminDiscount) => {
    setActiveAdminView('discount-manager');
    setActivePanel('update');
    setShowOverviewDetails(false);
    setSelectedDiscountId(String(discount.id));
    setUpdateDiscountForm(mapDiscountToForm(discount));
    setUpdateDiscountErrors({});
  };

  const handleUpdateDiscount = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for updating discounts.');
      return;
    }

    if (!selectedDiscount) {
      setMessage('Choose a discount before updating.');
      return;
    }

    const validationErrors = validateDiscountForm(updateDiscountForm);

    if (Object.keys(validationErrors).length) {
      setUpdateDiscountErrors(validationErrors);
      setMessage('');
      return;
    }

    setUpdateDiscountErrors({});
    setIsLoading(true);

    try {
      const payload = buildDiscountPayload(updateDiscountForm) as UpdateAdminDiscountInput;
      const updatedDiscount = await commonApi.adminDiscounts.update(selectedDiscount.id, payload, token);
      await syncAfterMutation();
      setSelectedDiscountId(String(updatedDiscount.id));
      setMessage(`${updatedDiscount.title} discount has been updated successfully.`);
      showOperationNotice('Your discount updated successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to update discount.'));
      showOperationNotice('Unable to update discount.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDiscount = async (id: number) => {
    if (!token) {
      setMessage('Please login first. Admin token is required for removing discounts.');
      return;
    }

    const discount = adminDiscounts.find((item) => item.id === id);

    if (!discount) {
      return;
    }

    const confirmed = window.confirm(`Do you really want to permanently remove ${discount.title}?`);

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      await commonApi.adminDiscounts.remove(id, token);
      setAdminDiscounts((current) => current.filter((item) => item.id !== id));
      await syncAfterMutation();
      setSelectedDiscountId('');
      setMessage(`${discount.title} discount has been removed successfully.`);
      showOperationNotice('Your discount removed successfully.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to remove discount.'));
      showOperationNotice('Unable to remove discount.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const buildCategoryPayload = (form: CategoryFormState): FormData => {
    const payload = new FormData();
    const categoryName = sanitizeTextOnly(form.name).trim();

    payload.append('name', categoryName);
    payload.append('slug', slugify(form.slug.trim() || categoryName));
    payload.append('description', sanitizeDescriptionText(form.description).trim());
    payload.append('is_active', String(form.isActive));

    if (form.imageFile) {
      payload.append('image', form.imageFile);
    } else if (form.imageUrl.trim()) {
      payload.append('image_url', form.imageUrl.trim());
    }

    return payload;
  };

  const validateCategoryForm = (form: CategoryFormState): CategoryFieldErrors => {
    const errors: CategoryFieldErrors = {};

    if (!form.name.trim()) {
      errors.name = 'Category name is required.';
    } else if (!hasOnlyText(form.name)) {
      errors.name = 'Use letters and spaces only.';
    }

    if (!form.imageFile && !form.imageUrl.trim()) {
      errors.image = 'Please select a category image.';
    }

    return errors;
  };

  const mapCategoryApiErrorToFieldErrors = (error: unknown): CategoryFieldErrors => {
    const message = getErrorMessage(error, '');

    if (/category name already exists/i.test(message)) {
      return { name: 'Category name already exists' };
    }

    if (/slug already exists/i.test(message)) {
      return { slug: 'Category slug already exists.' };
    }

    return {};
  };

  const normalizeCategoryName = (value: string) =>
    sanitizeTextOnly(value).trim().replace(/\s+/g, ' ').toLowerCase();

  const findDuplicateCategoryName = (name: string, excludeId?: number) => {
    const normalizedName = normalizeCategoryName(name);

    if (!normalizedName) {
      return null;
    }

    return (
      adminCategories.find(
        (category) => category.id !== excludeId && normalizeCategoryName(category.name) === normalizedName
      ) ?? null
    );
  };

  const findDuplicateCategorySlug = (slug: string, excludeId?: number) => {
    const normalizedSlug = slugify(slug);

    if (!normalizedSlug) {
      return null;
    }

    return (
      adminCategories.find(
        (category) => category.id !== excludeId && slugify(category.slug) === normalizedSlug
      ) ?? null
    );
  };


  const handleAddCategory = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for creating categories.');
      return;
    }

    const validationErrors = validateCategoryForm(addCategoryForm);

    if (Object.keys(validationErrors).length > 0) {
      setAddCategoryErrors(validationErrors);
      setMessage('');
      return;
    }

    setAddCategoryErrors({});

    const duplicateCategoryName = findDuplicateCategoryName(addCategoryForm.name);

    if (duplicateCategoryName) {
      setAddCategoryErrors({ name: 'Category name already exists' });
      setMessage('');
      return;
    }

    const duplicateCategory = findDuplicateCategorySlug(addCategoryForm.slug.trim() || addCategoryForm.name);

    if (duplicateCategory) {
      setAddCategoryErrors({ slug: 'Category slug already exists.' });
      setMessage('');
      return;
    }

    setIsLoading(true);

    try {
      const payload = buildCategoryPayload(addCategoryForm);
      const createdCategory = await commonApi.adminCategories.create(payload, token);
      await syncAfterMutation();
      window.dispatchEvent(new Event('categories:changed'));
      setAddCategoryForm(emptyCategoryForm);
      setAddCategoryErrors({});
      setSelectedCategoryId(String(createdCategory.id));
      setMessage(`${createdCategory.name} category has been created successfully.`);
      showOperationNotice('Your category added successfully.');
    } catch (error) {
      const fieldErrors = mapCategoryApiErrorToFieldErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        setAddCategoryErrors(fieldErrors);
        setMessage('');
      } else {
        setMessage(getErrorMessage(error, 'Unable to add category.'));
      }
      showOperationNotice('Unable to add category.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCategorySelection = (id: string) => {
    setSelectedCategoryId(id);
    const nextCategory = adminCategories.find((category) => String(category.id) === id) ?? null;
    setUpdateCategoryForm(mapCategoryToForm(nextCategory));
    setUpdateCategoryErrors({});
  };

  const openCategoryUpdateFromOverview = (category: Category) => {
    setActiveAdminView('category-manager');
    setActivePanel('update');
    setShowOverviewDetails(false);
    setSelectedCategoryId(String(category.id));
    setUpdateCategoryForm(mapCategoryToForm(category));
    setUpdateCategoryErrors({});
  };

  const handleUpdateCategory = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for updating categories.');
      return;
    }

    if (!selectedCategory) {
      setMessage('Choose a category before updating.');
      return;
    }

    const validationErrors = validateCategoryForm(updateCategoryForm);

    if (Object.keys(validationErrors).length > 0) {
      setUpdateCategoryErrors(validationErrors);
      setMessage('');
      return;
    }

    setUpdateCategoryErrors({});

    const duplicateCategoryName = findDuplicateCategoryName(updateCategoryForm.name, selectedCategory.id);

    if (duplicateCategoryName) {
      setUpdateCategoryErrors({ name: 'Category name already exists' });
      setMessage('');
      return;
    }

    const duplicateCategory = findDuplicateCategorySlug(
      updateCategoryForm.slug.trim() || updateCategoryForm.name,
      selectedCategory.id
    );

    if (duplicateCategory) {
      setUpdateCategoryErrors({ slug: 'Category slug already exists.' });
      setMessage('');
      return;
    }

    setIsLoading(true);

    try {
      const payload = buildCategoryPayload(updateCategoryForm);
      const updatedCategory = await commonApi.adminCategories.update(selectedCategory.id, payload, token);
      await syncAfterMutation();
      window.dispatchEvent(new Event('categories:changed'));
      setSelectedCategoryId(String(updatedCategory.id));
      setMessage(`${updatedCategory.name} category has been updated successfully.`);
      showOperationNotice('Your category updated successfully.');
    } catch (error) {
      const fieldErrors = mapCategoryApiErrorToFieldErrors(error);

      if (Object.keys(fieldErrors).length > 0) {
        setUpdateCategoryErrors(fieldErrors);
        setMessage('');
      } else {
        setMessage(getErrorMessage(error, 'Unable to update category.'));
      }
      showOperationNotice('Unable to update category.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCategory = async (id: number) => {
    if (!token) {
      setMessage('Please login first. Admin token is required for deactivating categories.');
      return;
    }

    const category = adminCategories.find((item) => item.id === id);

    if (!category) {
      return;
    }

    const categoryIsActive = isCategoryActive(category);
    const productCount = adminProducts.filter((product) => Number(product.category_id) === id).length;

    if (categoryIsActive) {
      const confirmed = window.confirm(
        productCount > 0
          ? `Do you really want to deactivate this category? This category has ${productCount} product${productCount === 1 ? '' : 's'}. Those products will also be deactivated.`
          : 'Do you really want to deactivate this category?'
      );

      if (!confirmed) {
        return;
      }
    }

    setIsLoading(true);

    try {
      if (categoryIsActive) {
        await commonApi.adminCategories.remove(id, token);
      } else {
        await commonApi.adminCategories.update(id, { is_active: true }, token);
      }

      await syncAfterMutation();
      window.dispatchEvent(new Event('categories:changed'));
      setSelectedCategoryId('');

      setMessage(`${category.name} category has been ${categoryIsActive ? 'deactivated' : 'activated'} successfully.`);
      showOperationNotice(`Your category ${categoryIsActive ? 'deactivated' : 'activated'} successfully.`);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to update category status.'));
      showOperationNotice('Unable to update category status.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateInventory = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for inventory update.');
      return;
    }

    if (!selectedInventoryProductId) {
      setMessage('Select an inventory product first.');
      return;
    }

    if (
      !hasValidInteger(inventoryForm.available_stock) ||
      !hasValidInteger(inventoryForm.reserved_stock) ||
      !hasValidInteger(inventoryForm.low_stock_threshold)
    ) {
      setMessage('Inventory values should be whole numbers only.');
      showOperationNotice('Check inventory values.', 'error');
      return;
    }

    setIsUpdatingInventory(true);

    try {
      const inventoryDetails = await commonApi.adminInventory.getByProductId(selectedInventoryProductId, token);
      setInventoryForm({
        available_stock: String(inventoryDetails.available_stock),
        reserved_stock: String(inventoryDetails.reserved_stock),
        low_stock_threshold: String(inventoryDetails.low_stock_threshold)
      });

      const payload: UpdateAdminInventoryInput = {
        available_stock: Number(inventoryForm.available_stock),
        reserved_stock: Number(inventoryForm.reserved_stock),
        low_stock_threshold: Number(inventoryForm.low_stock_threshold)
      };
      const updated = await commonApi.adminInventory.updateByProductId(selectedInventoryProductId, payload, token);
      await loadAdminData();
      setSelectedInventoryProductId(String(updated.product_id));
      setMessage(`Inventory updated for ${updated.product_name ?? updated.product_id}.`);
      showOperationNotice('Your inventory updated successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update inventory.');
      showOperationNotice('Unable to update inventory.', 'error');
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  const openInventoryUpdateFromOverview = (item: AdminInventoryItem) => {
    setActiveAdminView('inventory-manager');
    setActivePanel(null);
    setShowOverviewDetails(false);
    setSelectedInventoryProductId(String(item.product_id));
    setInventoryForm({
      available_stock: String(item.available_stock),
      reserved_stock: String(item.reserved_stock),
      low_stock_threshold: String(item.low_stock_threshold)
    });
  };

  const handleAdjustInventory = async () => {
    if (!token) {
      setMessage('Please login first. Admin token is required for inventory adjustment.');
      return;
    }

    if (!inventoryAdjustForm.product_id || !inventoryAdjustForm.quantity) {
      setMessage('Select product and enter quantity for inventory adjustment.');
      return;
    }

    if (
      !hasValidInteger(inventoryAdjustForm.quantity, 1) ||
      (inventoryAdjustForm.low_stock_threshold && !hasValidInteger(inventoryAdjustForm.low_stock_threshold))
    ) {
      setMessage('Inventory adjustment values should be whole numbers only.');
      showOperationNotice('Check inventory adjustment values.', 'error');
      return;
    }

    setIsAdjustingInventory(true);

    try {
      const adjusted = await commonApi.adminInventory.adjust(
        {
          product_id: Number(inventoryAdjustForm.product_id),
          adjustment_type: inventoryAdjustForm.adjustment_type as 'increase' | 'decrease' | 'set' | 'reserve' | 'release',
          quantity: Number(inventoryAdjustForm.quantity),
          low_stock_threshold: inventoryAdjustForm.low_stock_threshold ? Number(inventoryAdjustForm.low_stock_threshold) : undefined,
          note: inventoryAdjustForm.note.trim() || null
        },
        token
      );

      await loadAdminData();
      setSelectedInventoryProductId(String(adjusted.product_id));
      setInventoryAdjustForm((current) => ({
        ...current,
        quantity: '',
        low_stock_threshold: '',
        note: ''
      }));
      setMessage(`Inventory adjusted for ${adjusted.product_name ?? adjusted.product_id}.`);
      showOperationNotice('Your inventory adjusted successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to adjust inventory.');
      showOperationNotice('Unable to adjust inventory.', 'error');
    } finally {
      setIsAdjustingInventory(false);
    }
  };

  const renderForm = (
    form: ProductFormState,
    setForm: Dispatch<SetStateAction<ProductFormState>>,
    fieldErrors: ProductFieldErrors,
    setFieldErrors: Dispatch<SetStateAction<ProductFieldErrors>>,
    actionLabel: string,
    action: () => void
  ) => {
    const inputClassName =
      'mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none';
    const selectClassName =
      'mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none';
    const errorInputClassName = 'border-red-500 bg-red-50';
    const requiredFieldKeys = new Set(['name', 'sku', 'price', 'originalPrice', 'stock']);
    const requiredMark = <span className="text-red-600">*</span>;
    const occasionOptions = ['Wedding', 'Casual Wear', 'Party Wear', 'Festival'];
    const textOnlyProductFields = ['name', 'occasion', 'fabric', 'color', 'offerTag'];
    const productImageInputId = `${actionLabel.toLowerCase().replace(/\s+/g, '-')}-product-image-input`;
    const productPlaceholders: Record<string, string> = {
      name: 'Enter product name',
      sku: 'SKU-PRODUCT-001',
      fabric: 'Enter fabric',
      color: 'Enter color',
      price: 'Enter selling price',
      originalPrice: 'Enter MRP',
      shortDescription: 'Enter short description',
      offerTag: 'Enter offer label',
      description: 'Enter product description',
      stock: 'Enter stock quantity'
    };
    const sanitizeProductField = (key: string, value: string) => {
      if (key === 'price' || key === 'originalPrice') return sanitizePriceInput(value);
      if (key === 'stock') return sanitizeIntegerInput(value);
      if (key === 'sku') return sanitizeSku(value);
      if (key === 'slug') return value.toLowerCase().replace(/[^a-z-]/g, '');
      if (key === 'shortDescription') return sanitizeShortDescriptionText(value);
      if (key === 'description') return sanitizeDescriptionText(value);
      if (textOnlyProductFields.includes(key)) {
        return sanitizeTextOnly(value);
      }

      return value;
    };
    const setProductValue = (key: string, value: string) => {
      const nextValue = sanitizeProductField(key, value);
      const fieldKey = key as keyof ProductFieldErrors;

      setFieldErrors((current) => {
        const next = { ...current };

        if (nextValue !== value && textOnlyProductFields.includes(key)) {
          next[fieldKey] = 'Only letters and spaces are allowed.';
        } else if (key === 'shortDescription' && nextValue !== value) {
          next[fieldKey] = 'Only letters, spaces, commas, and full stops are allowed.';
        } else if (key === 'description' && nextValue !== value) {
          next[fieldKey] = 'Only letters, numbers, spaces, and basic punctuation are allowed.';
        } else if ((key === 'price' || key === 'originalPrice') && nextValue !== value) {
          next[fieldKey] = 'Only valid price numbers are allowed.';
        } else if (key === 'stock' && nextValue !== value) {
          next[fieldKey] = 'Only whole numbers are allowed.';
        } else if (key === 'sku' && nextValue !== value) {
          next[fieldKey] = 'Only letters, numbers, and hyphen are allowed.';
        } else if (key === 'slug' && nextValue !== value) {
          next[fieldKey] = 'Only letters and hyphen are allowed.';
        } else if (next[fieldKey]) {
          delete next[fieldKey];
        }

        return next;
      });

      setForm((current) => ({
        ...current,
        [key]: nextValue
      }));
    };
    const clearFieldError = (field: keyof ProductFieldErrors) => {
      setFieldErrors((current) => {
        if (!current[field]) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
    };
    const visibleFields = [
      { key: 'name', label: 'Product Name', type: 'text' },
      { key: 'sku', label: 'SKU', type: 'text' },
      { key: 'occasion', label: 'Occasion', type: 'select' },
      { key: 'fabric', label: 'Fabric', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'price', label: 'Selling Price', type: 'number' },
      { key: 'originalPrice', label: 'MRP', type: 'number' },
      { key: 'shortDescription', label: 'Short Description', type: 'textarea', hidden: form.source === 'offers' },
      { key: 'offerTag', label: 'Offer Label', type: 'text', hidden: form.source !== 'offers' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'stock', label: 'Stock', type: 'number' }
    ].filter((field) => !field.hidden);

    return (
      <div className="page-card mx-auto max-w-5xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {visibleFields.map((field) => (
            <label
              key={field.key}
              className={`text-sm font-semibold text-ink/70 ${field.type === 'textarea' ? 'md:col-span-2' : ''}`}
            >
              {field.label} {requiredFieldKeys.has(field.key) ? requiredMark : null}
              {field.type === 'textarea' ? (
                <textarea
                  rows={4}
                  placeholder={productPlaceholders[field.key]}
                  value={String(form[field.key as keyof ProductFormState])}
                  onChange={(event) => {
                    setProductValue(field.key, event.target.value);
                  }}
                  className={`${inputClassName} min-h-28 resize-y ${
                    fieldErrors[field.key as keyof ProductFieldErrors] ? errorInputClassName : ''
                  }`}
                />
              ) : field.type === 'select' ? (
                <select
                  value={String(form[field.key as keyof ProductFormState])}
                  onChange={(event) => {
                    setProductValue(field.key, event.target.value);
                  }}
                  className={`${selectClassName} ${
                    fieldErrors[field.key as keyof ProductFieldErrors] ? errorInputClassName : ''
                  }`}
                >
                  <option value="">Select occasion</option>
                  {occasionOptions.map((occasion) => (
                    <option key={occasion} value={occasion}>
                      {occasion}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type}
                  placeholder={productPlaceholders[field.key]}
                  value={String(form[field.key as keyof ProductFormState])}
                  onChange={(event) => {
                    setProductValue(field.key, event.target.value);
                  }}
                  onWheel={(event) => {
                    if (field.type === 'number') {
                      event.currentTarget.blur();
                    }
                  }}
                  className={`${inputClassName} ${
                    fieldErrors[field.key as keyof ProductFieldErrors] ? errorInputClassName : ''
                  }`}
                />
              )}
              {fieldErrors[field.key as keyof ProductFieldErrors] ? (
                <p className="mt-1 text-xs font-semibold text-red-600">
                  {fieldErrors[field.key as keyof ProductFieldErrors]}
                </p>
              ) : null}
            </label>
          ))}

          <label className="w-full text-sm font-semibold text-ink/70 md:max-w-[20rem] md:justify-self-start">
            Category {requiredMark}
            <select
              value={form.categoryId}
              onChange={(event) => {
                clearFieldError('categoryId');
                setForm((current) => ({
                  ...current,
                  categoryId: event.target.value
                }));
              }}
              className={`${selectClassName} ${
                fieldErrors.categoryId ? errorInputClassName : ''
              }`}
            >
              <option value="">Select category</option>
              {adminCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
                ))}
            </select>
            {fieldErrors.categoryId ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.categoryId}</p> : null}
          </label>

          <label className="w-full text-sm font-semibold text-ink/70 md:max-w-[20rem] md:justify-self-start">
            Product Type
            <select
              value={form.source}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  source: event.target.value as ProductFormState['source']
                }))
              }
              className={selectClassName}
            >
              <option value="">Select product type</option>
              <option value="category">Category</option>
              <option value="collection">Collection</option>
              <option value="new-arrivals">New Arrival</option>
            </select>
          </label>

          <label className="w-full text-sm font-semibold text-ink/70 md:max-w-[20rem] md:justify-self-start">
            Status
            <select
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as ProductFormState['status']
                }))
              }
              className={selectClassName}
            >
              <option value="">Select status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <label className="flex min-h-12 items-center gap-3 rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm font-semibold text-ink/70 md:max-w-[20rem] md:justify-self-start">
            <input
              type="checkbox"
              checked={form.blouseIncluded}
              onChange={(event) => setForm((current) => ({ ...current, blouseIncluded: event.target.checked }))}
              className="h-4 w-4 accent-[#7f3150]"
            />
            Blouse Included
          </label>

          <div className="text-sm font-semibold text-ink/70 md:col-span-2">
            <p>Upload Product Image {requiredMark}</p>
            <input
              id={productImageInputId}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                clearFieldError('image');
                handleImageUpload(event, setForm);
              }}
              className="hidden"
            />
            <div
              className={`mt-2 flex min-h-12 w-full items-center gap-3 rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] ${
                fieldErrors.image ? errorInputClassName : ''
              }`}
            >
              <label
                htmlFor={productImageInputId}
                className="cursor-pointer rounded-full bg-[#7f3150] px-4 py-2 text-sm font-semibold text-white"
              >
                Choose Files
              </label>
              <span className="font-normal text-ink/56">
                {form.images.length ? `${form.images.length} file${form.images.length === 1 ? '' : 's'} selected` : 'No file chosen'}
              </span>
            </div>
            <span className="mt-2 block text-xs font-medium text-ink/56">
              Choose multiple product images. The first selected image will be used as the primary product image.
            </span>
            {fieldErrors.image ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.image}</p> : null}
          </div>
        </div>

        {(form.images.length || form.image) ? (
          <div className="mt-5 rounded-[1.4rem] border border-[#ead7ce] bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/48">Image Preview</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {(form.images.length ? form.images : [form.image]).map((image, index) => (
                <div key={`${image}-${index}`} className="relative rounded-[1.2rem] border border-[#ead7ce] bg-white/80 p-2">
                  <img src={image} alt={`Selected product preview ${index + 1}`} className="h-44 w-full rounded-[1rem] object-cover" />
                  <span className="mt-2 block text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/52">
                    {index === 0 ? 'Primary' : `Image ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => {
                        const images = (current.images.length ? current.images : [current.image]).filter((_, imageIndex) => imageIndex !== index);

                        return {
                          ...current,
                          image: images[0] ?? '',
                          images
                        };
                      })
                    }
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-[#a13f45] shadow"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={isLoading}
          onClick={action}
          className="liquid-btn mt-6 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Please wait...' : actionLabel}
        </button>
      </div>
    );
  };

  const renderDiscountForm = (
    form: DiscountFormState,
    setForm: Dispatch<SetStateAction<DiscountFormState>>,
    fieldErrors: DiscountFieldErrors,
    setFieldErrors: Dispatch<SetStateAction<DiscountFieldErrors>>,
    actionLabel: string,
    action: () => void
  ) => {
    const clearFieldError = (field: keyof DiscountFieldErrors) => {
      setFieldErrors((current) => {
        if (!current[field]) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
    };
    const requiredMark = <span className="text-red-600">*</span>;

    return (
      <div className="page-card p-5 sm:p-6">
        <div className="grid items-start gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
          <label className={adminFieldClassName}>
            Discount Title {requiredMark}
            <input
              type="text"
              placeholder="Enter discount title"
              value={form.title}
              onChange={(event) => {
                clearFieldError('title');
                setForm((current) => ({ ...current, title: sanitizeTextOnly(event.target.value) }));
              }}
              className={adminControlClassName}
            />
            {fieldErrors.title ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.title}</p> : null}
          </label>

          <label className={adminFieldClassName}>
            Coupon Code {requiredMark}
            <input
              type="text"
              placeholder="DISCOUNT2026"
              value={form.code}
              onChange={(event) => {
                clearFieldError('code');
                setForm((current) => ({
                  ...current,
                  code: normalizeCode(event.target.value)
                }));
              }}
              className={adminControlClassName}
            />
            {fieldErrors.code ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.code}</p> : null}
          </label>

          <label className={adminFieldClassName}>
            Discount Type
            <select
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as DiscountFormState['type']
                }))
              }
              className={adminSelectClassName}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </label>

          <label className={adminFieldClassName}>
            Value {requiredMark}
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter discount value"
              value={form.value}
              onChange={(event) => {
                clearFieldError('value');
                setForm((current) => ({ ...current, value: sanitizePriceInput(event.target.value) }));
              }}
              className={adminControlClassName}
            />
            {fieldErrors.value ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.value}</p> : null}
          </label>

          <label className={adminFieldClassName}>
            Applies To
            <select
              value={form.appliesTo}
              onChange={(event) => {
                clearFieldError('productId');
                clearFieldError('categoryId');
                setForm((current) => ({
                  ...current,
                  appliesTo: event.target.value as DiscountFormState['appliesTo'],
                  productId: event.target.value === 'product' ? current.productId : '',
                  categoryId: event.target.value === 'category' ? current.categoryId : ''
                }));
              }}
              className={adminSelectClassName}
            >
              <option value="all">All Products</option>
              <option value="product">Single Product</option>
              <option value="category">Single Category</option>
            </select>
          </label>

          {form.appliesTo === 'product' ? (
            <label className={adminFieldClassName}>
              Product {requiredMark}
              <select
                value={form.productId}
                onChange={(event) => {
                  clearFieldError('productId');
                  setForm((current) => ({ ...current, productId: event.target.value }));
                }}
                className={adminSelectClassName}
              >
                <option value="">Select product</option>
                {productViews.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              {fieldErrors.productId ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.productId}</p> : null}
            </label>
          ) : null}

          {form.appliesTo === 'category' ? (
            <label className={adminFieldClassName}>
              Category {requiredMark}
              <select
                value={form.categoryId}
                onChange={(event) => {
                  clearFieldError('categoryId');
                  setForm((current) => ({ ...current, categoryId: event.target.value }));
                }}
                className={adminSelectClassName}
              >
                <option value="">Select category</option>
                {adminCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.categoryId}</p> : null}
            </label>
          ) : null}

          <label className={adminFieldClassName}>
            Minimum Order Amount
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter minimum order amount"
              value={form.minOrderAmount}
              onChange={(event) => setForm((current) => ({ ...current, minOrderAmount: sanitizePriceInput(event.target.value) }))}
              className={adminControlClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            Maximum Discount Amount
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter maximum discount amount"
              value={form.maxDiscountAmount}
              onChange={(event) => setForm((current) => ({ ...current, maxDiscountAmount: sanitizePriceInput(event.target.value) }))}
              className={adminControlClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            Usage Limit
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Enter usage limit"
              value={form.usageLimit}
              onChange={(event) => setForm((current) => ({ ...current, usageLimit: sanitizeIntegerInput(event.target.value) }))}
              className={adminControlClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            Per User Limit
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Enter per user limit"
              value={form.perUserLimit}
              onChange={(event) => setForm((current) => ({ ...current, perUserLimit: sanitizeIntegerInput(event.target.value) }))}
              className={adminControlClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            Starts At {requiredMark}
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(event) => {
                clearFieldError('startsAt');
                clearFieldError('endsAt');
                setForm((current) => ({ ...current, startsAt: event.target.value }));
              }}
              className={adminControlClassName}
            />
            {fieldErrors.startsAt ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.startsAt}</p> : null}
          </label>

          <label className={adminFieldClassName}>
            Ends At {requiredMark}
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(event) => {
                clearFieldError('endsAt');
                setForm((current) => ({ ...current, endsAt: event.target.value }));
              }}
              className={adminControlClassName}
            />
            {fieldErrors.endsAt ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.endsAt}</p> : null}
          </label>

          <label className={`${adminCheckboxClassName} mt-6`}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 accent-[#7f3150]"
            />
            Keep this discount active
          </label>

          <label className={`${adminFieldClassName} md:col-span-2 xl:col-span-3`}>
            Description
            <textarea
              rows={3}
              placeholder="Enter discount description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: sanitizeDescriptionText(event.target.value) }))}
              className={adminTextareaClassName}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={action}
          className="liquid-btn mt-6 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Please wait...' : actionLabel}
        </button>
      </div>
    );
  };

  const renderCategoryForm = (
    form: CategoryFormState,
    setForm: Dispatch<SetStateAction<CategoryFormState>>,
    fieldErrors: CategoryFieldErrors,
    setFieldErrors: Dispatch<SetStateAction<CategoryFieldErrors>>,
    actionLabel: string,
    action: () => void
  ) => {
    const inputClassName =
      'mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none';
    const errorInputClassName = 'border-red-500 bg-red-50';
    const requiredMark = <span className="text-red-600">*</span>;
    const categoryImageInputId = `${actionLabel.toLowerCase().replace(/\s+/g, '-')}-category-image-input`;
    const excludedCategoryId = actionLabel === 'Update Category' ? selectedCategory?.id : undefined;
    const hasDuplicateCategoryName = Boolean(findDuplicateCategoryName(form.name, excludedCategoryId));
    const clearFieldError = (field: keyof CategoryFieldErrors) => {
      setFieldErrors((current) => {
        if (!current[field]) {
          return current;
        }

        const next = { ...current };
        delete next[field];
        return next;
      });
    };

    return (
      <div className="page-card mx-auto max-w-5xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-ink/70">
            Category Name {requiredMark}
            <input
              type="text"
              placeholder="Enter category name"
              value={form.name}
              onChange={(event) => {
                const name = sanitizeTextOnly(event.target.value);
                const duplicateCategory = findDuplicateCategoryName(name, excludedCategoryId);

                setFieldErrors((current) => {
                  const next = { ...current };

                  if (duplicateCategory) {
                    next.name = 'Category name already exists';
                  } else {
                    delete next.name;
                  }

                  return next;
                });

                setForm((current) => ({
                  ...current,
                  name,
                  slug: current.slug ? current.slug : slugify(name)
                }));
              }}
              className={`mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none md:max-w-[21rem] ${
                fieldErrors.name ? errorInputClassName : ''
              }`}
            />
            {fieldErrors.name ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.name}</p> : null}
          </label>

          <label className="text-sm font-semibold text-ink/70 md:col-span-2">
            Description
            <textarea
              rows={4}
              placeholder="Enter category description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: sanitizeDescriptionText(event.target.value) }))}
              className={`${inputClassName} min-h-28 resize-y`}
            />
          </label>

          <div className="text-sm font-semibold text-ink/70">
            <p>Upload Image {requiredMark}</p>
            <input
              id={categoryImageInputId}
              type="file"
              accept="image/*"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] ?? null;
                clearFieldError('image');

                setForm((current) => {
                  if (!file) {
                    return {
                      ...current,
                      imageFile: null,
                      imagePreviewUrl: '',
                      imageUrl: ''
                    };
                  }

                  if (current.imagePreviewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(current.imagePreviewUrl);
                  }

                  return {
                    ...current,
                    imageFile: file,
                    imagePreviewUrl: URL.createObjectURL(file)
                  };
                });
              }}
              className="hidden"
            />
            <div
              className={`${inputClassName} flex min-h-12 items-center gap-3 ${
                fieldErrors.image ? errorInputClassName : ''
              }`}
            >
              <label
                htmlFor={categoryImageInputId}
                className="cursor-pointer rounded-full bg-wine px-4 py-2 text-sm font-semibold text-white"
              >
                Choose File
              </label>
              <span className="font-normal text-ink/56">{form.imageFile ? '1 file selected' : 'No file chosen'}</span>
            </div>
            {fieldErrors.image ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.image}</p> : null}
          </div>

          <label className="mt-7 flex min-h-12 w-full max-w-[18rem] items-center gap-3 rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm font-semibold text-ink/70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 accent-[#7f3150]"
            />
            Keep this category active
          </label>
        </div>

        {(form.imagePreviewUrl || form.imageUrl) ? (
          <div className="mt-5 rounded-[1.4rem] border border-[#ead7ce] bg-white/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/48">Category Preview</p>
            <img
              src={form.imagePreviewUrl || form.imageUrl}
              alt="Selected category preview"
              className="mt-3 h-48 w-36 rounded-[1.2rem] object-cover"
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={isLoading || hasDuplicateCategoryName}
          onClick={action}
          className="liquid-btn mt-6 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? 'Please wait...' : actionLabel}
        </button>
      </div>
    );
  };

  const renderOverviewDetails = () => {
    const tableWrapClassName = 'overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70 shadow-[0_18px_40px_rgba(111,72,61,0.08)]';
    const tableClassName = 'min-w-full divide-y divide-[#ead7ce] text-left text-sm';
    const tableHeadClassName = 'bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54';
    const tableHeadCellClassName = 'px-4 py-3';
    const tableCellClassName = 'px-4 py-3 align-middle text-ink/68';
    const numericHeadCellClassName = `${tableHeadCellClassName} text-center`;
    const numericCellClassName = `${tableCellClassName} text-center tabular-nums`;
    const actionHeadCellClassName = `${tableHeadCellClassName} min-w-[12rem] text-center`;
    const actionCellClassName = `${tableCellClassName} min-w-[12rem] text-center`;
    const thumbnailClassName = 'h-14 w-14 rounded-lg object-cover';
    const noImageClassName = 'flex h-14 w-14 items-center justify-center rounded-lg bg-[#f8efe7] text-[10px] font-semibold text-ink/42';

    if (activeOverviewSection === 'orders') {
      const heading =
        activeOverviewFilter === 'placed-orders'
          ? 'Placed order details'
          : activeOverviewFilter === 'processing-orders'
            ? 'Processing order details'
            : activeOverviewFilter === 'shipped-orders'
              ? 'Dispatched order details'
              : activeOverviewFilter === 'delivered-orders'
                ? 'Delivered order details'
                : activeOverviewFilter === 'cancelled-orders'
                  ? 'Cancelled order details'
                  : activeOverviewFilter === 'total-revenue'
                    ? 'Revenue order details'
                    : 'Total order details';

      return (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="page-eyebrow">Order Management</p>
              <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
            </div>
            <label className="text-sm font-semibold text-ink/70">
              Search Orders
              <span className="relative mt-2 block w-full lg:w-[28rem]">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" aria-hidden="true">
                  <path
                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <input
                  type="search"
                  value={adminOrderSearchTerm}
                  onChange={(event) => setAdminOrderSearchTerm(event.target.value)}
                  placeholder="Search order id, number, customer, phone"
                  className="h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 pl-9 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10"
                />
              </span>
            </label>
          </div>
          {isLoadingAdminOrders ? (
            <p className="page-card p-5 text-sm text-ink/60">Loading order data...</p>
          ) : adminOrders.length ? (
            <div className={tableWrapClassName}>
              <div className="overflow-x-auto">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeadCellClassName}>Order</th>
                      <th className={tableHeadCellClassName}>Customer</th>
                      <th className={tableHeadCellClassName}>Status</th>
                      <th className={tableHeadCellClassName}>Payment</th>
                      <th className={numericHeadCellClassName}>Items</th>
                      <th className={numericHeadCellClassName}>Total</th>
                      <th className={tableHeadCellClassName}>Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {adminOrders.map((order) => (
                      <tr key={order.id}>
                        <td className={`${tableCellClassName} font-semibold text-wine`}>
                          {order.order_number ?? `Order #${String(order.id)}`}
                        </td>
                        <td className={tableCellClassName}>
                          <p className="font-semibold text-[#4a2a2c]">{order.customer_name ?? 'Customer'}</p>
                          {order.customer_email ? <p className="mt-1 text-xs text-ink/52">{order.customer_email}</p> : null}
                          {order.customer_phone ? <p className="mt-1 text-xs text-ink/52">{order.customer_phone}</p> : null}
                        </td>
                        <td className={tableCellClassName}>
                          <span className="rounded-full bg-[#f3e7df] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f3150]">
                            {order.order_status ?? 'placed'}
                          </span>
                        </td>
                        <td className={tableCellClassName}>{order.payment_status ?? order.payment_method ?? 'pending'}</td>
                        <td className={numericCellClassName}>{Array.isArray(order.items) ? order.items.length : 0}</td>
                        <td className={`${numericCellClassName} font-semibold text-[#4a2a2c]`}>
                          {formatAdminCurrency(order.total_amount ?? 0)}
                        </td>
                        <td className={tableCellClassName}>
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="page-card p-5 text-sm text-ink/60">No orders found for this selection.</p>
          )}
        </section>
      );
    }

    if (activeOverviewSection === 'categories') {
      const categorySearch = categorySearchTerm.trim().toLowerCase();
      const filteredCategories = adminCategories
        .filter((category) => {
          if (activeOverviewFilter === 'active-categories') return isCategoryActive(category);
          if (activeOverviewFilter === 'inactive-categories') return !isCategoryActive(category);

          return true;
        })
        .filter((category) => {
          if (!categorySearch) return true;

          return (
            category.name.toLowerCase().includes(categorySearch) ||
            category.slug.toLowerCase().includes(categorySearch) ||
            (category.description ?? '').toLowerCase().includes(categorySearch)
          );
        })
        .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
      const heading =
        activeOverviewFilter === 'active-categories'
          ? 'Active category details'
          : activeOverviewFilter === 'inactive-categories'
            ? 'Inactive category details'
            : 'Category details';

      return (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="page-eyebrow">Overall Categories</p>
              <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
            </div>
            <label className="text-sm font-semibold text-ink/70">
              Search Categories
              <span className="relative mt-2 block w-full lg:w-[28rem]">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" aria-hidden="true">
                  <path
                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <input
                  type="search"
                  value={categorySearchTerm}
                  onChange={(event) => setCategorySearchTerm(event.target.value)}
                  placeholder="Search category name"
                  className="h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 pl-9 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10"
                />
              </span>
            </label>
          </div>
          {filteredCategories.length ? (
            <div className={tableWrapClassName}>
              <div className="overflow-x-auto">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeadCellClassName}>Category</th>
                      <th className={tableHeadCellClassName}>Slug</th>
                      <th className={tableHeadCellClassName}>Status</th>
                      <th className={tableHeadCellClassName}>Image</th>
                      <th className={tableHeadCellClassName}>Description</th>
                      <th className={actionHeadCellClassName}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {filteredCategories.map((category) => {
                      const imageUrl = getCategoryImageUrl(category);
                      const active = isCategoryActive(category);
                      const description = category.description?.trim() || 'No description added.';
                      const isDescriptionExpanded = expandedCategoryDescriptionIds.includes(category.id);
                      const shouldToggleDescription = description.length > 90;

                      return (
                        <tr key={category.id}>
                          <td className={`${tableCellClassName} font-semibold text-wine`}>{category.name}</td>
                          <td className={tableCellClassName}>{category.slug}</td>
                          <td className={tableCellClassName}>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                active ? 'bg-[#e4f4e6] text-[#2f7a45]' : 'bg-[#f7e5d7] text-[#a05a3d]'
                              }`}
                            >
                              {active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className={tableCellClassName}>
                            {imageUrl ? (
                              <img src={imageUrl} alt={category.name} className={thumbnailClassName} />
                            ) : (
                              <span className={noImageClassName}>No image</span>
                            )}
                          </td>
                          <td className={`${tableCellClassName} max-w-md`}>
                            <span className={isDescriptionExpanded ? 'block' : 'line-clamp-2'}>{description}</span>
                            {shouldToggleDescription ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCategoryDescriptionIds((current) =>
                                    current.includes(category.id)
                                      ? current.filter((id) => id !== category.id)
                                      : [...current, category.id]
                                  )
                                }
                                className="mt-1 text-xs font-semibold text-wine underline-offset-2 hover:underline"
                              >
                                {isDescriptionExpanded ? 'See less' : 'See more'}
                              </button>
                            ) : null}
                          </td>
                          <td className={actionCellClassName}>
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openCategoryUpdateFromOverview(category)}
                                className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#682640]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveCategory(category.id)}
                                className="rounded-full border border-[#d99b8c] bg-white/75 px-4 py-2 text-xs font-semibold text-[#a13f45] transition hover:bg-[#fff3ef]"
                              >
                                {isCategoryActive(category) ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="page-card p-5 text-sm text-ink/60">No categories found for this selection.</p>
          )}
        </section>
      );
    }

    if (activeOverviewSection === 'discounts') {
      const filteredDiscounts = (discountSearchResults ?? adminDiscounts)
        .filter((discount) => {
          if (activeOverviewFilter === 'active-discounts') return discount.is_active;
          if (activeOverviewFilter === 'product-discounts') return discount.applies_to === 'product';
          if (activeOverviewFilter === 'category-discounts') return discount.applies_to === 'category';

          return true;
        })
        .sort((first, second) => first.title.localeCompare(second.title, undefined, { sensitivity: 'base' }));
      const heading =
        activeOverviewFilter === 'active-discounts'
          ? 'Active discount details'
          : activeOverviewFilter === 'product-discounts'
            ? 'Product offer details'
            : activeOverviewFilter === 'category-discounts'
              ? 'Category offer details'
              : 'Discount details';

      return (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="page-eyebrow">Overall Discounts</p>
              <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
            </div>
            <label className="text-sm font-semibold text-ink/70">
              Search Discounts
              <span className="relative mt-2 block w-full lg:w-[28rem]">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" aria-hidden="true">
                  <path
                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <input
                  type="search"
                  value={discountSearchTerm}
                  onChange={(event) => setDiscountSearchTerm(event.target.value)}
                  placeholder="Search discount"
                  className="h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 pl-9 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10"
                />
              </span>
            </label>
          </div>
          {isSearchingDiscounts ? <p className="text-xs font-semibold text-ink/48 lg:text-right">Searching discounts...</p> : null}
          {filteredDiscounts.length ? (
            <div className={tableWrapClassName}>
              <div className="overflow-x-auto">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeadCellClassName}>Discount</th>
                      <th className={tableHeadCellClassName}>Code</th>
                      <th className={tableHeadCellClassName}>Value</th>
                      <th className={tableHeadCellClassName}>Scope</th>
                      <th className={tableHeadCellClassName}>Applies To</th>
                      <th className={tableHeadCellClassName}>Status</th>
                      <th className={actionHeadCellClassName}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {filteredDiscounts.map((discount) => {
                      const relatedProduct = discount.product_id ? productViews.find((product) => product.id === discount.product_id) : null;
                      const relatedCategory = discount.category_id ? adminCategories.find((category) => category.id === discount.category_id) : null;

                      return (
                        <tr key={discount.id}>
                          <td className={`${tableCellClassName} font-semibold text-wine`}>{discount.title}</td>
                          <td className={`${tableCellClassName} font-semibold uppercase tracking-[0.08em]`}>{discount.code}</td>
                          <td className={tableCellClassName}>
                            {discount.type === 'percentage' ? `${discount.value}%` : `Rs. ${Number(discount.value).toLocaleString('en-IN')}`}
                          </td>
                          <td className={`${tableCellClassName} capitalize`}>{discount.applies_to}</td>
                          <td className={tableCellClassName}>{relatedProduct?.name ?? relatedCategory?.name ?? 'All products'}</td>
                          <td className={tableCellClassName}>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                discount.is_active ? 'bg-[#e4f4e6] text-[#2f7a45]' : 'bg-[#f7e5d7] text-[#a05a3d]'
                              }`}
                            >
                              {discount.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className={actionCellClassName}>
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openDiscountUpdateFromOverview(discount)}
                                className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#682640]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleRemoveDiscount(discount.id)}
                                className="rounded-full border border-[#d99b8c] bg-white/75 px-4 py-2 text-xs font-semibold text-[#a13f45] transition hover:bg-[#fff3ef]"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="page-card p-5 text-sm text-ink/60">No discounts found for this selection.</p>
          )}
        </section>
      );
    }

    if (activeOverviewSection === 'inventory') {
      const filteredInventoryItems = (inventorySearchResults ?? (activeOverviewFilter === 'low-stock' ? sortedLowStockItems : sortedInventoryItems))
        .filter((item) => (activeOverviewFilter === 'low-stock' ? item.stock_status === 'low_stock' : true))
        .sort((first, second) =>
          (first.product_name ?? `Product ${first.product_id}`).localeCompare(second.product_name ?? `Product ${second.product_id}`, undefined, {
            sensitivity: 'base'
          })
        );
      const heading = activeOverviewFilter === 'low-stock' ? 'Low stock product details' : 'Inventory product details';

      return (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="page-eyebrow">Overall Inventory</p>
              <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
            </div>
            <label className="text-sm font-semibold text-ink/70">
              Search Inventory
              <span className="relative mt-2 block w-full lg:w-[28rem]">
                <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" aria-hidden="true">
                  <path
                    d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
                <input
                  type="search"
                  value={inventorySearchTerm}
                  onChange={(event) => setInventorySearchTerm(event.target.value)}
                  placeholder="Search product name"
                  className="h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 pl-9 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10"
                />
              </span>
            </label>
          </div>
          {isSearchingInventory ? <p className="text-xs font-semibold text-ink/48 lg:text-right">Searching inventory...</p> : null}
          {filteredInventoryItems.length ? (
            <div className={tableWrapClassName}>
              <div className="overflow-x-auto">
                <table className={tableClassName}>
                  <thead className={tableHeadClassName}>
                    <tr>
                      <th className={tableHeadCellClassName}>Product</th>
                      <th className={numericHeadCellClassName}>Available</th>
                      <th className={numericHeadCellClassName}>Reserved</th>
                      <th className={numericHeadCellClassName}>Threshold</th>
                      <th className={tableHeadCellClassName}>Image</th>
                      <th className={actionHeadCellClassName}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                    {filteredInventoryItems.map((item) => {
                      const relatedProduct = productViews.find((product) => product.id === item.product_id);
                      const productName = item.product_name ?? relatedProduct?.name ?? `Product ${item.product_id}`;
                      const relatedProductIsActive = relatedProduct?.status === 'active';

                      return (
                        <tr key={item.product_id}>
                          <td className={`${tableCellClassName} font-semibold text-wine`}>{productName}</td>
                          <td className={numericCellClassName}>{item.available_stock}</td>
                          <td className={numericCellClassName}>{item.reserved_stock}</td>
                          <td className={numericCellClassName}>{item.low_stock_threshold}</td>
                          <td className={tableCellClassName}>
                            {relatedProduct?.image ? (
                              <img src={relatedProduct.image} alt={productName} className={thumbnailClassName} />
                            ) : (
                              <span className={noImageClassName}>No image</span>
                            )}
                          </td>
                          <td className={actionCellClassName}>
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => openInventoryUpdateFromOverview(item)}
                                className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#682640]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleProductStatusToggle(item.product_id)}
                                className="rounded-full border border-[#d99b8c] bg-white/75 px-4 py-2 text-xs font-semibold text-[#a13f45] transition hover:bg-[#fff3ef]"
                              >
                                {relatedProductIsActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="page-card p-5 text-sm text-ink/60">No inventory records found for this selection.</p>
          )}
        </section>
      );
    }

    const filteredProducts = searchedProductViews
      .filter((product) => {
        if (activeOverviewFilter === 'collections') return isCollectionProduct(product);
        if (activeOverviewFilter === 'new-arrivals') return product.source === 'new-arrivals';
        if (activeOverviewFilter === 'offers') return isOfferProduct(product.raw);

        return true;
      })
      .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
    const heading =
      activeOverviewFilter === 'collections'
        ? 'Collection product details'
        : activeOverviewFilter === 'new-arrivals'
          ? 'New arrival product details'
          : activeOverviewFilter === 'offers'
            ? 'Offer product details'
            : 'Product details';

    return (
      <section className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="page-eyebrow">Overall Products</p>
            <h2 className="mt-2 font-display text-3xl text-wine">{heading}</h2>
          </div>
          <label className="text-sm font-semibold text-ink/70">
            Search Products
            <span className="relative mt-2 block w-full lg:w-[28rem]">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/42" aria-hidden="true">
                <path
                  d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
              <input
                type="search"
                value={productSearchTerm}
                onChange={(event) => setProductSearchTerm(event.target.value)}
                placeholder="Search product name"
                className="h-11 w-full rounded-lg border border-[#e2c8bc] bg-white/80 px-3 py-2 pl-9 text-sm text-[#2c2f3d] outline-none transition focus:border-[#7f3150] focus:bg-white focus:ring-2 focus:ring-[#7f3150]/10"
              />
            </span>
          </label>
        </div>
        {isSearchingProducts ? <p className="text-xs font-semibold text-ink/48 lg:text-right">Searching products...</p> : null}
        {filteredProducts.length ? (
          <div className={tableWrapClassName}>
            <div className="overflow-x-auto">
              <table className={tableClassName}>
                <thead className={tableHeadClassName}>
                  <tr>
                    <th className={tableHeadCellClassName}>Product</th>
                    <th className={tableHeadCellClassName}>Category</th>
                    <th className={tableHeadCellClassName}>Price</th>
                    <th className={tableHeadCellClassName}>Stock</th>
                    <th className={tableHeadCellClassName}>Image</th>
                    <th className={actionHeadCellClassName}>Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                  {filteredProducts.map((product) => {
                    const previewImages = (product.raw.images ?? [])
                      .map((image) => image.image_url?.trim())
                      .filter((image): image is string => Boolean(image));
                    const images = previewImages.length ? previewImages : product.image ? [product.image] : [];
                    const isImagesExpanded = expandedProductImageIds.includes(product.id);
                    const visibleImages = isImagesExpanded ? images : images.slice(0, 4);

                    return (
                      <tr key={product.id}>
                        <td className={`${tableCellClassName} font-semibold text-wine`}>{product.name}</td>
                        <td className={tableCellClassName}>{product.categoryName}</td>
                        <td className={`${tableCellClassName} font-semibold text-[#4a2a2c]`}>Rs. {product.price.toLocaleString('en-IN')}</td>
                        <td className={tableCellClassName}>{product.stock}</td>
                        <td className={tableCellClassName}>
                          {images.length ? (
                            <div className="flex flex-nowrap items-center gap-2">
                              {visibleImages.map((image, index) => (
                                <img
                                  key={`${product.id}-${image}-${index}`}
                                  src={image}
                                  alt={`${product.name} preview ${index + 1}`}
                                  className={thumbnailClassName}
                                />
                              ))}
                              {images.length > 4 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProductImageIds((current) =>
                                      current.includes(product.id)
                                        ? current.filter((id) => id !== product.id)
                                        : [...current, product.id]
                                    )
                                  }
                                  className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f8efe7] text-xs font-semibold text-wine transition hover:bg-[#efdcd1]"
                                  aria-label={`${isImagesExpanded ? 'Hide' : 'Show'} all images for ${product.name}`}
                                >
                                  {images.length}+
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className={noImageClassName}>No image</span>
                          )}
                        </td>
                      <td className={actionCellClassName}>
                        <div className="flex flex-wrap justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openProductUpdateFromOverview(product)}
                              className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#682640]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleProductStatusToggle(product.id)}
                              className="rounded-full border border-[#d99b8c] bg-white/75 px-4 py-2 text-xs font-semibold text-[#a13f45] transition hover:bg-[#fff3ef]"
                            >
                              {product.status === 'active' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="page-card p-5 text-sm text-ink/60">No products found for this selection.</p>
        )}
      </section>
    );
  };


  return (
    <div className="min-h-screen bg-silk-radial px-3 pb-10 pt-2 text-ink sm:px-5 sm:pb-12 sm:pt-3 lg:px-8 lg:pb-14 lg:pt-4">
      <div className="app-width space-y-8">
        <section className="page-shell p-6 sm:p-8">
          <button
            type="button"
            onClick={handleDashboardBack}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#7f3150] shadow-sm ring-1 ring-[#ead7df] transition hover:bg-white hover:text-[#5a2e40]"
            aria-label="Go back"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4Z" />
            </svg>
          </button>
          <p className="page-eyebrow mt-5">Admin / Host Dashboard</p>
          <h1 className="mt-3 font-display text-4xl text-wine sm:text-5xl">Website catalog control center</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/66">{message}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('overall');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'overall'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Overall
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('product-manager');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'product-manager'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Product Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('category-manager');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'category-manager'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Category Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('discount-manager');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'discount-manager'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Discount Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('inventory-manager');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'inventory-manager'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Inventory Manager
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePanel(null);
                setActiveAdminView('order-management');
                setShowOverviewDetails(false);
              }}
              className={`min-h-12 rounded-full px-7 py-3.5 text-sm font-semibold transition ${
                activeAdminView === 'order-management'
                  ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                  : 'border border-[#dec5b9] bg-white/70 text-wine'
              }`}
            >
              Order Management
            </button>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {displayedStats.map((stat) => {
              const isActiveStat = showOverviewDetails && activeOverviewSection === stat.section && activeOverviewFilter === stat.filter;

              return (
                <button
                  key={stat.label}
                  type="button"
                  onClick={() => handleOverviewStatClick(stat.section, stat.filter)}
                  className={`page-card min-h-[5.8rem] w-full px-5 py-4 text-left transition hover:-translate-y-0.5 ${
                    isActiveStat ? 'border-[#1f1a16] text-[#1f1a16] shadow-[0_16px_30px_rgba(31,26,22,0.16)] ring-2 ring-[#1f1a16]/20' : ''
                  }`}
                >
                  <p className={`text-[0.68rem] uppercase tracking-[0.18em] ${isActiveStat ? 'text-[#1f1a16]' : 'text-ink/44'}`}>{stat.label}</p>
                  <p className={`mt-2 break-words text-2xl font-semibold leading-tight ${isActiveStat ? 'text-[#1f1a16]' : 'text-wine'}`}>{stat.value}</p>
                </button>
              );
            })}
          </div>
        </section>

        {showOverviewDetails ? renderOverviewDetails() : null}

        {activeAdminView === 'product-manager' ? (
          <>
            <section className="space-y-4">
              <div className="page-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'add' ? null : 'add'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'add'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Add Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'update' ? null : 'update'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'update'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Update Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'remove' ? null : 'remove'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'remove'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Deactivate Product
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Add Product</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Create a new catalog item</h2>
              </div>
              {activePanel === 'add'
                ? renderForm(addForm, setAddForm, addProductErrors, setAddProductErrors, 'Add Product', handleAdd)
                : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Update Product</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Edit an existing item</h2>
              </div>
              {activePanel === 'update' ? (
                <>
                  <div className="page-card mx-auto max-w-3xl p-6">
                    <label className="text-sm font-semibold text-ink/70">
                      Select Product
                      <select
                        value={selectedProductId}
                        onChange={(event) => handleUpdateSelection(event.target.value)}
                        className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                      >
                        <option value="">Select product</option>
                        {productViews.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {renderForm(
                    updateForm,
                    setUpdateForm,
                    updateProductErrors,
                    setUpdateProductErrors,
                    'Update Product',
                    handleUpdate
                  )}
                </>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Deactivate Product</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Deactivate products from storefront pages</h2>
              </div>
              {activePanel === 'remove' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {productViews.map((product) => (
                    <article key={product.id} className="page-card overflow-hidden p-4">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="h-52 w-full rounded-[1.4rem] object-cover" />
                      ) : (
                        <div className="flex h-52 w-full items-center justify-center rounded-[1.4rem] bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                          Image not available
                        </div>
                      )}
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl text-wine">{product.name}</h3>
                          <p className="mt-1 text-sm text-ink/62">
                            {product.categoryName} / {product.color || 'No color'}
                          </p>
                        </div>
                        <p
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                            product.status === 'active' ? 'bg-[#e4f4e6] text-[#2f7a45]' : 'bg-[#f7e5d7] text-[#a05a3d]'
                          }`}
                        >
                          {product.status}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-lg font-semibold text-[#4a2a2c]">Rs. {product.price.toLocaleString('en-IN')}</p>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void handleProductStatusToggle(product.id)}
                          className="rounded-full border border-[#d77a61] px-4 py-2 text-sm font-semibold text-[#a13f45] transition hover:bg-[#fff0ea] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {product.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {activeAdminView === 'category-manager' ? (
          <>
            <section className="space-y-4">
              <div className="page-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'add' ? null : 'add'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'add'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Add Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'update' ? null : 'update'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'update'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Update Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'remove' ? null : 'remove'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'remove'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Deactivate Category
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Add Category</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Create a new collection or category</h2>
              </div>
              {activePanel === 'add'
                ? renderCategoryForm(
                    addCategoryForm,
                    setAddCategoryForm,
                    addCategoryErrors,
                    setAddCategoryErrors,
                    'Add Category',
                    handleAddCategory
                  )
                : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Update Category</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Edit an existing category</h2>
              </div>
              {activePanel === 'update' ? (
                <>
                  <div className="page-card mx-auto max-w-3xl p-5 sm:p-6">
                    <label className="flex flex-col gap-3 text-sm font-semibold text-ink/70 sm:flex-row sm:items-center">
                      <span className="shrink-0">Select Category</span>
                      <select
                        value={selectedCategoryId}
                        onChange={(event) => handleUpdateCategorySelection(event.target.value)}
                        className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none sm:max-w-[21rem]"
                      >
                        <option value="">Select category</option>
                        {adminCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {renderCategoryForm(
                    updateCategoryForm,
                    setUpdateCategoryForm,
                    updateCategoryErrors,
                    setUpdateCategoryErrors,
                    'Update Category',
                    handleUpdateCategory
                  )}
                </>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Deactivate Category</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Hide categories from storefront filters and collections</h2>
              </div>
              {activePanel === 'remove' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {adminCategories.map((category) => {
                    const categoryImageUrl = getCategoryImageUrl(category);
                    const categoryIsActive = isCategoryActive(category);

                    return (
                    <article key={category.id} className="page-card overflow-hidden p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl text-wine">{category.name}</h3>
                          <p className="mt-1 text-sm text-ink/62">{category.slug}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                            categoryIsActive ? 'bg-[#e4f4e6] text-[#2f7a45]' : 'bg-[#f7e5d7] text-[#a05a3d]'
                          }`}
                        >
                          {categoryIsActive ? 'active' : 'inactive'}
                        </span>
                      </div>

                      {categoryImageUrl ? (
                        <img
                          src={categoryImageUrl}
                          alt={category.name}
                          className="mt-4 h-52 w-full rounded-[1.4rem] object-cover"
                        />
                      ) : (
                        <div className="mt-4 flex h-52 items-center justify-center rounded-[1.4rem] border border-dashed border-[#dbc8bc] bg-white/55 text-sm text-ink/50">
                          No category image
                        </div>
                      )}

                      <div className="mt-4 space-y-2 text-sm text-ink/62">
                        <p>{category.description?.trim() || 'No description added yet.'}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleRemoveCategory(category.id)}
                        className="mt-5 rounded-full border border-[#d77a61] px-4 py-2 text-sm font-semibold text-[#a13f45] transition hover:bg-[#fff0ea] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {categoryIsActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </article>
                  );
                  })}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {activeAdminView === 'discount-manager' ? (
          <>
            <section className="space-y-4">
              <div className="page-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'add' ? null : 'add'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'add'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Add Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'update' ? null : 'update'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'update'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Update Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePanel((current) => (current === 'remove' ? null : 'remove'))}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      activePanel === 'remove'
                        ? 'bg-[#7f3150] text-white shadow-[0_14px_24px_rgba(106,45,59,0.2)]'
                        : 'border border-[#dec5b9] bg-white/70 text-wine'
                    }`}
                  >
                    Remove Discount
                  </button>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Add Discount</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Create a new coupon or offer</h2>
              </div>
              {activePanel === 'add'
                ? renderDiscountForm(
                    addDiscountForm,
                    setAddDiscountForm,
                    addDiscountErrors,
                    setAddDiscountErrors,
                    'Add Discount',
                    handleAddDiscount
                  )
                : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Update Discount</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Edit an existing discount</h2>
              </div>
              {activePanel === 'update' ? (
                <>
                  <div className="page-card mx-auto max-w-3xl p-5 sm:p-6">
                    <label className="flex flex-col gap-3 text-sm font-semibold text-ink/70 sm:flex-row sm:items-center">
                      <span className="shrink-0">Select Discount</span>
                      <select
                        value={selectedDiscountId}
                        onChange={(event) => handleUpdateDiscountSelection(event.target.value)}
                        className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none sm:ml-2 sm:max-w-[21rem]"
                      >
                        <option value="">Select discount</option>
                        {adminDiscounts.map((discount) => (
                          <option key={discount.id} value={discount.id}>
                            {discount.title} ({discount.code})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {renderDiscountForm(
                    updateDiscountForm,
                    setUpdateDiscountForm,
                    updateDiscountErrors,
                    setUpdateDiscountErrors,
                    'Update Discount',
                    handleUpdateDiscount
                  )}
                </>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="page-eyebrow">Remove Discount</p>
                <h2 className="mt-2 font-display text-3xl text-wine">Permanently remove coupons from admin control</h2>
              </div>
              {activePanel === 'remove' ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {adminDiscounts.map((discount) => (
                    <article key={discount.id} className="page-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl text-wine">{discount.title}</h3>
                          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-ink/52">{discount.code}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                            discount.is_active ? 'bg-[#e4f4e6] text-[#2f7a45]' : 'bg-[#f7e5d7] text-[#a05a3d]'
                          }`}
                        >
                          {discount.is_active ? 'active' : 'inactive'}
                        </span>
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-ink/62">
                        <p>Type: {discount.type}</p>
                        <p>Value: {discount.type === 'percentage' ? `${discount.value}%` : `Rs. ${Number(discount.value).toLocaleString('en-IN')}`}</p>
                        <p>Scope: {discount.applies_to}</p>
                        <p>Starts: {new Date(discount.starts_at).toLocaleString('en-IN')}</p>
                        <p>Ends: {new Date(discount.ends_at).toLocaleString('en-IN')}</p>
                      </div>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => void handleRemoveDiscount(discount.id)}
                        className="mt-5 rounded-full border border-[#d77a61] px-4 py-2 text-sm font-semibold text-[#a13f45] transition hover:bg-[#fff0ea] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        ) : null}

        {activeAdminView === 'inventory-manager' ? (
          <section className="space-y-4">
            <div>
              <p className="page-eyebrow">Inventory</p>
              <h2 className="mt-2 font-display text-3xl text-wine">Manage stock values from admin inventory </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="page-card p-5">
                <h3 className="font-display text-2xl text-wine">Inventory List</h3>
                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-ink/46">
                      <tr>
                        <th className="pb-3 pr-4 font-semibold">Product</th>
                        <th className="pb-3 pr-4 text-center font-semibold">Available</th>
                        <th className="pb-3 pr-4 text-center font-semibold">Reserved</th>
                        <th className="pb-3 pr-4 text-center font-semibold">Threshold</th>
                        <th className="pb-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedInventoryItems.map((item) => (
                        <tr key={item.product_id} className="border-t border-[#eadfd8]">
                          <td className="py-3 pr-4">
                            <button
                              type="button"
                              onClick={() => setSelectedInventoryProductId(String(item.product_id))}
                              className="text-left font-semibold text-[#4a2a2c]"
                            >
                              {item.product_name ?? `Product ${item.product_id}`}
                            </button>
                          </td>
                          <td className="py-3 pr-4 text-center tabular-nums">{item.available_stock}</td>
                          <td className="py-3 pr-4 text-center tabular-nums">{item.reserved_stock}</td>
                          <td className="py-3 pr-4 text-center tabular-nums">{item.low_stock_threshold}</td>
                          <td className="py-3 text-center">{item.stock_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="page-card p-6">
                <p className="page-eyebrow">Low Stock</p>
                <h3 className="mt-2 font-display text-2xl text-wine">Low stock items</h3>
                <div className="mt-4 space-y-3">
                  {sortedLowStockItems.length ? (
                    sortedLowStockItems.map((item) => (
                      <div key={item.product_id} className="rounded-[1.2rem] border border-[#eadfd8] bg-white/60 p-4">
                        <p className="font-semibold text-[#4a2a2c]">{item.product_name ?? `Product ${item.product_id}`}</p>
                        <p className="mt-1 text-sm text-ink/60">Available: {item.available_stock}</p>
                        <p className="text-sm text-ink/60">Threshold: {item.low_stock_threshold}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[1.2rem] border border-[#eadfd8] bg-white/60 p-4 text-sm text-ink/60">
                      No low-stock items available.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="page-card p-6">
                <p className="page-eyebrow">Update Inventory</p>
                <h3 className="mt-2 font-display text-2xl text-wine">Patch product stock</h3>
                <label className="mt-5 flex flex-col gap-2 text-sm font-semibold text-ink/70">
                  Select Product
                  <select
                    value={selectedInventoryProductId}
                    onChange={(event) => setSelectedInventoryProductId(event.target.value)}
                    className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none md:max-w-[21rem]"
                  >
                    <option value="">Select inventory product</option>
                    {sortedInventoryItems.map((item) => (
                      <option key={item.product_id} value={item.product_id}>
                        {item.product_name ?? `Product ${item.product_id}`}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-5 grid gap-5">
                  <label className="flex flex-col gap-2 text-sm font-semibold text-ink/70">
                    Available Stock
                    <input
                      type="number"
                      min="0"
                      value={inventoryForm.available_stock}
                      onChange={(event) => setInventoryForm((current) => ({ ...current, available_stock: sanitizeIntegerInput(event.target.value) }))}
                      className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none md:max-w-[21rem]"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-ink/70">
                    Reserved Stock
                    <input
                      type="number"
                      min="0"
                      value={inventoryForm.reserved_stock}
                      onChange={(event) => setInventoryForm((current) => ({ ...current, reserved_stock: sanitizeIntegerInput(event.target.value) }))}
                      className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none md:max-w-[21rem]"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-semibold text-ink/70">
                    Low Stock Threshold
                    <input
                      type="number"
                      min="0"
                      value={inventoryForm.low_stock_threshold}
                      onChange={(event) => setInventoryForm((current) => ({ ...current, low_stock_threshold: sanitizeIntegerInput(event.target.value) }))}
                      className="w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={isUpdatingInventory}
                  onClick={() => void handleUpdateInventory()}
                  className="liquid-btn mt-6 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUpdatingInventory ? 'Please wait...' : 'Update Inventory'}
                </button>
              </div>

              <div className="page-card p-6">
                <p className="page-eyebrow">Adjust Inventory</p>
                <h3 className="mt-2 font-display text-2xl text-wine">Increase, decrease, reserve, release or set stock</h3>
                <div className="mt-4 grid gap-4">
                  <label className="text-sm font-semibold text-ink/70">
                    Select Product
                    <select
                      value={inventoryAdjustForm.product_id}
                      onChange={(event) => setInventoryAdjustForm((current) => ({ ...current, product_id: event.target.value }))}
                      className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    >
                      <option value="">Select product</option>
                      {productViews.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-ink/70">
                    Adjustment Type
                    <select
                      value={inventoryAdjustForm.adjustment_type}
                      onChange={(event) => setInventoryAdjustForm((current) => ({ ...current, adjustment_type: event.target.value }))}
                      className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    >
                      <option value="increase">Increase</option>
                      <option value="decrease">Decrease</option>
                      <option value="set">Set</option>
                      <option value="reserve">Reserve</option>
                      <option value="release">Release</option>
                    </select>
                  </label>

                  <label className="text-sm font-semibold text-ink/70">
                    Quantity
                    <input
                      type="number"
                      min="0"
                      value={inventoryAdjustForm.quantity}
                      onChange={(event) => setInventoryAdjustForm((current) => ({ ...current, quantity: sanitizeIntegerInput(event.target.value) }))}
                      className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    />
                  </label>

                  <label className="text-sm font-semibold text-ink/70">
                    Low Stock Threshold
                    <input
                      type="number"
                      min="0"
                      value={inventoryAdjustForm.low_stock_threshold}
                      onChange={(event) => setInventoryAdjustForm((current) => ({ ...current, low_stock_threshold: sanitizeIntegerInput(event.target.value) }))}
                      className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    />
                  </label>

                  <label className="text-sm font-semibold text-ink/70">
                    Note
                    <textarea
                      rows={4}
                      value={inventoryAdjustForm.note}
                      onChange={(event) => setInventoryAdjustForm((current) => ({ ...current, note: sanitizeTextOnly(event.target.value) }))}
                      className="mt-2 w-full rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={isAdjustingInventory}
                  onClick={() => void handleAdjustInventory()}
                  className="liquid-btn mt-6 justify-center px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAdjustingInventory ? 'Please wait...' : 'Adjust Inventory'}
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      {operationNotice ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[120] max-w-sm">
          <div
            className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold shadow-[0_18px_36px_rgba(90,50,45,0.16)] ${
              operationNotice.kind === 'success'
                ? 'border-[#d7ead5] bg-[linear-gradient(135deg,#fffdfa_0%,#eef9ee_100%)] text-black'
                : 'border-[#f2d2d2] bg-[linear-gradient(135deg,#fffafa_0%,#fff0f0_100%)] text-[#a13f45]'
            }`}
          >
            {operationNotice.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboardPage;
