import { useEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type SetStateAction } from 'react';
import commonApi, {
  type Category,
  type FiltersResponse,
  type PaginationMeta,
  type Product as ApiProduct,
  type ProductFiltersQuery,
  type PublicProductListQuery
} from '../../api/commonapi';
import ProductRatingBadge from '../common/ProductRatingBadge';
import type { CatalogProduct } from '../../data/productCatalog';
import { useShop } from '../../context/ShopContext';
import { formatCurrency, sanitizeDisplayText } from '../../utils/displayText';
import { navigateToProductImage } from '../../utils/navigation';
import { getStableProductImages } from '../../utils/productImages';
import { resolveProductSource } from '../../utils/productSource';

type CatalogBrowserPageProps = {
  products: CatalogProduct[];
  title: string;
  resultsLabel?: string;
  defaultCategory?: string;
  filterField?: 'category' | 'occasion';
  filterLabel?: string;
  filterOptionsOverride?: string[];
  initialFilter?: InitialCatalogFilter;
  emptyTitle: string;
  emptyDescription: string;
  showCartAction?: boolean;
  cardVariant?: 'default' | 'editorial';
  apiQuery?: PublicProductListQuery;
  syncTitleWithCategoryFilter?: boolean;
  allCategoriesTitle?: string;
  equalCardHeights?: boolean;
  displayMode?: 'grid' | 'table';
};

type InitialCatalogFilter =
  | {
      type: 'category';
      label: string;
      categoryId?: number;
    }
  | {
      type: 'occasion';
      label: string;
      occasion: string;
    }
  | null;

const formatPrice = formatCurrency;

const PRODUCTS_PER_PAGE = 12;

const normalizeOptionLabel = (value: string) => value.trim();
const normalizeFilterValue = (value: string) => value.trim().toLowerCase();
const normalizeComparableFilterToken = (value: string) =>
  normalizeFilterValue(value)
    .replace(/\bsarees?\b/g, '')
    .replace(/[^a-z0-9]+/g, '');

const getFilterAliases = (value: string) => {
  const token = normalizeComparableFilterToken(value);
  const aliases = new Set([token]);

  if (token.includes('banaras') || token.includes('banarasi')) {
    aliases.add(token.replace(/banarasi/g, 'banaras'));
    aliases.add(token.replace(/banaras/g, 'banarasi'));
  }

  return Array.from(aliases).filter(Boolean);
};

const doesFilterValueMatch = (productValue: string, selectedValue: string) => {
  const productAliases = getFilterAliases(productValue);
  const selectedAliases = getFilterAliases(selectedValue);

  return productAliases.some((productAlias) =>
    selectedAliases.some(
      (selectedAlias) =>
        productAlias === selectedAlias ||
        productAlias.includes(selectedAlias) ||
        selectedAlias.includes(productAlias)
    )
  );
};

const isVisibleCategoryOption = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized) && normalized !== 'string' && !normalized.includes('test') && !/^\d+$/.test(normalized);
};

const toUniqueOptions = (values: Array<string | number | null | undefined>) =>
  Array.from(
    new Set(
      values
        .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
        .filter(Boolean)
    )
  );

const toUniqueFilterOptions = (values: Array<string | number | null | undefined>) => {
  const options: string[] = [];

  values
    .map((value) => (value === null || value === undefined ? '' : String(value).trim()))
    .filter(Boolean)
    .forEach((value) => {
      if (!options.some((option) => doesFilterValueMatch(option, value))) {
        options.push(value);
      }
    });

  return options;
};

const getDiscountPercentage = (originalPrice: number, sellingPrice: number) => {
  if (originalPrice <= sellingPrice || originalPrice <= 0) {
    return 0;
  }

  return Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
};

const toNumber = (value: number | string | undefined, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const mapApiProductToCatalogProduct = (product: ApiProduct, categoriesById: Map<number, string>): CatalogProduct => {
  const galleryImages = getStableProductImages(product);
  const primaryImage = product.image?.trim() || galleryImages[0] || '';
  const category =
    product.category?.trim() ||
    (product.category_id !== undefined ? categoriesById.get(product.category_id)?.trim() : undefined) ||
    'Sarees';

  return {
    id: product.id,
    categoryId: product.category_id,
    slug: product.slug,
    name: product.name,
    category,
    occasion: product.occasion?.trim() || undefined,
    shortDescription: product.short_description?.trim() || product.shortDescription?.trim() || undefined,
    color: product.color?.trim() || 'Classic',
    price: toNumber(product.selling_price ?? product.price),
    originalPrice:
      product.mrp !== undefined || product.originalPrice !== undefined
        ? toNumber(product.mrp ?? product.originalPrice)
        : undefined,
    image: primaryImage,
    galleryImages: galleryImages.length ? galleryImages : primaryImage ? [primaryImage] : [],
    source: resolveProductSource(product, 'category'),
    badge: product.badge,
    note: product.note ?? product.description,
    offerTag: product.offerTag,
    rating: product.rating,
    reviewsCount: product.reviewsCount,
    stock: product.stock
  };
};

const buildVisiblePageNumbers = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 0, totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 0, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 0, currentPage - 1, currentPage, currentPage + 1, 0, totalPages];
};

