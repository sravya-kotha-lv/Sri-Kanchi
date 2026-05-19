import { useEffect, useMemo, useRef, useState } from 'react';
import commonApi, { type Category, type SearchSuggestion } from '../../api/commonapi';
import { useCatalog } from '../../context/CatalogContext';
import { useShop } from '../../context/ShopContext';
import { navigateTo } from '../../utils/navigation';
import { buildProductSearchQuery, normalizeSearchText } from '../../utils/searchQuery';

type NavItem = {
  label: string;
  href: string;
  items?: Array<{ label: string; href: string }>;
};

const slugifyMenuValue = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const isVisibleCategoryName = (value: string) => {
  const normalized = value.trim().toLowerCase();

  return Boolean(normalized) && normalized !== 'string' && !normalized.includes('test') && !/^\d+$/.test(normalized);
};

const toMenuItems = (values: string[], prefix: '/categories' | '/collections') =>
  Array.from(new Map(
    values
      .map((value) => value.trim())
      .filter(isVisibleCategoryName)
      .map((value) => [slugifyMenuValue(value), { label: value, href: `${prefix}/${slugifyMenuValue(value)}` }])
  ).values());

const toCategoryMenuItems = (categories: Category[]) =>
  Array.from(new Map(
    categories
      .filter((category) => isVisibleCategoryName(category.name))
      .map((category) => {
        const slug = slugifyMenuValue(category.name);
        return [slug, { label: category.name.trim(), href: `/categories/${slug}` }];
      })
  ).values());

const collectionOccasionItems = toMenuItems(['Wedding', 'Party Wear', 'Festival Wear', 'Casual Wear'], '/collections');

type HeaderProps = {
  compact?: boolean;
};

const baseNavItems: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Categories',
    href: '/categories',
    items: []
  },
  {
    label: 'Collections',
    href: '/collections',
    items: [
      { label: 'Banarasi', href: '/collections/banarasi' },
      { label: 'Gadwal', href: '/collections/gadwal' },
      { label: 'Kanchipuram', href: '/collections/kanchipuram' },
      { label: 'Organza', href: '/collections/organza' },
      { label: 'Soft Silk', href: '/collections/soft-silk' }
    ]
  },
  { label: 'New Arrivals', href: '/new-arrivals' }
];

const getDashboardPath = (role?: string) => {
  const normalizedRole = role?.trim().toLowerCase();

  if (normalizedRole === 'superadmin') {
    return '/admin/host-dashboard';
  }

  if (normalizedRole === 'admin') {
    return '/admin';
  }

  return null;
};

