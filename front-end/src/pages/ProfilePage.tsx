import { useEffect, useState } from 'react';
import commonApi, { type Order, type SavedAddress } from '../api/commonapi';
import { useCatalog } from '../context/CatalogContext';
import { useShop } from '../context/ShopContext';
import FooterPage from './FooterPage';
import { navigateTo, navigateToProduct } from '../utils/navigation';

type ProfileSection = 'profile' | 'orders' | 'addresses' | 'reviews' | 'wishlist';

type ProfileFormErrors = {
  name?: string;
  phone?: string;
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

const namePattern = /^[A-Za-z\s]+$/;
const getNameError = (name: string) => {
  const trimmedName = name.trim().replace(/\s+/g, ' ');

  if (trimmedName.length < 2) {
    return 'Enter a valid full name.';
  }

  if (!namePattern.test(trimmedName)) {
    return 'Name should contain only letters and spaces.';
  }

  if (!/^[A-Z]/.test(trimmedName)) {
    return 'Name must start with a capital letter.';
  }

  if (!trimmedName.split(' ').every((part) => /^[A-Z][a-zA-Z]*$/.test(part))) {
    return 'Each name word must start with a capital letter.';
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

const formatPrice = (price: number) => `Rs. ${price.toLocaleString('en-IN')}`;
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

function ProfilePage() {
  const { products } = useCatalog();
  const { currentUser, logout, updateProfile, wishlistItems, toggleWishlist } = useShop();
  const [activeSection, setActiveSection] = useState<ProfileSection>('profile');
  const [name, setName] = useState(currentUser?.fullName ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);
  const [addressErrors, setAddressErrors] = useState<AddressFormErrors>({});
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressStatus, setAddressStatus] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(true);
  const [isMyStuffOpen, setIsMyStuffOpen] = useState(true);
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    if (!currentUser) {
      navigateTo('/login');
      return;
    }

    setName(currentUser.fullName ?? '');
    setPhone(currentUser.phone ?? '');
  }, [currentUser]);

  useEffect(() => {
    if (activeSection !== 'addresses' || !currentUser) {
      return;
    }

    let isMounted = true;

    const loadAddresses = async () => {
      setIsLoadingAddresses(true);
      setAddressStatus('');

      try {
        const result = await commonApi.addresses.list();

        if (isMounted) {
          setAddresses(result);
        }
      } catch (error) {
        if (isMounted) {
          setAddressStatus(error instanceof Error ? error.message : 'Unable to load saved addresses.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingAddresses(false);
        }
      }
    };

    void loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [activeSection, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    let isMounted = true;
    setIsLoadingOrders(true);
    setOrdersError('');
    const ordersRequest = isAdminUser
      ? commonApi.adminOrders.getAll(currentUser.token, { limit: 100 }).then((response) => response.orders)
      : commonApi.order.getAll();

    ordersRequest
      .then((data) => {
        if (isMounted) {
          setOrders(data);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setOrdersError(error instanceof Error ? error.message : 'Unable to fetch orders.');
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingOrders(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, isAdminUser]);

  if (!currentUser) {
    return null;
  }

  const validateProfile = () => {
    const nextErrors: ProfileFormErrors = {};
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters.';
    } else if (!namePattern.test(trimmedName)) {
      nextErrors.name = 'Name should contain only letters and spaces.';
    }

    if (!/^\d{10}$/.test(trimmedPhone)) {
      nextErrors.phone = 'Enter a valid 10-digit mobile number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');

    if (!validateProfile()) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateProfile(name.trim(), phone.trim());
      setStatus(result.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setAddressStatus('');

    try {
      await commonApi.addresses.remove(addressId);
      setAddresses((currentAddresses) => currentAddresses.filter((address) => address.id !== addressId));
      setAddressStatus('Address deleted successfully.');
    } catch (error) {
      setAddressStatus(error instanceof Error ? error.message : 'Unable to delete this address.');
    }
  };

  const handleAddressChange = (field: keyof AddressFormState, value: string) => {
    setAddressStatus('');
    setAddressErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setAddressForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === 'phone' || field === 'pincode'
          ? value.replace(/[^0-9]/g, '')
          : field === 'full_name' || field === 'state' || field === 'city'
            ? value.replace(/[^A-Za-z\s]/g, '')
            : value
    }));
  };

  const validateAddress = () => {
    const nextErrors: AddressFormErrors = {};
    const nextAddress = {
      ...addressForm,
      full_name: addressForm.full_name.trim(),
      phone: addressForm.phone.trim(),
      pincode: addressForm.pincode.trim(),
      state: addressForm.state.trim(),
      city: addressForm.city.trim(),
      address_line1: addressForm.address_line1.trim(),
      address_line2: addressForm.address_line2.trim(),
      landmark: addressForm.landmark.trim()
    };

    const nameError = getNameError(nextAddress.full_name);
    const phoneError = getIndianPhoneError(nextAddress.phone);

    if (nameError) nextErrors.full_name = nameError;
    if (phoneError) nextErrors.phone = phoneError;
    if (!/^\d{6}$/.test(nextAddress.pincode)) nextErrors.pincode = 'Enter a valid 6-digit pincode.';
    if (nextAddress.state.length < 2) nextErrors.state = 'State is required.';
    if (nextAddress.city.length < 2) nextErrors.city = 'City is required.';
    if (nextAddress.address_line1.length < 2) nextErrors.address_line1 = 'House / flat number is required.';
    if (nextAddress.address_line2.length < 4) nextErrors.address_line2 = 'Area / street must be at least 4 characters.';
    if (nextAddress.landmark && nextAddress.landmark.length < 3) nextErrors.landmark = 'Enter a valid landmark or leave it empty.';

    setAddressErrors(nextErrors);
    return { nextAddress, isValid: Object.keys(nextErrors).length === 0 };
  };

  const handleSaveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const scrollY = window.scrollY;
    const { nextAddress, isValid } = validateAddress();

    if (!isValid) {
      setAddressStatus('Please fix the highlighted fields.');
      return;
    }

    setIsSavingAddress(true);
    setAddressStatus('');

    try {
      const createdAddress = await commonApi.addresses.create({
        full_name: nextAddress.full_name,
        phone: nextAddress.phone,
        pincode: nextAddress.pincode,
        state: nextAddress.state,
        city: nextAddress.city,
        address_line1: nextAddress.address_line1,
        address_line2: nextAddress.address_line2,
        landmark: nextAddress.landmark || null,
        address_type: nextAddress.address_type,
        is_default: addresses.length === 0
      });

      setAddresses((currentAddresses) => [createdAddress, ...currentAddresses]);
      setAddressForm(emptyAddressForm);
      setAddressErrors({});
      setIsAddressFormOpen(false);
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

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toLowerCase() ?? 'pending';

    if (normalizedStatus === 'delivered') return 'bg-[#e8f6ea] text-[#2b8a4b]';
    if (normalizedStatus === 'cancelled') return 'bg-[#fff0f0] text-[#d44b4b]';
    if (normalizedStatus === 'placed') return 'bg-[#fff8e1] text-[#f9a825]';
    return 'bg-[#e3f2fd] text-[#1976d2]';
  };

  const userInitial = (currentUser.fullName || currentUser.email).trim().charAt(0).toUpperCase();
  const wishlistProducts = wishlistItems
    .map((itemId) => {
      const product = products.find((item) => String(item.id ?? '') === itemId || item.slug === itemId || item.name === itemId);

      if (!product) {
        return null;
      }

      return { itemId, product };
    })
    .filter((item): item is { itemId: string; product: (typeof products)[number] } => Boolean(item));

  const menuButtonClass = (section: ProfileSection) =>
    `flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition ${
      activeSection === section ? 'bg-[#fff7f3] text-[#7f3150]' : 'text-[#4a2a2c] hover:bg-white/70'
    }`;

  return (
    <div className="px-3 pb-10 pt-0 sm:px-5 sm:pb-12 sm:pt-1 lg:px-8 lg:pb-14 lg:pt-2">
      <div className="app-width flex flex-col gap-8">
        <section className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="h-fit">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="mb-3 w-fit rounded-full border border-[#7f3150] bg-white/72 px-4 py-2 text-xs font-semibold text-[#7f3150] transition hover:bg-[#7f3150] hover:text-white"
            >
              Back to Home
            </button>

            <div className="overflow-hidden rounded-[1.6rem] border border-white/80 bg-white/72 shadow-[0_18px_40px_rgba(90,50,45,0.1)]">
              <div className="flex items-center gap-3 border-b border-[#eadfd8] px-4 py-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#7f3150] text-lg font-semibold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink/52">Hello,</p>
                <p className="mt-1 truncate font-semibold text-wine">{currentUser.fullName}</p>
                <p className="mt-1 truncate text-sm text-ink/58">{currentUser.email}</p>
              </div>
              </div>

              <button type="button" onClick={() => setActiveSection('orders')} className={menuButtonClass('orders')}>
                {isAdminUser ? 'Customer Orders' : 'My Orders'} <span>{orders.length}</span>
              </button>

              <div className="border-t border-[#eadfd8]">
                <button
                  type="button"
                  onClick={() => setIsAccountSettingsOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-4 pb-2 pt-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-ink/58 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7f3150]/30"
                  aria-expanded={isAccountSettingsOpen}
                >
                  Account Settings
                  <span className="text-xl font-semibold leading-none" aria-hidden="true">
                    {isAccountSettingsOpen ? '-' : '+'}
                  </span>
                </button>
                {isAccountSettingsOpen ? (
                  <>
                    <button type="button" onClick={() => setActiveSection('profile')} className={menuButtonClass('profile')}>
                      Profile Information
                    </button>
                    <button type="button" onClick={() => setActiveSection('addresses')} className={menuButtonClass('addresses')}>
                      Manage Addresses
                    </button>
                  </>
                ) : null}
              </div>

              <div className="border-t border-[#eadfd8]">
                <button
                  type="button"
                  onClick={() => setIsMyStuffOpen((current) => !current)}
                  className="flex w-full items-center justify-between px-4 pb-2 pt-4 text-left text-xs font-bold uppercase tracking-[0.16em] text-ink/58 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7f3150]/30"
                  aria-expanded={isMyStuffOpen}
                >
                  My Stuff
                  <span className="text-xl font-semibold leading-none" aria-hidden="true">
                    {isMyStuffOpen ? '-' : '+'}
                  </span>
                </button>
                {isMyStuffOpen ? (
                  <>
                    <button type="button" onClick={() => setActiveSection('reviews')} className={menuButtonClass('reviews')}>
                      My Ratings & Reviews
                    </button>
                    <button type="button" onClick={() => setActiveSection('wishlist')} className={menuButtonClass('wishlist')}>
                      My Wishlist <span>{wishlistItems.length}</span>
                    </button>
                  </>
                ) : null}
              </div>

              <button type="button" onClick={logout} className="flex w-full items-center px-4 py-4 text-left text-sm font-semibold text-[#a13f45] transition hover:bg-[#fff0f0]">
                Logout
              </button>
            </div>
          </aside>

          <section className="page-card p-5 sm:p-6 lg:p-8">
            {activeSection === 'profile' ? (
              <div>
                <p className="page-eyebrow">My Profile</p>
                <h1 className="mt-3 font-display text-4xl text-wine">Profile Information</h1>

                <form className="mt-6 max-w-2xl space-y-5" onSubmit={(event) => void handleSaveProfile(event)}>
                  <label className="block text-sm font-semibold text-[#2a2432]">
                    Name
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value.replace(/[^A-Za-z\s]/g, ''));
                        setErrors((currentErrors) => ({ ...currentErrors, name: undefined }));
                      }}
                      className={`mt-2 w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none ${
                        errors.name ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                      }`}
                    />
                    {errors.name ? <span className="mt-1 block text-xs text-[#d44b4b]">{errors.name}</span> : null}
                  </label>

                  <label className="block text-sm font-semibold text-[#2a2432]">
                    Email Address
                    <input
                      type="email"
                      value={currentUser.email}
                      disabled
                      readOnly
                      className="mt-2 w-full cursor-not-allowed rounded-[1rem] border border-[#eadfd8] bg-[#f8f1eb] px-4 py-3 text-sm text-ink/56 outline-none"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-[#2a2432]">
                    Mobile Number
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value.replace(/[^0-9]/g, '').slice(0, 10));
                        setErrors((currentErrors) => ({ ...currentErrors, phone: undefined }));
                      }}
                      className={`mt-2 w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none ${
                        errors.phone ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                      }`}
                    />
                    {errors.phone ? <span className="mt-1 block text-xs text-[#d44b4b]">{errors.phone}</span> : null}
                  </label>

                  {status ? (
                    <p className={`text-sm font-semibold ${status.toLowerCase().includes('success') ? 'text-[#2b8a4b]' : 'text-[#d44b4b]'}`}>
                      {status}
                    </p>
                  ) : null}

                  <button type="submit" disabled={isSaving} className="rounded-full bg-[#7f3150] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            ) : null}

            {activeSection === 'addresses' ? (
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="page-eyebrow">Account Settings</p>
                    <h1 className="mt-3 font-display text-4xl text-wine">Manage Addresses</h1>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressFormOpen((current) => !current);
                      setAddressStatus('');
                    }}
                    className="rounded-full bg-[#7f3150] px-5 py-3 text-sm font-semibold text-white"
                  >
                    {isAddressFormOpen ? 'Close Form' : '+ Add New Address'}
                  </button>
                </div>
                {addressStatus ? <p className="mt-4 text-sm font-semibold text-[#7f3150]">{addressStatus}</p> : null}
                {isAddressFormOpen ? (
                  <form className="mt-6 grid gap-3 rounded-[1.2rem] border border-[#eadfd8] bg-white/70 p-4" onSubmit={(event) => void handleSaveAddress(event)}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ['full_name', 'Full Name *'],
                        ['phone', 'Phone Number *'],
                        ['pincode', 'Pincode *'],
                        ['state', 'State *'],
                        ['city', 'City *']
                      ] as Array<[keyof AddressFormState, string]>).map(([field, placeholder]) => (
                        <label key={field} className="text-sm font-semibold text-ink/70">
                          {field === 'phone' ? (
                            <div className={`flex overflow-hidden rounded-[1rem] border bg-white ${
                              addressErrors.phone ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                            }`}>
                              <span className="flex items-center border-r border-[#eadfd8] px-4 text-sm font-semibold text-ink/60">
                                +91
                              </span>
                              <input
                                type="tel"
                                value={addressForm.phone}
                                onChange={(event) => handleAddressChange('phone', event.target.value.slice(0, 10))}
                                placeholder={placeholder}
                                className="min-w-0 flex-1 bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                              />
                            </div>
                          ) : (
                            <input
                              type={field === 'pincode' ? 'tel' : 'text'}
                              value={addressForm[field]}
                              onChange={(event) => handleAddressChange(field, event.target.value)}
                              placeholder={placeholder}
                              className={`w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none ${
                                addressErrors[field] ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                              }`}
                            />
                          )}
                          {addressErrors[field] ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressErrors[field]}</span> : null}
                        </label>
                      ))}
                      <select
                        value={addressForm.address_type}
                        onChange={(event) => handleAddressChange('address_type', event.target.value as SavedAddress['address_type'])}
                        className="rounded-[1rem] border border-[#e2c8bc] bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none"
                      >
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    {([
                      ['address_line1', 'House / Flat No *'],
                      ['address_line2', 'Area / Street *'],
                      ['landmark', 'Landmark (Optional)']
                    ] as Array<[keyof AddressFormState, string]>).map(([field, placeholder]) => (
                      <label key={field} className="text-sm font-semibold text-ink/70">
                        <input
                          type="text"
                          value={addressForm[field]}
                          onChange={(event) => handleAddressChange(field, event.target.value)}
                          placeholder={placeholder}
                          className={`w-full rounded-[1rem] border bg-white px-4 py-3 text-sm text-[#2c2f3d] outline-none ${
                            addressErrors[field] ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                          }`}
                        />
                        {addressErrors[field] ? <span className="mt-1 block text-xs text-[#d44b4b]">{addressErrors[field]}</span> : null}
                      </label>
                    ))}
                    <button type="submit" disabled={isSavingAddress} className="w-fit rounded-full bg-[#7f3150] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                      {isSavingAddress ? 'Saving...' : 'Save Address'}
                    </button>
                  </form>
                ) : null}
                {isLoadingAddresses ? (
                  <p className="mt-6 text-sm text-ink/62">Loading saved addresses...</p>
                ) : addresses.length ? (
                  <div className="mt-6 grid gap-4">
                    {addresses.map((address) => (
                      <article key={address.id} className="rounded-[1.2rem] border border-[#eadfd8] bg-white/70 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#2a2432]">{address.full_name}</p>
                              <span className="rounded-full bg-[#f8efe7] px-3 py-1 text-[11px] font-semibold uppercase text-[#7f3150]">
                                {address.address_type}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-medium text-[#2c2f3d]">{formatIndianPhoneDisplay(address.phone)}</p>
                            <p className="mt-2 text-sm leading-6 text-ink/68">{formatAddress(address)}</p>
                          </div>
                          <button type="button" onClick={() => void handleDeleteAddress(address.id)} className="rounded-full border border-[#d44b4b] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#d44b4b] transition hover:bg-[#d44b4b] hover:text-white">
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[1.2rem] border border-dashed border-[#e2c8bc] bg-white/60 p-6 text-center text-sm text-ink/62">
                    No saved addresses found. Add a new address to use it during checkout.
                  </div>
                )}
              </div>
            ) : null}

            {activeSection === 'orders' ? (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#eadfd8] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="page-eyebrow">{isAdminUser ? 'Customer Orders' : 'Your Purchases'}</p>
                    <h1 className="mt-3 font-display text-4xl text-wine">My Orders</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/62">
                      {isAdminUser
                        ? 'View and track all customer orders in one place.'
                        : 'View and track all your orders in one place.'}
                    </p>
                  </div>
                  <div className="rounded-[1.3rem] border border-[#eadfd8] bg-white/70 px-4 py-3 text-sm font-semibold text-[#2a2432]">
                    {orders.length} orders
                  </div>
                </div>

                {isLoadingOrders ? (
                  <div className="py-14 text-center">
                    <p className="text-sm text-ink/62">
                      {isAdminUser ? 'Loading customer orders...' : 'Loading your orders...'}
                    </p>
                  </div>
                ) : ordersError ? (
                  <div className="py-14 text-center">
                    <h2 className="font-display text-2xl text-wine">Unable to load orders</h2>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-ink/62">{ordersError}</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-14 text-center">
                    <h2 className="font-display text-3xl text-wine">No orders yet</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/62">
                      Your order history will appear here once you place your first order.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col gap-4">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => navigateTo(`/orders/${order.id}`)}
                        className="flex w-full flex-col gap-3 rounded-[1.4rem] border border-[#eadfd8] bg-white/70 p-5 text-left transition hover:bg-white sm:flex-row sm:items-center sm:justify-between"
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
                          <p className="mt-3 text-sm text-ink/62">Placed on {formatDate(order.created_at)}</p>
                          {isAdminUser && order.customer_name ? (
                            <p className="mt-1 text-sm text-ink/62">{order.customer_name}</p>
                          ) : null}
                          <p className="mt-1 text-sm text-ink/62">
                            {Array.isArray(order.items) ? order.items.length : 0} item
                            {Array.isArray(order.items) && order.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="shrink-0 text-left sm:text-right">
                          <p className="text-xl font-semibold text-[#2a2432]">{formatPrice(order.total_amount ?? 0)}</p>
                          <p className="mt-1 text-xs text-ink/56">Tap to view details</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {activeSection === 'reviews' ? (
              <div>
                <p className="page-eyebrow">My Stuff</p>
                <h1 className="mt-3 font-display text-4xl text-wine">My Ratings & Reviews</h1>
                <div className="mt-6 rounded-[1.2rem] border border-[#eadfd8] bg-white/70 p-6 text-sm leading-7 text-ink/62">
                  Your product reviews will appear here after you submit ratings from product pages.
                </div>
              </div>
            ) : null}

            {activeSection === 'wishlist' ? (
              <div>
                <div className="flex flex-col gap-4 border-b border-[#eadfd8] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="page-eyebrow">Your Favourites</p>
                    <h1 className="mt-3 font-display text-4xl text-wine">My Wishlist</h1>
                  </div>
                  <div className="rounded-[1.3rem] border border-[#eadfd8] bg-white/70 px-4 py-3 text-sm font-semibold text-[#2a2432]">
                    {wishlistItems.length} saved items
                  </div>
                </div>

                {wishlistProducts.length > 0 ? (
                  <div className="mt-2 divide-y divide-[#eadfd8] overflow-hidden rounded-[1.2rem] border border-[#eadfd8] bg-white/70">
                    {wishlistProducts.map(({ itemId, product }) => {
                      const hasDiscount = product.originalPrice && product.originalPrice > product.price;
                      const discount = hasDiscount
                        ? Math.round((((product.originalPrice ?? product.price) - product.price) / (product.originalPrice ?? product.price)) * 100)
                        : 0;
                      const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

                      return (
                        <article key={itemId} className="grid gap-4 px-4 py-5 sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] sm:items-start">
                          <button
                            type="button"
                            onClick={() => navigateToProduct(product.slug)}
                            className="relative h-24 w-20 overflow-hidden rounded-[0.8rem] bg-[#f8f1eb] text-left"
                          >
                            <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                            {isOutOfStock ? (
                              <span className="absolute inset-x-0 bottom-0 bg-white/90 px-1 py-1 text-center text-[10px] font-semibold text-[#d44b4b]">
                                Currently unavailable
                              </span>
                            ) : null}
                          </button>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => navigateToProduct(product.slug)}
                              className="line-clamp-2 text-left text-sm font-semibold text-[#1f4ed8] transition hover:text-[#7f3150]"
                            >
                              {product.name}
                            </button>
                            {isOutOfStock ? (
                              <p className="mt-2 text-sm text-[#2a2432]">Price: Not Available</p>
                            ) : (
                              <div className="mt-3 flex flex-wrap items-end gap-2">
                                <p className="text-xl font-semibold text-[#2a2432]">{formatPrice(product.price)}</p>
                                {hasDiscount ? <p className="text-xs text-ink/42 line-through">{formatPrice(product.originalPrice ?? product.price)}</p> : null}
                                {discount > 0 ? <span className="text-xs font-semibold text-[#2b8a4b]">{discount}% off</span> : null}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => void toggleWishlist(itemId)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition hover:bg-[#fff0f0] hover:text-[#d44b4b]"
                            aria-label={`Remove ${product.name} from wishlist`}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                              <path d="M7 21c-.55 0-1.02-.2-1.41-.59A1.92 1.92 0 0 1 5 19V8H4V6h5V5h6v1h5v2h-1v11c0 .55-.2 1.02-.59 1.41-.39.39-.86.59-1.41.59H7Zm2-4h2v-7H9v7Zm4 0h2v-7h-2v7Z" />
                            </svg>
                          </button>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-14 text-center">
                    <h2 className="font-display text-3xl text-wine">Your wishlist is empty</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-ink/62">
                      Tap the heart icon on any product to save it here.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </section>

        <FooterPage />
      </div>
    </div>
  );
}

export default ProfilePage;