function CatalogBrowserPage({
  products,
  title,
  resultsLabel,
  defaultCategory = 'All',
  filterField = 'category',
  filterLabel = 'Category',
  filterOptionsOverride,
  initialFilter = null,
  emptyTitle,
  emptyDescription,
  cardVariant = 'default',
  apiQuery,
  syncTitleWithCategoryFilter = false,
  allCategoriesTitle = 'All Sarees',
  equalCardHeights = false,
  displayMode = 'grid'
}: CatalogBrowserPageProps) {
  const usesBackendPagination = Boolean(apiQuery);
  const [remoteFilters, setRemoteFilters] = useState<FiltersResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [backendProducts, setBackendProducts] = useState<CatalogProduct[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [categoryRecords, setCategoryRecords] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(usesBackendPagination);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    Promise.allSettled([
      commonApi.filters.get({
        ...(apiQuery?.category_id ? { category_id: apiQuery.category_id } : {}),
        ...(apiQuery?.occasion ? { occasion: apiQuery.occasion } : {})
      }),
      commonApi.categories.list()
    ])
      .then(([filtersResult, categoriesResult]) => {
        if (!isActive) {
          return;
        }

        if (filtersResult.status === 'fulfilled') {
          setRemoteFilters(filtersResult.value);
        } else {
          setRemoteFilters(null);
        }

        if (categoriesResult.status === 'fulfilled') {
          setCategoryRecords(categoriesResult.value.data ?? []);
        } else {
          setCategoryRecords([]);
        }
      })
      .catch(() => {
        if (isActive) {
          setRemoteFilters(null);
          setCategoryRecords([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [apiQuery?.category_id, apiQuery?.occasion]);

  const categoryIdByName = useMemo(
    () =>
      new Map(
        categoryRecords.map((category) => [normalizeFilterValue(category.name), category.id])
      ),
    [categoryRecords]
  );

  const categoryNameById = useMemo(
    () =>
      new Map(
        categoryRecords.map((category) => [category.id, category.name])
      ),
    [categoryRecords]
  );

  const categories = useMemo(() => {
    const overrideCategories = (filterOptionsOverride ?? []).map((category) => normalizeOptionLabel(category));

    if (filterField === 'category') {
      const apiCategoryRecords = categoryRecords.map((category) => normalizeOptionLabel(category.name));
      const remoteCategories = (remoteFilters?.categories ?? [])
        .map((category) => normalizeOptionLabel(String(category)))
        .filter(isVisibleCategoryOption);
      const localCategories = products
        .map((product) => normalizeOptionLabel(product.category ?? ''))
        .filter(isVisibleCategoryOption);

      return [
        'All',
        ...toUniqueFilterOptions([...overrideCategories, ...apiCategoryRecords, ...remoteCategories, ...localCategories]).filter(
          isVisibleCategoryOption
        )
      ];
    }

    const localCategories = products
      .map((product) => normalizeOptionLabel(product.occasion ?? ''))
      .filter(isVisibleCategoryOption);
    const remoteOccasions = (remoteFilters?.occasions ?? [])
      .map((occasion) => normalizeOptionLabel(occasion))
      .filter(isVisibleCategoryOption);

    return ['All', ...toUniqueFilterOptions([...overrideCategories, ...localCategories, ...remoteOccasions]).filter(isVisibleCategoryOption)];
  }, [categoryRecords, filterField, filterOptionsOverride, products, remoteFilters]);

  const colors = useMemo(() => {
    const localColors = products.map((product) => normalizeOptionLabel(product.color));
    const remoteColors = (remoteFilters?.colors ?? []).map((color) => normalizeOptionLabel(color));

    return ['All', ...toUniqueOptions([...localColors, ...remoteColors])];
  }, [products, remoteFilters]);

  const minAvailablePrice = useMemo(() => {
    if (!usesBackendPagination && products.length) {
      return Math.min(...products.map((product) => product.price));
    }
    const remoteMin = Number(remoteFilters?.min_price);
    if (Number.isFinite(remoteMin) && remoteMin > 0) {
      return remoteMin;
    }
    if (products.length) {
      return Math.min(...products.map((product) => product.price));
    }
    return 0;
  }, [products, remoteFilters, usesBackendPagination]);

  const maxAvailablePrice = useMemo(() => {
    if (!usesBackendPagination && products.length) {
      return Math.max(...products.map((product) => product.price));
    }
    const remoteMax = Number(remoteFilters?.max_price);
    if (Number.isFinite(remoteMax) && remoteMax > 0) {
      return remoteMax;
    }
    if (products.length) {
      return Math.max(...products.map((product) => product.price));
    }
    return 0;
  }, [products, remoteFilters, usesBackendPagination]);
  const priceRangeStart = minAvailablePrice;
  const priceRangeEnd = maxAvailablePrice;
  const matchedDefaultCategory =
    categories.find((category) => doesFilterValueMatch(category, defaultCategory)) ??
    defaultCategory;
  const safeDefaultCategory = normalizeFilterValue(defaultCategory) === 'all' ? 'All' : matchedDefaultCategory;
  const initialSelectedFilter =
    initialFilter?.type === 'category'
      ? initialFilter.label
      : initialFilter?.type === 'occasion'
        ? initialFilter.label
        : safeDefaultCategory;

  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialSelectedFilter === 'All' ? [] : [initialSelectedFilter]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isCategoryClearedByUser, setIsCategoryClearedByUser] = useState(false);
  const [priceStart, setPriceStart] = useState(priceRangeStart);
  const [priceEnd, setPriceEnd] = useState(priceRangeEnd);
  const priceDraftRef = useRef({ start: priceRangeStart, end: priceRangeEnd });
  const [appliedPriceStart, setAppliedPriceStart] = useState(priceRangeStart);
  const [appliedPriceEnd, setAppliedPriceEnd] = useState(priceRangeEnd);
  const [openSection, setOpenSection] = useState<'pricing' | 'category' | 'color' | null>('pricing');
  const [draggingThumb, setDraggingThumb] = useState<'start' | 'end' | null>(null);
  const priceTrackRef = useRef<HTMLDivElement | null>(null);
  const catalogTopRef = useRef<HTMLDivElement | null>(null);
  const { isInWishlist, toggleWishlist } = useShop();
  const showCardCartAction = false;

  const scrollCatalogToTop = () => {
    window.requestAnimationFrame(() => {
      catalogTopRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  };

  const buildActiveFilterParams = () => {
    const selectedCategory = selectedCategories[0];
    const params: ProductFiltersQuery = {};

    if (initialFilter?.type === 'category' && initialFilter.categoryId) {
      params.category_id = initialFilter.categoryId;
    }

    if (initialFilter?.type === 'occasion') {
      params.occasion = initialFilter.occasion;
    }

    if (apiQuery?.category_id) {
      params.category_id = apiQuery.category_id;
    }

    if (apiQuery?.occasion) {
      params.occasion = apiQuery.occasion;
    }

    if (filterField === 'category' && selectedCategory && selectedCategory !== 'All') {
      const normalizedSelectedCategory = normalizeFilterValue(selectedCategory);
      const selectedCategoryId =
        categoryIdByName.get(normalizedSelectedCategory) ??
        categoryRecords.find(
          (category) =>
            doesFilterValueMatch(category.name, selectedCategory) ||
            doesFilterValueMatch(category.slug ?? '', selectedCategory)
        )?.id;

      if (selectedCategoryId) {
        params.category_id = selectedCategoryId;
      } else {
        delete params.category_id;
      }
    }

    if (filterField === 'occasion' && selectedCategory && selectedCategory !== 'All') {
      const remoteOccasion =
        remoteFilters?.occasions?.find((occasion) => doesFilterValueMatch(occasion, selectedCategory)) ??
        (initialFilter?.type === 'occasion' ? initialFilter.occasion : undefined);

      params.occasion = remoteOccasion ?? selectedCategory;
    }

    return params;
  };

  useEffect(() => {
    if (!usesBackendPagination) {
      return undefined;
    }

    let isActive = true;
    const params = buildActiveFilterParams();

    commonApi.filters
      .get(params)
      .then((filters) => {
        if (isActive) {
          setRemoteFilters(filters);
        }
      })
      .catch(() => {
        if (isActive) {
          setRemoteFilters(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    apiQuery?.category_id,
    apiQuery?.occasion,
    categoryIdByName,
    categoryRecords,
    filterField,
    initialFilter,
    selectedCategories,
    usesBackendPagination
  ]);

  useEffect(() => {
    setSelectedCategories(initialSelectedFilter === 'All' ? [] : [initialSelectedFilter]);
    setSelectedColors([]);
    setIsCategoryClearedByUser(false);
    setPriceStart(priceRangeStart);
    setPriceEnd(priceRangeEnd);
    priceDraftRef.current = { start: priceRangeStart, end: priceRangeEnd };
    setAppliedPriceStart(priceRangeStart);
    setAppliedPriceEnd(priceRangeEnd);
    setOpenSection('pricing');
    setCurrentPage(1);
  }, [initialSelectedFilter, priceRangeEnd, priceRangeStart]);

  const commitPriceRange = () => {
    const { start, end } = priceDraftRef.current;

    setAppliedPriceStart(start);
    setAppliedPriceEnd(end);
  };

  useEffect(() => {
    if (!draggingThumb) {
      return undefined;
    }

    const step = 100;
    const track = priceTrackRef.current;

    if (!track) {
      return undefined;
    }

    const updateFromClientX = (clientX: number) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      const rawValue = priceRangeStart + ratio * Math.max(priceRangeEnd - priceRangeStart, 1);
      const snappedValue = Math.round(rawValue / step) * step;

      if (draggingThumb === 'start') {
        handleStartRangeChange(snappedValue);
        return;
      }

      handleEndRangeChange(snappedValue);
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateFromClientX(event.clientX);
    };

    const handlePointerUp = () => {
      commitPriceRange();
      setDraggingThumb(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [draggingThumb, priceRangeEnd, priceRangeStart]);

  const updatePriceFromTrackPoint = (clientX: number, thumb: 'start' | 'end') => {
    const track = priceTrackRef.current;

    if (!track) {
      return;
    }

    const step = 100;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
    const rawValue = priceRangeStart + ratio * Math.max(priceRangeEnd - priceRangeStart, 1);
    const snappedValue = Math.round(rawValue / step) * step;

    if (thumb === 'start') {
      handleStartRangeChange(snappedValue);
      return;
    }

    handleEndRangeChange(snappedValue);
  };

  const toggleFilterSection = (
    section: 'pricing' | 'category' | 'color',
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    setOpenSection((current) => (current === section ? null : section));
    window.requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY));
    });
  };

  const handlePriceTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const track = priceTrackRef.current;

    if (!track) {
      return;
    }

    const rect = track.getBoundingClientRect();
    const pointerPosition = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
    const distanceFromStart = Math.abs(pointerPosition - startThumbPosition);
    const distanceFromEnd = Math.abs(pointerPosition - endThumbPosition);
    const selectedThumb =
      distanceFromStart === distanceFromEnd
        ? pointerPosition <= startThumbPosition
          ? 'start'
          : 'end'
        : distanceFromStart < distanceFromEnd
          ? 'start'
          : 'end';

    setDraggingThumb(selectedThumb);
    updatePriceFromTrackPoint(event.clientX, selectedThumb);
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const filterValue = filterField === 'occasion' ? product.occasion ?? '' : product.category;
        const normalizedProductColor = normalizeFilterValue(product.color);
        const categoryMatch =
          selectedCategories.length === 0 ||
          selectedCategories.some((category) => doesFilterValueMatch(filterValue, category));
        const colorMatch =
          selectedColors.length === 0 ||
          selectedColors.some((color) => normalizeFilterValue(color) === normalizedProductColor);
        const hasActivePriceRange = priceRangeEnd > priceRangeStart;
        const priceMatch = !hasActivePriceRange || (product.price >= appliedPriceStart && product.price <= appliedPriceEnd);

        return categoryMatch && colorMatch && priceMatch;
      }),
    [appliedPriceEnd, appliedPriceStart, filterField, priceRangeEnd, priceRangeStart, products, selectedCategories, selectedColors]
  );

  const totalPages = Math.max(Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE), 1);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;

    return filteredProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  const priceFilteredBackendProducts = useMemo(() => {
    if (priceRangeEnd <= priceRangeStart) {
      return backendProducts;
    }

    return backendProducts.filter((product) => product.price >= appliedPriceStart && product.price <= appliedPriceEnd);
  }, [appliedPriceEnd, appliedPriceStart, backendProducts, priceRangeEnd, priceRangeStart]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedPriceEnd, appliedPriceStart, filterField, products, selectedCategories, selectedColors]);

  useEffect(() => {
    if (!usesBackendPagination) {
      setBackendProducts([]);
      setPaginationMeta(null);
      setProductsError(null);
      setIsLoadingProducts(false);
      return;
    }

    let isActive = true;
    const query: PublicProductListQuery = {
      ...(apiQuery ?? {}),
      page: currentPage,
      limit: PRODUCTS_PER_PAGE
    };
    const selectedCategory = selectedCategories[0];
    const selectedColor = selectedColors[0];

    if (initialFilter?.type === 'category' && initialFilter.categoryId) {
      query.category_id = initialFilter.categoryId;
    }

    if (initialFilter?.type === 'occasion') {
      query.occasion = initialFilter.occasion;
    }

    if (filterField === 'category' && !selectedCategory && (isCategoryClearedByUser || !apiQuery?.category_id)) {
      delete query.category_id;
    }

    if (filterField === 'category' && selectedCategory && selectedCategory !== 'All') {
      const normalizedSelectedCategory = normalizeFilterValue(selectedCategory);
      const selectedCategoryId =
        categoryIdByName.get(normalizedSelectedCategory) ??
        categoryRecords.find(
          (category) =>
            doesFilterValueMatch(category.name, selectedCategory) ||
            doesFilterValueMatch(category.slug ?? '', selectedCategory)
        )?.id;

      if (selectedCategoryId) {
        query.category_id = selectedCategoryId;
      } else {
        delete query.category_id;
      }
    }

    if (filterField === 'occasion' && selectedCategory && selectedCategory !== 'All') {
      const remoteOccasion =
        remoteFilters?.occasions?.find((occasion) => doesFilterValueMatch(occasion, selectedCategory)) ??
        (initialFilter?.type === 'occasion' ? initialFilter.occasion : undefined);
      query.occasion = remoteOccasion ?? selectedCategory;
    }

    if (selectedColor && selectedColor !== 'All') {
      query.color = selectedColor;
    }

    if (maxAvailablePrice > 0) {
      query.minPrice = appliedPriceStart;
      query.maxPrice = appliedPriceEnd;
    }

    setIsLoadingProducts(true);
    setProductsError(null);

    void commonApi.products
      .getAllPaginated(query)
      .then((response) => {
        if (!isActive) {
          return;
        }

        const mappedProducts = (response.data ?? [])
          .map((product) => mapApiProductToCatalogProduct(product, categoryNameById))
          .filter((product) => product.slug && product.name);

        setBackendProducts(mappedProducts);
        setPaginationMeta((response.meta as PaginationMeta | undefined) ?? null);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setBackendProducts([]);
        setPaginationMeta(null);
        setProductsError(error instanceof Error ? error.message : 'Unable to load products.');
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    apiQuery,
    appliedPriceEnd,
    appliedPriceStart,
    categoryIdByName,
    categoryRecords,
    categoryNameById,
    currentPage,
    filterField,
    initialFilter,
    isCategoryClearedByUser,
    maxAvailablePrice,
    minAvailablePrice,
    remoteFilters,
    selectedCategories,
    selectedColors,
    usesBackendPagination
  ]);

  const handleStartRangeChange = (value: number) => {
    const nextValue = Number.isFinite(value) ? value : priceRangeStart;
    const clampedStart = Math.max(priceRangeStart, Math.min(nextValue, priceRangeEnd));
    const nextEnd = Math.max(clampedStart, priceDraftRef.current.end);

    priceDraftRef.current = { start: clampedStart, end: nextEnd };
    setPriceStart(clampedStart);
    setPriceEnd(nextEnd);
  };

  const handleEndRangeChange = (value: number) => {
    const nextValue = Number.isFinite(value) ? value : priceRangeEnd;
    const clampedEnd = Math.min(priceRangeEnd, Math.max(nextValue, priceRangeStart));
    const nextStart = priceDraftRef.current.start;
    const nextEnd = Math.max(clampedEnd, nextStart);

    priceDraftRef.current = { start: nextStart, end: nextEnd };
    setPriceEnd(nextEnd);
  };

  const toggleSelection = (
    value: string,
    selectedValues: string[],
    setSelectedValues: Dispatch<SetStateAction<string[]>>
  ) => {
    const isCategorySelection = setSelectedValues === setSelectedCategories;

    if (value === 'All') {
      if (isCategorySelection) {
        setIsCategoryClearedByUser(true);
      }
      setSelectedValues([]);
      setCurrentPage(1);
      scrollCatalogToTop();
      return;
    }

    if (selectedValues.includes(value)) {
      if (isCategorySelection && selectedValues.length === 1) {
        setIsCategoryClearedByUser(true);
      }
      setSelectedValues(selectedValues.filter((item) => item !== value));
      setCurrentPage(1);
      scrollCatalogToTop();
      return;
    }

    if (isCategorySelection) {
      setIsCategoryClearedByUser(false);
    }

    if (
      setSelectedValues === setSelectedCategories &&
      safeDefaultCategory !== 'All' &&
      selectedValues.length === 1 &&
      selectedValues[0] === safeDefaultCategory
    ) {
      setSelectedValues([value]);
      setCurrentPage(1);
      scrollCatalogToTop();
      return;
    }

    if (usesBackendPagination) {
      setSelectedValues([value]);
      setCurrentPage(1);
      scrollCatalogToTop();
      return;
    }

    setSelectedValues([...selectedValues, value]);
    setCurrentPage(1);
    scrollCatalogToTop();
  };

  const isOptionActive = (value: string, selectedValues: string[]) =>
    value === 'All' ? selectedValues.length === 0 : selectedValues.includes(value);

  const shouldUseLocalFallback =
    usesBackendPagination && !isLoadingProducts && products.length > 0 && (Boolean(productsError) || backendProducts.length === 0);
  const visibleProducts = usesBackendPagination && !shouldUseLocalFallback ? priceFilteredBackendProducts : paginatedProducts;
  const resultCount =
    usesBackendPagination && !shouldUseLocalFallback ? priceFilteredBackendProducts.length : filteredProducts.length;
  const resolvedTotalPages =
    usesBackendPagination && !shouldUseLocalFallback ? paginationMeta?.totalPages ?? 1 : totalPages;
  const visiblePageNumbers = buildVisiblePageNumbers(currentPage, resolvedTotalPages);
  const priceSpan = Math.max(priceRangeEnd - priceRangeStart, 1);
  const startThumbPosition = ((priceStart - priceRangeStart) / priceSpan) * 100;
  const endThumbPosition = ((priceEnd - priceRangeStart) / priceSpan) * 100;

    const displayTitle =
    syncTitleWithCategoryFilter && filterField === 'category'
      ? selectedCategories[0] ?? allCategoriesTitle
      : title;


  return (
    <div ref={catalogTopRef} className="bg-silk-radial px-0 pb-10 pt-0 text-ink sm:px-1 sm:pb-12 lg:px-2 lg:pb-14">
      <div className="app-width">
        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="h-fit self-start bg-transparent p-0 shadow-none lg:sticky lg:top-28">
            <div className="flex flex-col gap-5">
              <div className="flex min-h-[3rem] items-center justify-between gap-4 px-4">
                <h2 className="page-eyebrow leading-none">Filters</h2>
                <button
                  type="button"
                  className="page-eyebrow leading-none"
                  onClick={() => {
                    setSelectedCategories([]);
                    setSelectedColors([]);
                    setPriceStart(priceRangeStart);
                    setPriceEnd(priceRangeEnd);
                    priceDraftRef.current = { start: priceRangeStart, end: priceRangeEnd };
                    setAppliedPriceStart(priceRangeStart);
                    setAppliedPriceEnd(priceRangeEnd);
                    setOpenSection('pricing');
                    setCurrentPage(1);
                  }}
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-[calc(100vh-8.5rem)] overflow-y-auto rounded-[1.75rem] border border-white/75 bg-[linear-gradient(145deg,rgba(255,249,244,0.76),rgba(243,225,217,0.6))] p-0 shadow-[0_18px_30px_rgba(104,60,53,0.08),inset_0_1px_0_rgba(255,255,255,0.82)]">
                <div className="border-b border-[#eadfd8] px-5 py-4">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => toggleFilterSection('pricing', event)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-lg font-semibold text-[#1f2230]">Pricing</span>
                    <span className={`text-[#757575] transition ${openSection === 'pricing' ? 'rotate-180' : ''}`}>
                      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
                      </svg>
                    </span>
                  </button>
                  {openSection === 'pricing' ? (
                    <div className="mt-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                        <label className="text-sm font-semibold text-ink/68">
                          Start Range
                          <input
                            type="number"
                            min={priceRangeStart}
                            max={priceRangeEnd}
                            step={100}
                            value={priceStart}
                            onChange={(event) => handleStartRangeChange(Number(event.target.value))}
                            onBlur={commitPriceRange}
                            onMouseUp={commitPriceRange}
                            onTouchEnd={commitPriceRange}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitPriceRange();
                              }
                            }}
                            className="mt-2 w-full min-w-0 rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-3 py-3 text-sm text-[#2c2f3d] outline-none"
                          />
                        </label>
                        <label className="text-sm font-semibold text-ink/68">
                          End Range
                          <input
                            type="number"
                            min={priceStart}
                            max={priceRangeEnd}
                            step={100}
                            value={priceEnd}
                            onChange={(event) => handleEndRangeChange(Number(event.target.value))}
                            onBlur={commitPriceRange}
                            onMouseUp={commitPriceRange}
                            onTouchEnd={commitPriceRange}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                commitPriceRange();
                              }
                            }}
                            className="mt-2 w-full min-w-0 rounded-[1rem] border border-[#e2c8bc] bg-white/75 px-3 py-3 text-sm text-[#2c2f3d] outline-none"
                          />
                        </label>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-4 text-sm font-semibold text-ink/68">
                        <span>{formatPrice(priceStart)}</span>
                        <span>{formatPrice(priceEnd)}</span>
                      </div>
                      <div
                        ref={priceTrackRef}
                        onPointerDown={handlePriceTrackPointerDown}
                        className="relative mt-5 h-6 touch-none select-none"
                      >
                        <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-[#ead7ce]" />
                        <div
                          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#8c3f56_0%,#c86d60_55%,#ebb06b_100%)]"
                          style={{
                            left: `${startThumbPosition}%`,
                            width: `${endThumbPosition - startThumbPosition}%`
                          }}
                        />
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setDraggingThumb('start');
                          }}
                          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/92 bg-[#8c3f56] shadow-[0_8px_18px_rgba(106,45,59,0.22)]"
                          style={{
                            left: `${startThumbPosition}%`,
                            zIndex: draggingThumb === 'start' || startThumbPosition >= endThumbPosition ? 3 : 2
                          }}
                          aria-label="Adjust start range"
                        />
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            setDraggingThumb('end');
                          }}
                          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/92 bg-[#8c3f56] shadow-[0_8px_18px_rgba(106,45,59,0.22)]"
                          style={{
                            left: `${endThumbPosition}%`,
                            zIndex: draggingThumb === 'end' || startThumbPosition < endThumbPosition ? 3 : 2
                          }}
                          aria-label="Adjust end range"
                        />
                      </div>
                      <div className="mt-4 text-sm font-medium text-ink/62">
                        Showing products from {formatPrice(priceStart)} to {formatPrice(priceEnd)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-b border-[#eadfd8] px-5 py-4">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => toggleFilterSection('category', event)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-lg font-semibold text-[#1f2230]">{filterLabel}</span>
                    <span className={`text-[#757575] transition ${openSection === 'category' ? 'rotate-180' : ''}`}>
                      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
                      </svg>
                    </span>
                  </button>
                  {openSection === 'category' ? (
                    <div className="mt-4 space-y-3">
                      {categories.map((category) => {
                        const active = isOptionActive(category, selectedCategories);

                        return (
                          <label
                            key={category}
                            className={`flex cursor-pointer items-center gap-3 rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition ${
                              active
                                ? 'border-[#c77b6c] bg-[linear-gradient(135deg,rgba(255,247,243,1),rgba(247,228,220,0.96))] text-wine'
                                : 'border-[#ead7ce] bg-white/60 text-[#2c2f3d]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                              className="sr-only"
                            />
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              active ? 'border-[#8c3f56] bg-[#8c3f56]' : 'border-[#c7afa3] bg-white'
                            }`}>
                              <span className="h-2.5 w-2.5 rounded-full bg-white" />
                            </span>
                            <span>{category}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="px-5 py-4">
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={(event) => toggleFilterSection('color', event)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-lg font-semibold text-[#1f2230]">Colours</span>
                    <span className={`text-[#757575] transition ${openSection === 'color' ? 'rotate-180' : ''}`}>
                      <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M5.2 7.4a1 1 0 0 1 1.4 0L10 10.8l3.4-3.4a1 1 0 1 1 1.4 1.4l-4.1 4.1a1 1 0 0 1-1.4 0L5.2 8.8a1 1 0 0 1 0-1.4Z" />
                      </svg>
                    </span>
                  </button>
                  {openSection === 'color' ? (
                    <div className="mt-4 space-y-3">
                      {colors.map((color) => {
                        const active = isOptionActive(color, selectedColors);

                        return (
                          <label
                            key={color}
                            className={`flex cursor-pointer items-center gap-3 rounded-[1.1rem] border px-4 py-3 text-sm font-semibold transition ${
                              active
                                ? 'border-[#c77b6c] bg-[linear-gradient(135deg,rgba(255,247,243,1),rgba(247,228,220,0.96))] text-wine'
                                : 'border-[#ead7ce] bg-white/60 text-[#2c2f3d]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => toggleSelection(color, selectedColors, setSelectedColors)}
                              className="sr-only"
                            />
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                              active ? 'border-[#8c3f56] bg-[#8c3f56]' : 'border-[#c7afa3] bg-white'
                            }`}>
                              <span className="h-2.5 w-2.5 rounded-full bg-white" />
                            </span>
                            <span>{color}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-5 flex min-h-[3.4rem] flex-col justify-center rounded-[2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,248,244,0.76),rgba(243,225,217,0.64))] px-5 py-4 shadow-[0_20px_34px_rgba(104,60,53,0.1),inset_0_1px_0_rgba(255,255,255,0.86)]">
              <p className="page-eyebrow">{displayTitle}</p>
              {resultsLabel ? (
                <p className="mt-3 text-sm font-semibold text-ink/68">
                  {isLoadingProducts ? 'Loading products...' : `${resultCount} ${resultsLabel}`}
                </p>
              ) : null}
            </div>

            {productsError && !shouldUseLocalFallback ? (
              <div className="page-card mb-6 p-5 text-sm text-[#9c3a3a]">
                {productsError}
              </div>
            ) : null}

            {displayMode === 'table' && visibleProducts.length ? (
              <div className="min-h-[24rem] overflow-hidden rounded-[1.4rem] border border-[#ead7ce] bg-white/70 shadow-[0_18px_40px_rgba(111,72,61,0.08)]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#ead7ce] text-left text-sm">
                    <thead className="bg-[#f8efe7]/80 text-xs font-semibold uppercase tracking-[0.12em] text-ink/54">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Image</th>
                        <th className="min-w-[8rem] px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ead7ce]/80 bg-white/45">
                      {visibleProducts.map((product) => {
                        const originalPrice = product.originalPrice ?? product.price;
                        const discountPercentage = getDiscountPercentage(originalPrice, product.price);
                        const wishlistItemId = product.id !== undefined ? String(product.id) : product.slug;

                        return (
                          <tr key={`${wishlistItemId}-${product.slug}`}>
                            <td className="px-4 py-3 align-middle font-semibold text-wine">{sanitizeDisplayText(product.name)}</td>
                            <td className="px-4 py-3 align-middle text-ink/68">{product.category}</td>
                            <td className="px-4 py-3 align-middle font-semibold text-[#4a2a2c]">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span>{formatPrice(product.price)}</span>
                                {discountPercentage > 0 ? (
                                  <span className="text-xs text-ink/38 line-through">{formatPrice(originalPrice)}</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3 align-middle">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="h-14 w-14 rounded-lg object-cover" />
                              ) : (
                                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#f8efe7] text-[10px] font-semibold text-ink/42">
                                  No image
                                </span>
                              )}
                            </td>
                            <td className="min-w-[8rem] px-4 py-3 align-middle">
                              <button
                                type="button"
                                onClick={() => navigateToProductImage(product.slug, product.image)}
                                className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#682640]"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {displayMode === 'grid' ? (
              <div className={`catalog-grid min-h-[32rem] ${
                cardVariant === 'editorial' ? 'catalog-grid-editorial' : 'catalog-grid-default'
              }`}>
              {visibleProducts.map((product) => {
                const originalPrice = product.originalPrice ?? product.price;
                const discountPercentage = getDiscountPercentage(originalPrice, product.price);
                const isEditorial = cardVariant === 'editorial';
                const shouldLockCardSize = isEditorial || equalCardHeights;
                const wishlistItemId = product.id !== undefined ? String(product.id) : product.slug;
                const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

                return (
                  <article
                    key={`${wishlistItemId}-${product.slug}`}
                    className={`page-card catalog-product-card group flex w-full !min-h-0 flex-col overflow-hidden ${
                      isEditorial
                        ? 'rounded-[2.3rem] border border-white/85 bg-[linear-gradient(180deg,rgba(255,252,249,0.98),rgba(247,236,228,0.92))] p-3.5 shadow-[0_26px_50px_rgba(108,61,50,0.12),inset_0_1px_0_rgba(255,255,255,0.86)]'
                        : 'p-3'
                    } ${shouldLockCardSize ? 'h-[23.25rem]' : ''}`}
                  >
                    <div
                      className={`catalog-product-image product-image-wrap relative w-full overflow-hidden ${
                        isEditorial
                          ? `rounded-[1.9rem] ${shouldLockCardSize ? '!h-[14rem] !min-h-[14rem]' : showCardCartAction ? 'min-h-[19rem]' : 'min-h-[20rem]'}`
                          : `rounded-[1.7rem] ${showCardCartAction ? '' : 'min-h-[18rem]'}`
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => navigateToProductImage(product.slug, product.image)}
                        className="h-full w-full text-left"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className={`h-full w-full cursor-pointer object-cover object-top transition duration-500 ${isEditorial ? 'group-hover:scale-[1.04]' : 'hover:scale-105'}`}
                          />
                        ) : (
                          <span className="flex h-full min-h-[18rem] w-full items-center justify-center bg-white/55 px-4 text-center text-sm font-semibold text-ink/48">
                            Image not available
                          </span>
                        )}
                        {isEditorial ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#2c1820]/12 via-transparent to-transparent" /> : null}
                        <span className="product-badge">{isOutOfStock ? 'Out of Stock' : product.occasion ?? product.offerTag ?? product.badge ?? product.category}</span>
                        <ProductRatingBadge rating={product.rating} seed={product.slug} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleWishlist(wishlistItemId)}
                        className={`product-card-wishlist ${isInWishlist(wishlistItemId) ? 'product-icon-btn-active' : ''}`}
                        aria-label={`${isInWishlist(wishlistItemId) ? 'Remove' : 'Add'} ${sanitizeDisplayText(product.name)} from wishlist`}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                          <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3 5.7 5.7 0 0 1 12 5.2 5.7 5.7 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" />
                        </svg>
                      </button>
                    </div>

                    <div
                      className={`product-card-body !min-h-0 flex-none justify-start overflow-hidden pt-2 ${
                        shouldLockCardSize ? '!h-[7.25rem]' : '!h-auto'
                      } ${shouldLockCardSize ? 'gap-1' : 'gap-2'} ${isEditorial ? 'px-3 pb-3' : ''}`}
                    >
                      <div className={`flex items-center justify-between gap-2 ${isEditorial ? 'border-b border-[#efe2da] pb-1.5' : ''}`}>
                        <p className={`min-w-0 truncate ${isEditorial ? 'text-[11px] tracking-[0.28em] text-ink/48' : 'text-xs tracking-[0.2em] text-ink/42'} uppercase`}>{product.category}</p>
                        <p className={`max-w-[6.5rem] shrink-0 truncate whitespace-nowrap text-center ${isEditorial ? 'rounded-full border border-[#ead7ce] bg-white/72 px-3 py-1 text-[11px]' : 'rounded-full bg-[#f8efe7] px-3 py-1 text-xs'} font-semibold text-wine`}>{product.color}</p>
                      </div>

                      <h2 className={`catalog-product-title line-clamp-2 font-medium leading-snug text-wine ${isEditorial ? 'mt-0 text-[1.08rem]' : 'mt-0.5 text-[1rem]'}`}>
                        {sanitizeDisplayText(product.name)}
                      </h2>
                      <div className={`catalog-product-meta flex items-center justify-between gap-3 ${isEditorial ? 'pt-0' : ''}`}>
                        <div className="min-w-0 flex items-baseline gap-2">
                          <p className={`shrink-0 font-semibold text-[#4a2a2c] ${isEditorial ? 'text-[1.22rem]' : 'text-[1rem]'}`}>{formatPrice(product.price)}</p>
                          <p className={`shrink-0 line-through ${isEditorial ? 'text-[0.82rem] text-ink/38' : 'text-[12px] text-ink/42'}`}>{formatPrice(originalPrice)}</p>
                        </div>
                        {discountPercentage > 0 ? (
                          <p className={`ml-auto shrink-0 rounded-full text-right font-semibold text-[#c46b55] ${isEditorial ? 'bg-[#fff1e8] px-2.5 py-1 text-[0.72rem] shadow-[0_10px_20px_rgba(196,107,85,0.08)]' : 'bg-[#fff0ea] px-2 py-0.5 text-[11px]'}`}>
                            {discountPercentage}% Off
                          </p>
                        ) : null}
                      </div>

                    </div>
                  </article>
                );
              })}
              </div>
            ) : null}

            {isLoadingProducts ? (
              <div className="mt-8 text-center text-sm font-semibold text-ink/60">
                Loading products...
              </div>
            ) : null}

            {resolvedTotalPages > 1 ? (
              <div className="mt-6 border-t border-[#eadfd8] pt-5">
                <div className="flex flex-col gap-4 rounded-[1.8rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,248,244,0.72),rgba(243,225,217,0.5))] px-5 py-4 shadow-[0_14px_28px_rgba(104,60,53,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-ink/68">
                    Page {currentPage} of {resolvedTotalPages}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      className="rounded-full border border-[#ead7ce] bg-white/88 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-wine transition hover:border-[#c77b6c] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#ead7ce]"
                    >
                      Previous
                    </button>

                    {visiblePageNumbers.map((pageNumber, index) =>
                      pageNumber === 0 ? (
                        <span key={`ellipsis-${index}`} className="px-1 text-sm font-semibold text-ink/42">
                          ...
                        </span>
                      ) : (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition ${
                            currentPage === pageNumber
                              ? 'bg-[#8c3f56] text-white shadow-[0_10px_20px_rgba(140,63,86,0.18)]'
                              : 'border border-[#ead7ce] bg-white/88 text-wine hover:border-[#c77b6c] hover:bg-white'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage === resolvedTotalPages}
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, resolvedTotalPages))}
                      className="rounded-full border border-[#ead7ce] bg-white/88 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-wine transition hover:border-[#c77b6c] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[#ead7ce]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {!isLoadingProducts && visibleProducts.length === 0 ? (
              <div className="page-card mt-6 p-8 text-center">
                <h3 className="font-display text-3xl text-wine">{emptyTitle}</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/66">{emptyDescription}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

export default CatalogBrowserPage;
