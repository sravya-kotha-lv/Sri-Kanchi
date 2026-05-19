import { useEffect, useMemo, useRef, useState } from 'react';
import commonApi, { type AdminDiscount, type CouponValidationResult, type SavedAddress } from '../api/commonapi';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import FooterPage from './FooterPage';
import { navigateTo, navigateToProduct } from '../utils/navigation';
import BackButton from '../components/common/BackButton';
import type { CatalogProduct } from '../data/productCatalog';


const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`;

const DEFAULT_DISCOUNT_MINIMUM_ORDER_AMOUNT = 5000;
const CASH_ON_DELIVERY = 'cash_on_delivery';
const SAVED_FOR_LATER_KEY = 'saree-aura-save-for-later';

const toCartPrice = (value: number | string | undefined) => {
  const price = Number(value ?? 0);
  return Number.isFinite(price) ? price : 0;
};

type CartDisplayProduct = CatalogProduct & {
  status?: string | null;
  stock?: number;
};

type SavedForLaterEntry = {
  itemId: string;
  quantity: number;
};

type AddressFormState = {
  full_name: string;
  phone: string;
  pincode: string;
  state: string;
  city: string;
  address_line1: string;
  address_line2: string;
  landmark: string;
  address_type: SavedAddress['address_type'];
};

type AddressFormErrors = Partial<Record<keyof AddressFormState, string>>;

const emptyAddressForm: AddressFormState = {
  full_name: '',
  phone: '',
  pincode: '',
  state: '',
  city: '',
  address_line1: '',
  address_line2: '',
  landmark: '',
  address_type: 'home'
};

const textOnlyPattern = /^[A-Za-z\s]+$/;
const hasRepeatedOnly = (value: string) => /^(.)(\1)+$/.test(value.replace(/\s/g, '').toLowerCase());
const getNameError = (name: string) => {
  const trimmedName = name.trim().replace(/\s+/g, ' ');

  if (trimmedName.length < 2) {
    return 'Enter a valid full name.';
  }

  if (!textOnlyPattern.test(trimmedName)) {
    return 'Name should contain only letters and spaces.';
  }

  if (!/^[A-Z]/.test(trimmedName)) {
    return 'Name must start with a capital letter.';
  }

  if (!trimmedName.split(' ').every((part) => /^[A-Z][a-zA-Z]*$/.test(part))) {
    return 'Each name word must start with a capital letter.';
  }

  if (hasRepeatedOnly(trimmedName)) {
    return 'Please enter a valid full name.';
  }

  return '';
};

const getIndianPhoneError = (phone: string) => {
  if (!/^\d{10}$/.test(phone)) {
    return 'Enter a valid 10-digit mobile number.';
  }

  if (phone.startsWith('0')) {
    return 'Mobile number cannot start with 0.';
  }

  if (/^(\d)\1{9}$/.test(phone)) {
    return 'Enter a valid mobile number.';
  }

  return '';
};

const formatIndianPhoneDisplay = (phone: string) => {
  const digits = phone.replace(/[^0-9]/g, '').slice(-10);

  return digits ? `+91 ${digits}` : '';
};

function readSavedForLaterEntries(): SavedForLaterEntry[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_FOR_LATER_KEY) ?? '[]') as SavedForLaterEntry[];

    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry.itemId && Number(entry.quantity) > 0)
      : [];
  } catch {
    return [];
  }
}

const formatAddress = (address: SavedAddress) =>
  [
    address.address_line1,
    address.address_line2,
    address.landmark,
    address.city,
    address.state,
    address.pincode
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(', ');

function CartPage() {
  const { products } = useCatalog();
  const { addToCart, cartEntries, cartItems, clearCart, decrementCartItem, incrementCartItem, removeCartItem } = useShop();
  const addressSheetRef = useRef<HTMLDivElement | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState('Select a coupon code to check your savings.');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<AdminDiscount[]>([]);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [placeOrderStatus, setPlaceOrderStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(CASH_ON_DELIVERY);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSelectingAddress, setIsSelectingAddress] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isDeletingAddress, setIsDeletingAddress] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [addressFormErrors, setAddressFormErrors] = useState<AddressFormErrors>({});
  const [addressStatus, setAddressStatus] = useState('');
  const [savedForLaterEntries, setSavedForLaterEntries] = useState<SavedForLaterEntry[]>(() => readSavedForLaterEntries());
  const [savedForLaterStatus, setSavedForLaterStatus] = useState('');

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    setAddressStatus('');

    try {
      const result = await commonApi.addresses.list();
      setAddresses(result);

      const defaultAddress = result.find((address) => address.is_default) ?? result[0] ?? null;
      setSelectedAddress(defaultAddress);
    } catch (error) {
      setAddresses([]);
      setSelectedAddress(null);
      setAddressStatus(error instanceof Error ? error.message : 'Unable to load saved addresses.');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialAddresses = async () => {
      setIsLoadingAddresses(true);

      try {
        const result = await commonApi.addresses.list();

        if (!isMounted) {
          return;
        }

        setAddresses(result);
        setSelectedAddress(result.find((address) => address.is_default) ?? result[0] ?? null);
      } catch (error) {
        if (isMounted) {
          setAddresses([]);
          setSelectedAddress(null);
          setAddressStatus(error instanceof Error ? error.message : 'Unable to load saved addresses.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddresses(false);
        }
      }
    };

    void loadInitialAddresses();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAddressModalOpen) {
      return;
    }

    window.requestAnimationFrame(() => {
      addressSheetRef.current?.scrollTo({ top: 0, left: 0 });
    });
  }, [isAddressFormOpen, isAddressModalOpen]);

  const handleSelectAddress = async (address: SavedAddress) => {
    setIsSelectingAddress(true);
    setAddressStatus('');

    try {
      const updatedAddress = await commonApi.addresses.setDefault(address.id);
      setSelectedAddress(updatedAddress);
      setAddresses((currentAddresses) =>
        currentAddresses.map((item) => ({
          ...item,
          is_default: item.id === updatedAddress.id
        }))
      );
      setIsAddressModalOpen(false);
      setPlaceOrderStatus('');
    } catch (error) {
      setAddressStatus(error instanceof Error ? error.message : 'Unable to select this address.');
    } finally {
      setIsSelectingAddress(false);
    }
  };

  const handleAddressFieldChange = (field: keyof AddressFormState, value: string) => {
    setAddressStatus('');
    setAddressFormErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setAddressForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === 'phone' || field === 'pincode'
          ? value.replace(/[^0-9]/g, '')
          : field === 'full_name'
            ? value.replace(/[^A-Za-z\s]/g, '')
            : value
    }));
  };

  const validateAddressForm = () => {
    const nextErrors: AddressFormErrors = {};
    const normalizedForm = {
      full_name: addressForm.full_name.trim(),
      phone: addressForm.phone.trim(),
      pincode: addressForm.pincode.trim(),
      state: addressForm.state.trim(),
      city: addressForm.city.trim(),
      address_line1: addressForm.address_line1.trim(),
      address_line2: addressForm.address_line2.trim(),
      landmark: addressForm.landmark.trim(),
      address_type: addressForm.address_type
    };

    const nameError = getNameError(normalizedForm.full_name);
    const phoneError = getIndianPhoneError(normalizedForm.phone);

    if (nameError) {
      nextErrors.full_name = nameError;
    }

    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    if (!/^\d{6}$/.test(normalizedForm.pincode)) {
      nextErrors.pincode = 'Enter a valid 6-digit pincode.';
    }

    if (normalizedForm.state.length < 2) {
      nextErrors.state = 'State is required.';
    } else if (!textOnlyPattern.test(normalizedForm.state) || hasRepeatedOnly(normalizedForm.state)) {
      nextErrors.state = 'Enter a valid state name.';
    }

    if (normalizedForm.city.length < 2) {
      nextErrors.city = 'City is required.';
    } else if (!textOnlyPattern.test(normalizedForm.city) || hasRepeatedOnly(normalizedForm.city)) {
      nextErrors.city = 'Enter a valid city name.';
    }

    if (normalizedForm.address_line1.length < 2) {
      nextErrors.address_line1 = 'House / flat number is required.';
    } else if (hasRepeatedOnly(normalizedForm.address_line1)) {
      nextErrors.address_line1 = 'Enter a valid house / flat number.';
    }

    if (normalizedForm.address_line2.length < 4) {
      nextErrors.address_line2 = 'Area / street must be at least 4 characters.';
    } else if (hasRepeatedOnly(normalizedForm.address_line2)) {
      nextErrors.address_line2 = 'Enter a valid area / street.';
    }

    if (normalizedForm.landmark && (normalizedForm.landmark.length < 3 || hasRepeatedOnly(normalizedForm.landmark))) {
      nextErrors.landmark = 'Enter a valid landmark or leave it empty.';
    }

    return { normalizedForm, nextErrors };
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const scrollY = window.scrollY;

    const { normalizedForm, nextErrors } = validateAddressForm();
    setAddressFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setAddressStatus('Please fix the highlighted fields.');
      return;
    }

    setIsSavingAddress(true);
    setAddressStatus('');

    try {
      const createdAddress = await commonApi.addresses.create({
        full_name: normalizedForm.full_name,
        phone: normalizedForm.phone,
        pincode: normalizedForm.pincode,
        state: normalizedForm.state,
        city: normalizedForm.city,
        address_line1: normalizedForm.address_line1,
        address_line2: normalizedForm.address_line2,
        landmark: normalizedForm.landmark || null,
        address_type: normalizedForm.address_type,
        is_default: true
      });
      const selectedNewAddress = await commonApi.addresses.setDefault(createdAddress.id);

      setSelectedAddress(selectedNewAddress);
      setAddresses((currentAddresses) => [
        selectedNewAddress,
        ...currentAddresses
          .filter((address) => address.id !== selectedNewAddress.id)
          .map((address) => ({ ...address, is_default: false }))
      ]);
      setAddressForm(emptyAddressForm);
      setAddressFormErrors({});
      setIsAddressFormOpen(false);
      setIsAddressModalOpen(false);
      setPlaceOrderStatus('');
      setAddressStatus('Address saved successfully.');
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, left: 0 });
      });
    } catch (error) {
      setAddressStatus(error instanceof Error ? error.message : 'Unable to save this address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (address: SavedAddress) => {
    setIsDeletingAddress(address.id);
    setAddressStatus('');

    try {
      await commonApi.addresses.remove(address.id);

      setAddresses((currentAddresses) => {
        const nextAddresses = currentAddresses.filter((item) => item.id !== address.id);

        if (selectedAddress?.id === address.id) {
          setSelectedAddress(nextAddresses[0] ?? null);
        }

        return nextAddresses;
      });
      setAddressStatus('Address deleted successfully.');
    } catch (error) {
      setAddressStatus(error instanceof Error ? error.message : 'Unable to delete this address.');
    } finally {
      setIsDeletingAddress(null);
    }
  };

  const getAddressFieldClassName = (field: keyof AddressFormState) =>
    `w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none ${
      addressFormErrors[field] ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
    }`;

  const cartProducts = cartEntries
    .map((entry) => {
      const product = products.find((item) => {
        if (item.slug === entry.itemId || item.name === entry.itemId) {
          return true;
        }

        if (typeof item.id === 'number') {
          return String(item.id) === entry.itemId;
        }

        if (typeof item.id === 'string') {
          return item.id === entry.itemId;
        }

        return false;
      });

      if (!product && !entry.product) {
        return null;
      }

      if (product) {
        return { entry, product };
      }

      const fallbackProduct: CartDisplayProduct = {
        id: entry.product?.id ?? entry.itemId,
        slug: entry.product?.slug?.trim() || entry.itemId,
        name: entry.product?.name?.trim() || 'Cart product',
        category: 'Cart item',
        color: '',
        price: toCartPrice(entry.product?.selling_price ?? entry.product?.price),
        originalPrice: entry.product?.mrp !== undefined ? toCartPrice(entry.product.mrp) : undefined,
        image: entry.product?.image_url ?? '',
        source: 'category',
        stock: entry.product?.stock,
        status: entry.product?.status
      };

      return { entry, product: fallbackProduct };
    })
    .filter((item): item is { entry: (typeof cartEntries)[number]; product: CartDisplayProduct } => Boolean(item));
  const savedForLaterProducts = savedForLaterEntries
    .map((entry) => {
      const product = products.find(
        (item) => item.slug === entry.itemId || item.name === entry.itemId || String(item.id ?? '') === entry.itemId
      );

      return product ? { entry, product } : null;
    })
    .filter((item): item is { entry: SavedForLaterEntry; product: (typeof products)[number] } => Boolean(item));
  const subtotal = cartProducts.reduce((total, item) => total + item.product.price * item.entry.quantity, 0);
  const totalMrp = cartProducts.reduce((total, item) => total + (item.product.originalPrice ?? item.product.price) * item.entry.quantity, 0);
  const platformFee = cartProducts.length > 0 ? 49 : 0;
  const shippingFee = 0;
  const productSavings = totalMrp - subtotal;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const totalAmount = Math.max(0, subtotal - couponDiscount + platformFee + shippingFee);
  const totalSavings = productSavings + couponDiscount;
  const selectedCoupon = availableCoupons.find((coupon) => coupon.code === couponCode);
  const selectedCouponMinimum = Number(selectedCoupon?.min_order_amount ?? DEFAULT_DISCOUNT_MINIMUM_ORDER_AMOUNT);
  const couponMinimumAmount =
    Number.isFinite(selectedCouponMinimum) && selectedCouponMinimum > 0
      ? selectedCouponMinimum
      : DEFAULT_DISCOUNT_MINIMUM_ORDER_AMOUNT;
  const couponShortfall = couponCode ? Math.max(couponMinimumAmount - subtotal, 0) : 0;
  const couponMinimumMessage = `Add items worth ${formatPrice(couponShortfall)} more to use this coupon.`;
  const isShippingDetailsComplete = Boolean(selectedAddress);
  const isPaymentMethodSelected = paymentMethod === CASH_ON_DELIVERY;

  const persistSavedForLaterEntries = (entries: SavedForLaterEntry[]) => {
    setSavedForLaterEntries(entries);
    window.localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(entries));
  };

  const handleSaveForLater = async (itemId: string, quantity: number) => {
    persistSavedForLaterEntries([
      ...savedForLaterEntries.filter((entry) => entry.itemId !== itemId),
      { itemId, quantity }
    ]);
    await removeCartItem(itemId);
    setSavedForLaterStatus('Your product was added to Save For Later.');
  };

  const handleMoveSavedForLaterToCart = async (entry: SavedForLaterEntry) => {
    let addResult = { success: true, message: '' };

    for (let index = 0; index < entry.quantity; index += 1) {
      addResult = await addToCart(entry.itemId);

      if (!addResult.success) {
        setSavedForLaterStatus(addResult.message);
        return;
      }
    }

    persistSavedForLaterEntries(savedForLaterEntries.filter((savedEntry) => savedEntry.itemId !== entry.itemId));
    setSavedForLaterStatus('Your product was moved back to cart.');
  };

  const handleRemoveSavedForLater = (itemId: string) => {
    persistSavedForLaterEntries(savedForLaterEntries.filter((entry) => entry.itemId !== itemId));
    setSavedForLaterStatus('');
  };

  const couponScopes = useMemo(() => {
    const uniqueProductIds = Array.from(
      new Set(
        cartProducts
          .map((item) => item.product.id)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      )
    );

    const uniqueCategoryIds = Array.from(
      new Set(
        cartProducts
          .map((item) => item.product.categoryId)
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      )
    );

    return [
      { product_id: null as number | null, category_id: null as number | null },
      ...uniqueProductIds.map((productId) => ({ product_id: productId, category_id: null as number | null })),
      ...uniqueCategoryIds.map((categoryId) => ({ product_id: null as number | null, category_id: categoryId }))
    ];
  }, [cartProducts]);

  useEffect(() => {
    let isMounted = true;

    const loadCoupons = async () => {
      setIsLoadingCoupons(true);

      try {
        const response = await commonApi.offers.getActive({ limit: 100 });

        if (isMounted) {
          setAvailableCoupons(response.data);
        }
      } catch {
        if (isMounted) {
          setAvailableCoupons([]);
          setCouponStatus('Coupon codes are not available right now.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCoupons(false);
        }
      }
    };

    void loadCoupons();

    return () => {
      isMounted = false;
    };
  }, []);

  const resetCouponState = (message = 'Select a coupon code to check your savings.') => {
    setAppliedCoupon(null);
    setCouponStatus(message);
  };

  useEffect(() => {
    if (!cartProducts.length) {
      setCouponCode('');
      resetCouponState('Select a coupon code to check your savings.');
      return;
    }

    if (couponCode && couponShortfall > 0) {
      resetCouponState(couponMinimumMessage);
      return;
    }

    if ((!couponCode || couponShortfall === 0) && !appliedCoupon && couponStatus.startsWith('Add items worth')) {
      resetCouponState();
    }
  }, [appliedCoupon, cartProducts.length, couponCode, couponMinimumMessage, couponShortfall, couponStatus]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponStatus('Select a coupon code first.');
      return;
    }

    if (!cartProducts.length) {
      setCouponStatus('Add products to cart before applying a coupon.');
      return;
    }

    if (couponShortfall > 0) {
      resetCouponState(couponMinimumMessage);
      return;
    }

    setIsApplyingCoupon(true);

    try {
      let result: CouponValidationResult | null = null;
      let lastError: Error | null = null;

      for (const scope of couponScopes) {
        try {
          result = await commonApi.offers.validateCoupon({
            code: couponCode.trim().toUpperCase(),
            order_amount: subtotal,
            product_id: scope.product_id,
            category_id: scope.category_id
          });
          break;
        } catch (error) {
          const nextError = error instanceof Error ? error : new Error('Unable to validate this coupon right now.');

          if (!nextError.message.toLowerCase().includes('invalid or inactive')) {
            throw nextError;
          }

          lastError = nextError;
        }
      }

      if (!result) {
        throw lastError ?? new Error('Coupon is invalid or inactive');
      }

      setAppliedCoupon(result);
      setCouponCode(result.coupon.code);
      setCouponStatus(`${result.coupon.code} applied successfully. You save ${formatPrice(result.discountAmount)}.`);
    } catch (error) {
      resetCouponState(error instanceof Error ? error.message : 'Unable to validate this coupon right now.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    resetCouponState('Coupon removed from this cart summary.');
  };

  const getOrderProductId = (item: { entry: (typeof cartEntries)[number]; product: CartDisplayProduct }) => {
    if (typeof item.product.id === 'number' && Number.isFinite(item.product.id)) {
      return item.product.id;
    }

    if (typeof item.product.id === 'string') {
      const parsedProductId = Number(item.product.id);

      if (Number.isFinite(parsedProductId)) {
        return parsedProductId;
      }
    }

    if (typeof item.entry.product?.id === 'number' && Number.isFinite(item.entry.product.id)) {
      return item.entry.product.id;
    }

    if (typeof item.entry.product?.id === 'string') {
      const parsedEntryProductId = Number(item.entry.product.id);

      if (Number.isFinite(parsedEntryProductId)) {
        return parsedEntryProductId;
      }
    }

    return null;
  };

  const syncVisibleCartBeforeOrder = async () => {
    const cart = await commonApi.cart.getCart();
    const backendQuantityByProductId = new Map<number, number>();

    cart.items.forEach((item) => {
      backendQuantityByProductId.set(item.product_id, item.quantity);
    });

    for (const item of cartProducts) {
      const productId = getOrderProductId(item);

      if (!productId) {
        continue;
      }

      const backendQuantity = backendQuantityByProductId.get(productId) ?? 0;
      const missingQuantity = item.entry.quantity - backendQuantity;

      if (missingQuantity > 0) {
        await commonApi.cart.addItem({ product_id: productId, quantity: missingQuantity });
      }
    }
  };

  const handlePlaceOrder = async () => {
    if (!cartProducts.length) {
      setPlaceOrderStatus('Your cart is empty. Add items before placing an order.');
      return;
    }

    if (!selectedAddress) {
      setPlaceOrderStatus('Please select a delivery address.');
      return;
    }

    if (!isPaymentMethodSelected) {
      setPlaceOrderStatus('Select Cash on Delivery before placing the order.');
      return;
    }

    setIsPlacingOrder(true);
    setPlaceOrderStatus('');

    try {
      await syncVisibleCartBeforeOrder();
      await commonApi.order.create({
        customer_name: selectedAddress.full_name,
        customer_phone: selectedAddress.phone,
        shipping_address: formatAddress(selectedAddress),
        payment_method: paymentMethod
      });
      setPlaceOrderStatus('Order placed successfully!');
      await clearCart();
      navigateTo('/orders');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to place order right now.';
      setPlaceOrderStatus(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width flex flex-col gap-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.78fr)]">
          <div className="page-card overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-[#eadfd8] bg-white/75 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            

<div className="flex items-start gap-4">
  <BackButton fallbackPath="/" />
  <div>
    <p className="page-eyebrow">Shopping Cart</p>
    <h1 className="mt-3 font-display text-4xl text-wine">Cart Items</h1>
  </div>
</div>

            </div>

            {cartProducts.length > 0 ? (
              <div>
                {cartProducts.map((item) => {
                  const { entry, product } = item;
                  const itemOriginalPrice = product.originalPrice ?? product.price;
                  const itemSavings = itemOriginalPrice - product.price;
                  const itemDiscount = itemSavings > 0 ? Math.round((itemSavings / itemOriginalPrice) * 100) : 0;
                  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
                  const hasReachedStockLimit = typeof product.stock === 'number' && entry.quantity >= product.stock;
                  const isUnavailableProduct = product.status === 'inactive' || product.status === 'archived' || isOutOfStock;

                  return (
                    <article key={entry.itemId} className="border-b border-[#eadfd8] px-5 py-5 sm:px-6">
                      <div className="grid gap-5 sm:grid-cols-[7rem_minmax(0,1fr)]">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isUnavailableProduct) {
                              navigateToProduct(product.slug);
                            }
                          }}
                          className="overflow-hidden rounded-[1.3rem] bg-[#f7eee7] text-left"
                        >
                          <img src={product.image} alt={product.name} className="h-32 w-full object-cover object-top sm:h-36" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isUnavailableProduct) {
                                    navigateToProduct(product.slug);
                                  }
                                }}
                                className="line-clamp-2 text-left text-xl font-semibold text-[#2a2432]"
                              >
                                {product.name}
                              </button>
                              <p className="mt-1 text-sm text-ink/56">{product.category} / {product.color}</p>
                              <p className={`mt-2 text-sm ${isOutOfStock ? 'font-semibold text-[#a13f45]' : 'text-[#5a6b3d]'}`}>
                                {isOutOfStock ? 'Out of Stock' : 'Delivery in 3-5 business days'}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-2xl font-semibold text-[#2a2432]">{formatPrice(product.price * entry.quantity)}</p>
                                <p className="text-sm text-ink/42 line-through">{formatPrice(itemOriginalPrice * entry.quantity)}</p>
                                {itemDiscount > 0 ? <span className="text-sm font-semibold text-[#2b8a4b]">{itemDiscount}% Off</span> : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => void decrementCartItem(entry.itemId)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c8bc] bg-white text-lg font-semibold text-[#221d18]"
                              >
                                -
                              </button>
                              <span className="min-w-10 rounded-[0.9rem] border border-[#eadfd8] bg-white px-4 py-2 text-center text-sm font-semibold text-[#221d18]">
                                {entry.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={hasReachedStockLimit || isOutOfStock}
                                onClick={() => void incrementCartItem(entry.itemId)}
                                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d8c8bc] bg-white text-lg font-semibold text-[#221d18] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-5 text-sm font-semibold uppercase tracking-[0.12em] text-[#7f3150]">
                              <button
                                type="button"
                                onClick={() => void handleSaveForLater(entry.itemId, entry.quantity)}
                              >
                                Save For Later
                              </button>
                              <button type="button" onClick={() => void removeCartItem(entry.itemId)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}

                <div className="border-t border-[#eadfd8] px-5 py-5 sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Delivery Address</p>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="rounded-full border border-[#7f3150] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f3150] transition hover:bg-[#7f3150] hover:text-white"
                    >
                      {selectedAddress ? 'Change' : '+ Add Address'}
                    </button>
                  </div>

                  {isLoadingAddresses ? (
                    <p className="mt-4 text-sm text-ink/62">Loading saved addresses...</p>
                  ) : selectedAddress ? (
                    <div className="mt-4 rounded-[1.2rem] border border-[#eadfd8] bg-white/75 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#2a2432]">{selectedAddress.full_name}</p>
                        <span className="rounded-full bg-[#f8efe7] px-3 py-1 text-[11px] font-semibold uppercase text-[#7f3150]">
                          {selectedAddress.address_type}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-[#2c2f3d]">{formatIndianPhoneDisplay(selectedAddress.phone)}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/68">{formatAddress(selectedAddress)}</p>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.2rem] border border-dashed border-[#e2c8bc] bg-white/60 p-5 text-center">
                      <p className="text-sm text-ink/62">No delivery address saved yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="mt-3 rounded-full bg-[#7f3150] px-5 py-2 text-sm font-semibold text-white"
                      >
                        Add Delivery Address
                      </button>
                    </div>
                  )}

                  {addressStatus ? (
                    <p className={`mt-3 text-sm font-semibold ${
                      addressStatus.toLowerCase().includes('success') ? 'text-[#2b8a4b]' : 'text-[#a13f45]'
                    }`}>
                      {addressStatus}
                    </p>
                  ) : null}
                </div>

                <div className="border-t border-[#eadfd8] px-5 py-5 sm:px-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Payment Module</p>
                  <div className="mt-3 grid gap-3">
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-[1.1rem] border px-4 py-3 text-sm transition ${
                        isPaymentMethodSelected
                          ? 'border-[#7f3150] bg-[#fff7f3] text-[#2c2f3d] shadow-[0_12px_24px_rgba(127,49,80,0.08)]'
                          : 'border-[#e2c8bc] bg-white text-[#2c2f3d]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment-method"
                        value={CASH_ON_DELIVERY}
                        checked={paymentMethod === CASH_ON_DELIVERY}
                        onChange={(event) => {
                          setPaymentMethod(event.target.value);
                          setPlaceOrderStatus('');
                        }}
                        className="mt-1 h-4 w-4 accent-[#7f3150]"
                      />
                      <span>
                        <span className="block font-semibold">Cash on Delivery</span>
                        <span className="mt-1 block text-xs leading-5 text-ink/62">
                          Pay for products after receiving the delivery.
                        </span>
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.1rem] border border-[#eadfd8] bg-white/65 px-4 py-3">
                        <p className="text-sm font-semibold text-[#2c2f3d]">Payment Verification</p>
                        <p className="mt-1 text-xs leading-5 text-ink/62">
                          Order confirmation continues after selecting an available payment method.
                        </p>
                      </div>
                      <div className="rounded-[1.1rem] border border-[#eadfd8] bg-white/65 px-4 py-3">
                        <p className="text-sm font-semibold text-[#2c2f3d]">Refund Processing</p>
                        <p className="mt-1 text-xs leading-5 text-ink/62">
                          Refund support remains available for cancelled or returned orders.
                        </p>
                      </div>
                    </div>

                    {!isPaymentMethodSelected ? (
                      <p className="text-sm font-semibold text-[#a13f45]">
                        Select Cash on Delivery to continue placing this order.
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 px-5 py-5 sm:px-6">
                  {placeOrderStatus ? (
                    <p className={`text-sm ${placeOrderStatus.includes('success') ? 'text-[#2b8a4b]' : 'text-[#d44b4b]'}`}>
                      {placeOrderStatus}
                    </p>
                  ) : null}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => void clearCart()}
                      className="rounded-[1.1rem] border border-[#d44b4b] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[#d44b4b] transition hover:bg-[#d44b4b] hover:text-white"
                    >
                      Clear Cart
                    </button>
                    <button
                      type="button"
                      disabled={isPlacingOrder || !cartProducts.length || !isShippingDetailsComplete || !isPaymentMethodSelected}
                      onClick={() => void handlePlaceOrder()}
                      className="rounded-[1.1rem] bg-[#f97316] px-10 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPlacingOrder ? 'Placing...' : 'Place Order'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-5 py-14 text-center sm:px-6">
                <h2 className="font-display text-3xl text-wine">Your cart is empty</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink/62">
                  Add your favourite sarees to the cart and they will show up here with quantity controls and price details.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="liquid-btn mx-auto mt-6 flex justify-center px-6 py-3 text-sm font-semibold text-white"
                >
                  Continue Shopping
                </button>
              </div>
            )}

            {savedForLaterProducts.length ? (
              <div className="border-t border-[#eadfd8] px-5 py-5 sm:px-6">
                <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Saved For Later</p>
                {savedForLaterStatus ? (
                  <div className="mt-3 rounded-[1rem] border border-[#eadfd8] bg-white/75 px-4 py-3 text-sm font-semibold text-[#2b8a4b]">
                    {savedForLaterStatus}
                  </div>
                ) : null}
                <div className="mt-4 grid gap-3">
                  {savedForLaterProducts.map(({ entry, product }) => (
                    <div
                      key={entry.itemId}
                      className="flex flex-col gap-3 rounded-[1.2rem] border border-[#eadfd8] bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="h-16 w-16 rounded-[1rem] object-cover" />
                        ) : (
                          <span className="flex h-16 w-16 items-center justify-center rounded-[1rem] bg-[#f8efe7] text-[10px] font-semibold text-ink/42">
                            No image
                          </span>
                        )}
                        <div>
                          <p className="font-semibold text-wine">{product.name}</p>
                          <p className="mt-1 text-sm text-ink/60">Saved quantity: {entry.quantity}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleMoveSavedForLaterToCart(entry)}
                          className="rounded-full bg-[#7f3150] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#682640]"
                        >
                          Move To Cart
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSavedForLater(entry.itemId)}
                          className="rounded-full border border-[#d8c8bc] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f3150] transition hover:bg-[#f5ebe3]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

          </div>

          <aside className="page-card h-fit p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#2a2432]">Price details</h2>

            <div className="mt-5 rounded-[1.5rem] border border-[#eadfd8] bg-white/70 p-4">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/42">Coupon Code</label>
              <div className="mt-3 flex gap-3">
                <select
                  value={couponCode}
                  onChange={(event) => {
                    setCouponCode(event.target.value);
                    resetCouponState();
                  }}
                  disabled={isLoadingCoupons || !availableCoupons.length || !cartProducts.length}
                  className="min-w-0 flex-1 rounded-[1rem] border border-[#e2c8bc] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {isLoadingCoupons
                      ? 'Loading coupons...'
                      : availableCoupons.length
                        ? 'Select coupon code'
                        : 'No coupons available'}
                  </option>
                  {availableCoupons.map((coupon) => (
                    <option key={coupon.id} value={coupon.code}>
                      {coupon.code} - {coupon.title} (Min {formatPrice(Number(coupon.min_order_amount ?? DEFAULT_DISCOUNT_MINIMUM_ORDER_AMOUNT))})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isApplyingCoupon || !cartProducts.length || !couponCode || couponShortfall > 0}
                  onClick={() => void handleApplyCoupon()}
                  className="rounded-[1rem] bg-[#7f3150] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApplyingCoupon ? 'Applying...' : 'Apply'}
                </button>
              </div>
              <p className={`mt-3 text-sm ${appliedCoupon ? 'text-[#2b8a4b]' : 'text-ink/62'}`}>{couponStatus}</p>
              {appliedCoupon ? (
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#a13f45]"
                >
                  Remove Coupon
                </button>
              ) : null}
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-[#fbf7f2] p-5">
              <div className="flex items-center justify-between text-sm text-ink/70">
                <span>MRP ({cartItems.length} items)</span>
                <span>{formatPrice(totalMrp)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-ink/70">
                <span>Product Discount</span>
                <span className="font-medium text-[#2b8a4b]">- {formatPrice(productSavings)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-ink/70">
                <span>Coupon Discount</span>
                <span className={`font-medium ${couponDiscount > 0 ? 'text-[#d44b4b]' : 'text-[#2b8a4b]'}`}>
                  {couponDiscount > 0 ? `- ${formatPrice(couponDiscount)}` : 'Not applied'}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-ink/70">
                <span>Platform Fee</span>
                <span>{platformFee === 0 ? 'Free' : formatPrice(platformFee)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-ink/70">
                <span>Delivery</span>
                <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
              </div>
              <div className="mt-5 border-t border-[#eadfd8] pt-5">
                <div className="flex items-center justify-between text-lg font-semibold text-[#2a2432]">
                  <span>Total Amount</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[1.3rem] bg-[#e8f6ea] px-4 py-4 text-sm font-medium text-[#2b8a4b]">
              You will save {formatPrice(totalSavings)} on this order.
            </div>

            {appliedCoupon ? (
              <div className="mt-4 rounded-[1.3rem] border border-[#d6ead9] bg-white/70 px-4 py-4 text-sm text-ink/70">
                <p className="font-semibold text-[#2f7a45]">{appliedCoupon.coupon.code} is active on this cart.</p>
                <p className="mt-2">Validated amount: {formatPrice(appliedCoupon.orderAmount)}</p>
                <p className="mt-1">Discount after validation: {formatPrice(appliedCoupon.discountAmount)}</p>
              </div>
            ) : null}

            <div className="mt-5 flex items-start gap-3 rounded-[1.3rem] border border-[#eadfd8] bg-white/70 px-4 py-4 text-sm text-ink/70">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f6efe8] text-[#5b6570]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M12 2 4.5 5v6.12c0 4.63 3.2 8.95 7.5 9.88 4.3-.93 7.5-5.25 7.5-9.88V5L12 2Zm-1.1 13.4-3.1-3.1 1.4-1.4 1.7 1.68 3.9-3.88 1.4 1.4-5.3 5.3Z" />
                </svg>
              </span>
              <p>Safe and secure payments with authentic products and easy return support.</p>
            </div>
          </aside>
        </section>

        {isAddressModalOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/45 px-0 pb-4 pt-10 sm:items-start sm:px-4 sm:pb-6 sm:pt-32">
            <div
              key={isAddressFormOpen ? 'address-form' : 'address-list'}
              ref={addressSheetRef}
              className="max-h-[calc(100vh-4rem)] w-full overflow-y-auto rounded-t-[1.8rem] border border-white/80 bg-[#fffdfa] p-5 shadow-[0_30px_70px_rgba(31,24,20,0.28)] sm:max-h-[calc(100vh-10rem)] sm:max-w-2xl sm:rounded-[1.8rem] sm:p-6"
            >
              <div className="sticky top-0 z-10 -mx-5 -mt-5 flex items-start justify-between gap-4 border-b border-[#eadfd8] bg-[#fffdfa] px-5 pb-4 pt-5 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-ink/42">Select Delivery Address</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#2a2432]">
                    {isAddressFormOpen ? 'Add New Address' : 'Saved Addresses'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddressModalOpen(false);
                    setIsAddressFormOpen(false);
                    setAddressFormErrors({});
                    setAddressStatus('');
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfd8] bg-white text-xl text-[#7f3150]"
                  aria-label="Close address selector"
                >
                  x
                </button>
              </div>

              {isAddressFormOpen ? (
                <form className="mt-8 grid gap-3" onSubmit={(event) => void handleSaveAddress(event)}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-ink/70">
                      <input
                        type="text"
                        value={addressForm.full_name}
                        onChange={(event) => handleAddressFieldChange('full_name', event.target.value)}
                        placeholder="Full Name *"
                        className={getAddressFieldClassName('full_name')}
                      />
                      {addressFormErrors.full_name ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.full_name}</span> : null}
                    </label>
                    <label className="text-sm font-semibold text-ink/70">
                      <div className={`flex overflow-hidden rounded-[1rem] border bg-white ${
                        addressFormErrors.phone ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                      }`}>
                        <span className="flex items-center border-r border-[#eadfd8] px-4 text-sm font-semibold text-ink/60">
                          +91
                        </span>
                        <input
                          type="tel"
                          value={addressForm.phone}
                          onChange={(event) => handleAddressFieldChange('phone', event.target.value.slice(0, 10))}
                          placeholder="Phone Number *"
                          className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                        />
                      </div>
                      {addressFormErrors.phone ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.phone}</span> : null}
                    </label>
                    <label className="text-sm font-semibold text-ink/70">
                      <input
                        type="tel"
                        value={addressForm.pincode}
                        onChange={(event) => handleAddressFieldChange('pincode', event.target.value.slice(0, 6))}
                        placeholder="Pincode *"
                        className={getAddressFieldClassName('pincode')}
                      />
                      {addressFormErrors.pincode ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.pincode}</span> : null}
                    </label>
                    <label className="text-sm font-semibold text-ink/70">
                      <input
                        type="text"
                        value={addressForm.state}
                        onChange={(event) => handleAddressFieldChange('state', event.target.value)}
                        placeholder="State *"
                        className={getAddressFieldClassName('state')}
                      />
                      {addressFormErrors.state ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.state}</span> : null}
                    </label>
                    <label className="text-sm font-semibold text-ink/70">
                      <input
                        type="text"
                        value={addressForm.city}
                        onChange={(event) => handleAddressFieldChange('city', event.target.value)}
                        placeholder="City *"
                        className={getAddressFieldClassName('city')}
                      />
                      {addressFormErrors.city ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.city}</span> : null}
                    </label>
                    <label className="text-sm font-semibold text-ink/70">
                      <select
                        value={addressForm.address_type}
                        onChange={(event) =>
                          handleAddressFieldChange('address_type', event.target.value as SavedAddress['address_type'])
                        }
                        className={getAddressFieldClassName('address_type')}
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                  </div>
                  <label className="text-sm font-semibold text-ink/70">
                    <input
                      type="text"
                      value={addressForm.address_line1}
                      onChange={(event) => handleAddressFieldChange('address_line1', event.target.value)}
                      placeholder="House / Flat No *"
                      className={getAddressFieldClassName('address_line1')}
                    />
                    {addressFormErrors.address_line1 ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.address_line1}</span> : null}
                  </label>
                  <label className="text-sm font-semibold text-ink/70">
                    <input
                      type="text"
                      value={addressForm.address_line2}
                      onChange={(event) => handleAddressFieldChange('address_line2', event.target.value)}
                      placeholder="Area / Street *"
                      className={getAddressFieldClassName('address_line2')}
                    />
                    {addressFormErrors.address_line2 ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.address_line2}</span> : null}
                  </label>
                  <label className="text-sm font-semibold text-ink/70">
                    <input
                      type="text"
                      value={addressForm.landmark}
                      onChange={(event) => handleAddressFieldChange('landmark', event.target.value)}
                      placeholder="Landmark (Optional)"
                      className={getAddressFieldClassName('landmark')}
                    />
                    {addressFormErrors.landmark ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressFormErrors.landmark}</span> : null}
                  </label>

                  {addressStatus ? (
                    <p className={`text-sm font-semibold ${
                      addressStatus.toLowerCase().includes('success') ? 'text-[#2b8a4b]' : 'text-[#a13f45]'
                    }`}>
                      {addressStatus}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-col gap-3 border-t border-[#eadfd8] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddressFormOpen(false);
                        setAddressFormErrors({});
                        setAddressStatus('');
                      }}
                      className="rounded-full border border-[#eadfd8] bg-white px-5 py-3 text-sm font-semibold text-[#7f3150]"
                    >
                      Back To Addresses
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingAddress}
                      className="rounded-full bg-[#7f3150] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="mt-8 flex flex-col gap-3">
                    {isLoadingAddresses ? (
                  <p className="rounded-[1.1rem] border border-[#eadfd8] bg-white/70 px-4 py-4 text-sm text-ink/62">
                    Loading saved addresses...
                  </p>
                    ) : addresses.length ? (
                      addresses.map((address) => {
                        const isSelected = selectedAddress?.id === address.id;

                        return (
                          <div
                            key={address.id}
                            className={`rounded-[1.2rem] border p-4 transition ${
                              isSelected
                                ? 'border-[#7f3150] bg-[#fff7f3] shadow-[0_12px_24px_rgba(127,49,80,0.08)]'
                                : 'border-[#eadfd8] bg-white/75 hover:border-[#c77b6c]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                disabled={isSelectingAddress}
                                onClick={() => void handleSelectAddress(address)}
                                className="min-w-0 flex-1 text-left disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-[#2a2432]">{address.full_name}</span>
                                  <span className="rounded-full bg-[#f8efe7] px-3 py-1 text-[11px] font-semibold uppercase text-[#7f3150]">
                                    {address.address_type}
                                  </span>
                                  {isSelected ? (
                                    <span className="rounded-full bg-[#e8f6ea] px-3 py-1 text-[11px] font-semibold uppercase text-[#2b8a4b]">
                                      Selected
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-sm font-medium text-[#2c2f3d]">{formatIndianPhoneDisplay(address.phone)}</p>
                                <p className="mt-2 text-sm leading-6 text-ink/68">{formatAddress(address)}</p>
                              </button>
                              <button
                                type="button"
                                disabled={isDeletingAddress === address.id}
                                onClick={() => void handleDeleteAddress(address)}
                                className="shrink-0 rounded-full border border-[#d44b4b] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#d44b4b] transition hover:bg-[#d44b4b] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDeletingAddress === address.id ? 'Deleting' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="rounded-[1.1rem] border border-dashed border-[#e2c8bc] bg-white/65 px-4 py-5 text-center text-sm text-ink/62">
                        No saved addresses found. Add a new address to continue.
                      </p>
                    )}
                  </div>

                  {addressStatus ? (
                    <p className={`mt-4 text-sm font-semibold ${
                      addressStatus.toLowerCase().includes('success') ? 'text-[#2b8a4b]' : 'text-[#a13f45]'
                    }`}>
                      {addressStatus}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3 border-t border-[#eadfd8] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => void loadAddresses()}
                      className="rounded-full border border-[#eadfd8] bg-white px-5 py-3 text-sm font-semibold text-[#7f3150]"
                    >
                      Refresh Addresses
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressForm(emptyAddressForm);
                        setAddressFormErrors({});
                        setAddressStatus('');
                        setIsAddressFormOpen(true);
                      }}
                      className="rounded-full bg-[#7f3150] px-5 py-3 text-sm font-semibold text-white"
                    >
                      + Add New Address
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}

        <FooterPage />
      </div>
    </div>
  );
}

export default CartPage;