function Header({ compact = false }: HeaderProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pathname, setPathname] = useState(window.location.pathname);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchRef = useRef<HTMLDivElement | null>(null);

  const [categoryItems, setCategoryItems] = useState<Array<{ label: string; href: string }>>(
    baseNavItems.find((item) => item.label === 'Categories')?.items ?? []
  );
  const [collectionItems, setCollectionItems] = useState<Array<{ label: string; href: string }>>(
    collectionOccasionItems
  );
  const { products } = useCatalog();
  const { cartEntries, currentUser, logout, openAuthModal, wishlistItems } = useShop();
  const dashboardPath = getDashboardPath(currentUser?.role);

  const resetSearchState = () => {
    setSearchTerm('');
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setIsSearchingSuggestions(false);
  };

  useEffect(() => {
    const onPopState = () => {
      setPathname(window.location.pathname);
      setSearchTerm(new URLSearchParams(window.location.search).get('q') ?? '');
      setOpenMenu(null);
      setMobileMenuOpen(false);
      setProfileMenuOpen(false);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    setSearchTerm(new URLSearchParams(window.location.search).get('q') ?? '');
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (target instanceof Node && profileMenuRef.current?.contains(target)) {
        return;
      }

      setProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!searchOpen && !showSuggestions) {
      return undefined;
    }

    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (desktopSearchRef.current?.contains(target) || mobileSearchRef.current?.contains(target)) {
        return;
      }

      setSearchOpen(false);
      resetSearchState();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [searchOpen, showSuggestions]);

  useEffect(() => {
    const query = searchTerm.trim();
    const suggestionQuery = buildProductSearchQuery(query, products);
    const normalizedSuggestionQuery = normalizeSearchText(suggestionQuery);
    const colorMatchedSuggestions = normalizedSuggestionQuery
      ? products
          .filter((product) => {
            const normalizedColor = normalizeSearchText(product.color);

            return normalizedColor === normalizedSuggestionQuery || normalizedColor.includes(normalizedSuggestionQuery);
          })
          .slice(0, 8)
          .map((product) => ({
            id: product.id ?? product.slug,
            name: product.name,
            slug: product.slug,
            selling_price: product.price,
            mrp: product.originalPrice,
            image_url: product.image
          }))
      : [];

    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearchingSuggestions(false);
      return;
    }

    let isActive = true;
    setIsSearchingSuggestions(true);

    const timeoutId = window.setTimeout(() => {
      commonApi.products
        .getSearchSuggestions(suggestionQuery || query, 8)
        .then((suggestions) => {
          if (!isActive) {
            return;
          }

          setSearchSuggestions(colorMatchedSuggestions.length ? colorMatchedSuggestions : suggestions);
          setShowSuggestions(true);
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setSearchSuggestions(colorMatchedSuggestions);
          setShowSuggestions(colorMatchedSuggestions.length > 0);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }

          setIsSearchingSuggestions(false);
        });
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [products, searchTerm]);

  useEffect(() => {
  let isMounted = true;

  const loadCategoryItems = () => {
    commonApi.categories
      .list({ limit: 100 })
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setCategoryItems(toCategoryMenuItems(response.data));
      })
      .catch(() => {
        
      });
  };

  const handleCategoriesChanged = () => {
    loadCategoryItems();
  };

  loadCategoryItems();

  window.addEventListener('categories:changed', handleCategoriesChanged);

  return () => {
    isMounted = false;
    window.removeEventListener('categories:changed', handleCategoriesChanged);
  };
}, []);


  useEffect(() => {
    let isMounted = true;

    commonApi.filters
      .get()
      .then((filters) => {
        if (!isMounted) {
          return;
        }

        const occasionItems = toMenuItems(filters.occasions ?? [], '/collections');
        setCollectionItems(occasionItems.length ? occasionItems : collectionOccasionItems);
      })
      .catch(() => {
        if (isMounted) {
          setCollectionItems(collectionOccasionItems);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = useMemo<NavItem[]>(
    () =>
      baseNavItems.map((item) =>
        item.label === 'Categories'
          ? {
              ...item,
              items: categoryItems
            }
          : item.label === 'Collections'
            ? {
                ...item,
                items: collectionItems
              }
          : item
      ),
    [categoryItems, collectionItems]
  );

  const handleNavigate = (path: string) => {
    setOpenMenu(null);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    setShowSuggestions(false);
    navigateTo(path);
  };

  const handleProtectedNavigate = (path: '/cart' | '/wishlist') => {
    handleNavigate(path);
  };

  const handleSearch = () => {
    const query = searchTerm.trim();
    setShowSuggestions(false);

    if (!query) {
      return;
    }

    handleNavigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
    resetSearchState();
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchTerm(suggestion.name);
    setSearchSuggestions([]);
    setShowSuggestions(false);
    handleNavigate(`/products/${suggestion.slug}`);
  };

  const renderSearchSuggestions = () => {
    if (!showSuggestions) {
      return null;
    }

    if (isSearchingSuggestions) {
      return (
        <div className="absolute left-0 top-[calc(100%+0.6rem)] z-50 w-full rounded-[1.2rem] border border-white/80 bg-white px-4 py-3 text-sm text-ink/60 shadow-[0_18px_36px_rgba(90,50,45,0.16)]">
          Searching...
        </div>
      );
    }

    if (!searchSuggestions.length) {
      return null;
    }

    return (
      <div className="absolute left-0 top-[calc(100%+0.6rem)] z-50 max-h-80 w-full overflow-y-auto rounded-[1.2rem] border border-white/80 bg-white shadow-[0_18px_36px_rgba(90,50,45,0.16)]">
        {searchSuggestions.map((suggestion) => (
          <button
            key={suggestion.id}
            type="button"
            onClick={() => handleSuggestionClick(suggestion)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-[#f8efe7]"
          >
            {suggestion.image_url ? (
              <img
                src={suggestion.image_url}
                alt={suggestion.name}
                className="h-10 w-10 rounded-[0.7rem] object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.7rem] bg-[#f8efe7] text-xs font-semibold text-wine">
                SK
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold text-[#4a2a2c]">
                {suggestion.name}
              </span>
              <span className="block text-xs text-ink/52">
                Rs. {Number(suggestion.selling_price ?? 0).toLocaleString('en-IN')}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <header id="top" className="site-header fixed inset-x-0 top-0 z-50 px-1 pt-3 sm:px-2 lg:px-3">
      <div className="header-row-shell relative mx-auto max-w-[100rem] overflow-visible rounded-[2rem] px-3 py-3 sm:px-4 lg:px-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => handleNavigate('/')} className="-ml-2 flex min-w-0 items-center text-left lg:-ml-4">
            <img src="/logo1.png" alt="Sri Kanchi Banaras Silks Logo" className="h-16 w-auto object-contain max-[360px]:h-13 lg:hidden" />
            <img src="/logo.png" alt="Sri Kanchi Banaras Silks Logo" className="hidden h-20 w-auto object-contain lg:block" />
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            
            className={`skeuo-action-btn flex h-12 w-12 shrink-0 items-center justify-center text-wine max-[360px]:h-10 max-[360px]:w-10 sm:h-14 sm:w-14 ${compact ? 'hidden' : 'lg:hidden'}`}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
              <path d="M4 7h16v2H4V7Zm0 8v-2h16v2H4Z" />
            </svg>
            
          </button>

          <nav className={`relative z-40 ml-2 hidden items-center gap-2 lg:flex ${compact ? 'invisible pointer-events-none w-0 overflow-hidden opacity-0' : ''}`}>
            {navItems.map((item) => {
              const isOpen = openMenu === item.label;
              const isActive =
                pathname === item.href ||
                (item.href === '/collections' && pathname.startsWith('/collections/')) ||
                (item.href === '/categories' && pathname.startsWith('/categories/'));

              return (
                <div
                  key={item.label}
                  className="nav-dropdown"
                  onMouseEnter={() => setOpenMenu(item.items ? item.label : null)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    type="button"
                    className={`nav-pill flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition hover:text-wine ${
                      isActive ? 'text-wine' : 'text-ink/78'
                    }`}
                    onClick={() => {
                      if (item.items) {
                        setOpenMenu(isOpen ? null : item.label);
                      } else {
                        handleNavigate(item.href);
                      }
                    }}
                  >
                    <span>{item.label}</span>
                  </button>

                  {item.items && isOpen ? (
                    <div className={`dropdown-panel ${item.label === 'Categories' ? 'dropdown-panel-scroll' : ''}`}>
                      {item.items.map((subItem) => (
                        <button
                          key={subItem.label}
                          type="button"
                          onClick={() => handleNavigate(subItem.href)}
                          className="dropdown-link w-full text-left"
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                );
              })}
            </nav>

          <div className={`ml-auto flex items-center gap-2 sm:gap-3 ${compact ? 'pl-2' : ''}`}>
            <div ref={desktopSearchRef} className="flex items-center gap-2">
              <div className={`search-shell relative hidden items-center transition-all duration-300 lg:flex ${searchOpen ? 'w-[20rem] px-3 py-2' : 'w-0 px-0 py-0 opacity-0'}`}>
                {searchOpen ? (
                  <>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(event) => {
                        setSearchTerm(event.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(searchSuggestions.length > 0 || searchTerm.trim().length >= 2)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                      placeholder="Search sarees, colors, collections..."
                      className="w-full bg-transparent text-sm text-[#4a2a2c] outline-none placeholder:text-ink/42"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="rounded-full bg-[#7f3150] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
                    >
                      Go
                    </button>
                    {renderSearchSuggestions()}
                  </>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (searchOpen && searchTerm.trim()) {
                    handleSearch();
                    return;
                  }

                  resetSearchState();
                  setSearchOpen((current) => !current);
                }}
                className="skeuo-action-btn flex h-12 w-12 items-center justify-center text-wine max-[360px]:h-10 max-[360px]:w-10 sm:h-14 sm:w-14"
                aria-label="Search products"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                </svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleProtectedNavigate('/wishlist')}
              className="skeuo-action-btn relative flex h-12 w-12 items-center justify-center text-wine max-[360px]:h-10 max-[360px]:w-10 sm:h-14 sm:w-14"
              aria-label="Wishlist"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 21.35 10.55 20C5.4 15.24 2 12.09 2 8.25A5.25 5.25 0 0 1 7.25 3 5.7 5.7 0 0 1 12 5.2 5.7 5.7 0 0 1 16.75 3 5.25 5.25 0 0 1 22 8.25c0 3.84-3.4 6.99-8.55 11.76L12 21.35Z" />
              </svg>
              {wishlistItems.length > 0 ? <span className="skeuo-icon-badge">{wishlistItems.length}</span> : null}
            </button>

            <button
              type="button"
              onClick={() => handleProtectedNavigate('/cart')}
              className="skeuo-action-btn relative flex h-12 w-12 items-center justify-center text-wine max-[360px]:h-10 max-[360px]:w-10 sm:h-14 sm:w-14"
              aria-label="Cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M3 4h2.2l1.2 2H20a1 1 0 0 1 .96 1.28l-1.8 6.2A2 2 0 0 1 17.24 15H8.3a2 2 0 0 1-1.92-1.45L4.1 5.5H3V4Zm6 14a1.75 1.75 0 1 1 0 3.5A1.75 1.75 0 0 1 9 18Zm8 0a1.75 1.75 0 1 1 0 3.5A1.75 1.75 0 0 1 17 18Z" />
              </svg>
              {cartEntries.length > 0 ? <span className="skeuo-icon-badge">{cartEntries.length}</span> : null}
            </button>

            {currentUser ? (
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((current) => !current)}
                  className="flex h-12 w-12 items-center justify-center rounded-[1.4rem] border border-white/80 bg-white/45 text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.84),0_12px_22px_rgba(108,61,50,0.06)] max-[360px]:h-10 max-[360px]:w-10 sm:h-14 sm:w-14"
                  aria-label="Profile options"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                    <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.14 0-7.5 2.69-7.5 6 0 .55.45 1 1 1h13a1 1 0 0 0 1-1c0-3.31-3.36-6-7.5-6Z" />
                  </svg>
                </button>

                {profileMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.7rem)] z-50 min-w-[12rem] overflow-hidden rounded-[1.4rem] border border-white/80 bg-[linear-gradient(180deg,#fffdfa_0%,#f8f1eb_100%)] p-2 shadow-[0_20px_40px_rgba(90,50,45,0.18)]">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-wine">{currentUser?.fullName}</p>
                      <p className="mt-1 text-xs text-ink/56">{currentUser?.email}</p>
                      {currentUser?.role ? (
                        <p className="mt-2 inline-flex rounded-full bg-[#f3e7df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7f3150]">
                          {currentUser.role}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/profile')}
                      className="flex w-full items-center rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#7f3150] transition hover:bg-[#f3e7df]"
                    >
                      My Profile
                    </button>
                    {dashboardPath ? (
                      <button
                        type="button"
                        onClick={() => handleNavigate(dashboardPath)}
                        className="flex w-full items-center rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#7f3150] transition hover:bg-[#f3e7df]"
                      >
                        Dashboard
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleNavigate('/orders')}
                      className="flex w-full items-center rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#7f3150] transition hover:bg-[#f3e7df]"
                    >
                      My Orders
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavigate('/login?change-password=1')}
                      className="flex w-full items-center rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#7f3150] transition hover:bg-[#f3e7df]"
                    >
                      Change Password
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="flex w-full items-center rounded-[1rem] px-3 py-3 text-left text-sm font-semibold text-[#7f3150] transition hover:bg-[#f3e7df]"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login', 'Login to access your wishlist and cart.')}
                className="liquid-btn hidden min-w-[8.4rem] justify-center px-5 py-2.5 text-sm font-semibold text-white sm:flex"
              >
                Login
              </button>
            )}

          </div>
        </div>

        {mobileMenuOpen && !compact ? (
          <div className="mt-3 rounded-[1.8rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,253,250,0.96)_0%,rgba(248,241,235,0.98)_100%)] p-3 shadow-[0_22px_34px_rgba(90,50,45,0.12)] lg:hidden">
            <div ref={mobileSearchRef} className="search-shell relative mb-3 flex items-center gap-2 px-3 py-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(searchSuggestions.length > 0 || searchTerm.trim().length >= 2)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Search sarees..."
                className="w-full bg-transparent text-sm text-[#4a2a2c] outline-none placeholder:text-ink/42"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-full bg-[#7f3150] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white"
              >
                Go
              </button>
              {renderSearchSuggestions()}
            </div>
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const isExpanded = openMenu === item.label;
                const isActive =
                  pathname === item.href ||
                  (item.href === '/collections' && pathname.startsWith('/collections/')) ||
                  (item.href === '/categories' && pathname.startsWith('/categories/'));

                return (
                  <div key={item.label} className="rounded-[1.2rem] bg-white/55 px-2 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.items) {
                          setOpenMenu(isExpanded ? null : item.label);
                        } else {
                          handleNavigate(item.href);
                        }
                      }}
                      className={`flex w-full items-center justify-between rounded-[1rem] px-3 py-3 text-left text-sm font-semibold ${
                        isActive ? 'text-wine' : 'text-ink/78'
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.items ? <span>{isExpanded ? '-' : '+'}</span> : null}
                    </button>

                    {item.items && isExpanded ? (
                      <div className="mt-1 flex flex-col gap-1 px-2 pb-1">
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.label}
                            type="button"
                            onClick={() => handleNavigate(subItem.href)}
                            className="rounded-[0.9rem] px-3 py-2 text-left text-sm text-ink/72 transition hover:bg-[#f3e7df] hover:text-wine"
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {!currentUser ? (
                <button
                  type="button"
                  onClick={() => openAuthModal('login', 'Login to access your wishlist and cart.')}
                  className="liquid-btn mt-2 w-full justify-center px-5 py-3 text-sm font-semibold text-white"
                >
                  Login
                </button>
              ) : null}
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default Header;
