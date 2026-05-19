import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react';
import commonApi, { type AuthPayload, type UserProfile } from '../api/commonapi';
import { normalizeCatalogItemId } from '../data/productCatalog';
import { useCatalog } from './CatalogContext';

type AuthMode = 'login' | 'signup';

type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  token: string;
  phone?: string | null;
  role?: string;
};

type StoredUser = {
  id: string | number;
  email: string;
  fullName: string;
  password: string;
  phone?: string | null;
  role?: string;
};

type PendingAction =
  | {
      type: 'cart';
      itemId: string;
    }
  | {
      type: 'wishlist';
      itemId: string;
    };

type CartProductSnapshot = {
  id?: number;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
  stock?: number;
  status?: string | null;
  image_url?: string | null;
  selling_price?: number | string;
  price?: number | string;
  mrp?: number | string;
};

type CartEntry = {
  cartItemId?: string | number;
  itemId: string;
  quantity: number;
  product?: CartProductSnapshot | null;
};

type WishlistEntry = {
  wishlistItemId: number;
  itemId: string;
};

type ShopToast = {
  kind: 'success' | 'error';
  message: string;
};

type ShopContextValue = {
  isAuthenticated: boolean;
  currentUser: SessionUser | null;
  wishlistItems: string[];
  cartItems: string[];
  cartEntries: CartEntry[];
  authMode: AuthMode;
  authMessage: string;
  openAuthModal: (mode?: AuthMode, message?: string, redirectPath?: string) => void;
  closeAuthModal: () => void;
  signup: (fullName: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; message: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (name: string, phone?: string | null) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addToCart: (itemId: string) => Promise<{ success: boolean; message: string }>;
  startBuyNow: (itemId: string) => Promise<{ success: boolean; message: string }>;
  incrementCartItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  decrementCartItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  removeCartItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
  clearCart: () => Promise<{ success: boolean; message: string }>;
  getCartItemQuantity: (itemId: string) => number;
  toggleWishlist: (itemId: string) => Promise<{ success: boolean; message: string }>;
  isInWishlist: (itemId: string) => boolean;
};

const SESSION_KEY = 'saree-aura-session';
const USERS_KEY = 'saree-aura-users';
const WISHLISTS_KEY = 'saree-aura-wishlists';
const CARTS_KEY = 'saree-aura-carts';
const AUTH_REDIRECT_KEY = 'saree-aura-auth-redirect';
const PENDING_ACTION_KEY = 'saree-aura-pending-action';
const PENDING_CART_MIGRATION_KEY = 'saree-aura-pending-cart-migration';
const PENDING_WISHLIST_MIGRATION_KEY = 'saree-aura-pending-wishlist-migration';
const TOKEN_KEY = 'token';
const GUEST_STORAGE_KEY = '__guest__';

const ShopContext = createContext<ShopContextValue | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeStoredItems(source: Record<string, string[]>) {
  return Object.fromEntries(
    Object.entries(source).map(([email, items]) => [email, items.map((itemId) => normalizeCatalogItemId(itemId))])
  );
}

function normalizeStoredCarts(source: Record<string, CartEntry[]>) {
  return Object.fromEntries(
    Object.entries(source).map(([email, entries]) => [
      email,
      entries.map((entry) => ({
        ...entry,
        itemId: normalizeCatalogItemId(entry.itemId)
      }))
    ])
  );
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function navigateTo(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function isLocalOnlyToken(token?: string | null) {
  const normalizedToken = token?.trim();
  return normalizedToken ? normalizedToken.startsWith('local-session-') : false;
}

function buildSession(user: StoredUser): SessionUser {
  return {
    id: String(user.id),
    email: user.email,
    fullName: user.fullName,
    token: `local-session-${user.id}`,
    phone: user.phone ?? null,
    role: user.role ?? 'customer'
  };
}

function buildSessionFromAuth(payload: AuthPayload): SessionUser {
  const normalizedEmail = payload.user.email.trim().toLowerCase();

  return {
    id: String(payload.user.id),
    email: normalizedEmail,
    fullName: payload.user.name?.trim() || normalizedEmail,
    token: payload.token,
    phone: payload.user.phone ?? null,
    role: payload.user.role ?? 'customer'
  };
}

function buildStoredUserFromProfile(profile: UserProfile, password: string): StoredUser {
  const normalizedEmail = profile.email.trim().toLowerCase();

  return {
    id: String(profile.id),
    email: normalizedEmail,
    fullName: profile.name?.trim() || normalizedEmail,
    phone: profile.phone ?? null,
    password,
    role: profile.role ?? 'customer'
  };
}

function getRoleDashboardPath(role?: string) {
  const normalizedRole = role?.trim().toLowerCase();

  if (normalizedRole === 'superadmin') {
    return '/admin/host-dashboard';
  }

  if (normalizedRole === 'admin') {
    return '/admin';
  }

  return null;
}

function syncWishlistStorage(
  email: string,
  entries: WishlistEntry[],
  setWishlistsByUser: Dispatch<SetStateAction<Record<string, string[]>>>
) {
  const nextItems = entries.map((entry) => entry.itemId);

  setWishlistsByUser((current) => {
    const next = { ...current, [email]: nextItems };
    writeJson(WISHLISTS_KEY, next);
    return next;
  });
}

function mergeCartEntriesByItemId(primaryEntries: CartEntry[], incomingEntries: CartEntry[]) {
  const mergedEntries = new Map<string, CartEntry>();

  primaryEntries.forEach((entry) => {
    mergedEntries.set(entry.itemId, { ...entry });
  });

  incomingEntries.forEach((entry) => {
    const existingEntry = mergedEntries.get(entry.itemId);

    if (!existingEntry) {
      mergedEntries.set(entry.itemId, { ...entry, cartItemId: undefined });
      return;
    }

    mergedEntries.set(entry.itemId, {
      ...existingEntry,
      quantity: existingEntry.quantity + entry.quantity
    });
  });

  return Array.from(mergedEntries.values());
}

function mergeWishlistEntriesByItemId(primaryEntries: WishlistEntry[], incomingEntries: WishlistEntry[]) {
  const mergedEntries = new Map<string, WishlistEntry>();

  primaryEntries.forEach((entry) => {
    mergedEntries.set(entry.itemId, { ...entry });
  });

  incomingEntries.forEach((entry) => {
    if (!mergedEntries.has(entry.itemId)) {
      mergedEntries.set(entry.itemId, { ...entry, wishlistItemId: Date.now() + mergedEntries.size });
    }
  });

  return Array.from(mergedEntries.values());
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const { products } = useCatalog();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [wishlistsByUser, setWishlistsByUser] = useState<Record<string, string[]>>({});
  const [wishlistEntriesByUser, setWishlistEntriesByUser] = useState<Record<string, WishlistEntry[]>>({});
  const [cartsByUser, setCartsByUser] = useState<Record<string, CartEntry[]>>({});
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authMessage, setAuthMessage] = useState('Please login to continue.');
  const [toast, setToast] = useState<ShopToast | null>(null);

  const showToast = (message: string, kind: ShopToast['kind'] = 'success') => {
    setToast({ kind, message });
  };

  const persistPendingAction = (action: PendingAction | null) => {
    if (action) {
      writeJson(PENDING_ACTION_KEY, action);
      return;
    }

    window.localStorage.removeItem(PENDING_ACTION_KEY);
  };

  const persistSession = (session: SessionUser | null) => {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }

    writeJson(SESSION_KEY, session);
    window.localStorage.setItem(TOKEN_KEY, session.token);
  };

  const resolveAuthToken = () => {
    const activeToken = currentUser?.token?.trim();

    if (activeToken && activeToken !== 'undefined' && activeToken !== 'null' && !isLocalOnlyToken(activeToken)) {
      return activeToken;
    }

    const storedToken =
      window.localStorage.getItem(TOKEN_KEY)?.trim() || window.localStorage.getItem('auth_token')?.trim() || '';

    if (!storedToken || storedToken === 'undefined' || storedToken === 'null' || isLocalOnlyToken(storedToken)) {
      return null;
    }

    return storedToken;
  };

  const upsertStoredUser = (nextUser: StoredUser) => {
    setUsers((current) => {
      const existingUser = current.find((user) => user.email === nextUser.email);
      const mergedUser = existingUser ? { ...existingUser, ...nextUser } : nextUser;
      const nextUsers = existingUser
        ? current.map((user) => (user.email === mergedUser.email ? mergedUser : user))
        : [...current, mergedUser];

      writeJson(USERS_KEY, nextUsers);
      return nextUsers;
    });
  };

  const syncCartForUser = (email: string, nextEntries: CartEntry[]) => {
    setCartsByUser((current) => {
      const next = { ...current, [email]: nextEntries };
      writeJson(CARTS_KEY, next);
      return next;
    });

    if ((currentUser?.email ?? GUEST_STORAGE_KEY) === email) {
      setCartEntries(nextEntries);
    }
  };

  const completeLoginFlow = (session: SessionUser) => {
    const guestCartEntries = cartsByUser[GUEST_STORAGE_KEY] ?? [];
    const guestWishlistEntries = wishlistEntriesByUser[GUEST_STORAGE_KEY] ?? [];
    const shouldMigrateGuestCart = guestCartEntries.length > 0;
    const shouldMigrateGuestWishlist = guestWishlistEntries.length > 0;
    const pendingAction = readJson<PendingAction | null>(PENDING_ACTION_KEY, null);

    setCurrentUser(session);
    persistSession(session);

    if (shouldMigrateGuestCart) {
      const existingUserCartEntries = cartsByUser[session.email] ?? [];
      const mergedCartEntries = mergeCartEntriesByItemId(existingUserCartEntries, guestCartEntries);

      setCartEntries(mergedCartEntries);
      setCartsByUser((current) => {
        const next = {
          ...current,
          [session.email]: mergeCartEntriesByItemId(current[session.email] ?? [], current[GUEST_STORAGE_KEY] ?? guestCartEntries),
          [GUEST_STORAGE_KEY]: []
        };

        writeJson(CARTS_KEY, next);
        return next;
      });

      if (!isLocalOnlyToken(session.token)) {
        writeJson(PENDING_CART_MIGRATION_KEY, guestCartEntries);
      }

      if (
        pendingAction?.type === 'cart' &&
        guestCartEntries.some((entry) => entry.itemId === normalizeCatalogItemId(pendingAction.itemId))
      ) {
        persistPendingAction(null);
      }
    }

    if (shouldMigrateGuestWishlist) {
      const existingUserWishlistEntries = wishlistEntriesByUser[session.email] ?? [];
      const mergedWishlistEntries = mergeWishlistEntriesByItemId(existingUserWishlistEntries, guestWishlistEntries);

      setWishlistEntriesByUser((current) => ({
        ...current,
        [session.email]: mergeWishlistEntriesByItemId(current[session.email] ?? [], current[GUEST_STORAGE_KEY] ?? guestWishlistEntries),
        [GUEST_STORAGE_KEY]: []
      }));

      setWishlistsByUser((current) => {
        const next = {
          ...current,
          [session.email]: mergedWishlistEntries.map((entry) => entry.itemId),
          [GUEST_STORAGE_KEY]: []
        };

        writeJson(WISHLISTS_KEY, next);
        return next;
      });

      if (!isLocalOnlyToken(session.token)) {
        writeJson(PENDING_WISHLIST_MIGRATION_KEY, guestWishlistEntries);
      }

      if (
        pendingAction?.type === 'wishlist' &&
        guestWishlistEntries.some((entry) => entry.itemId === normalizeCatalogItemId(pendingAction.itemId))
      ) {
        persistPendingAction(null);
      }
    }

    const roleDashboardPath = getRoleDashboardPath(session.role);

    if (roleDashboardPath) {
      persistPendingAction(null);
      window.localStorage.removeItem(AUTH_REDIRECT_KEY);
      navigateTo(roleDashboardPath);
      return;
    }

    const redirectPath = window.localStorage.getItem(AUTH_REDIRECT_KEY) ?? '/';
    window.localStorage.removeItem(AUTH_REDIRECT_KEY);
    navigateTo(redirectPath === '/login' ? '/' : redirectPath);
  };

  const findProductByItemId = (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    return products.find(
      (product) =>
        String(product.id ?? '') === normalizedItemId ||
        product.slug === normalizedItemId ||
        normalizeLookupValue(product.name) === normalizeLookupValue(itemId)
    );
  };

  const getWishlistLookupIds = (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const matchedProduct = findProductByItemId(normalizedItemId);

    return Array.from(
      new Set(
        [
          normalizedItemId,
          matchedProduct?.id !== undefined ? String(matchedProduct.id) : undefined,
          matchedProduct?.slug ? normalizeCatalogItemId(matchedProduct.slug) : undefined
        ].filter((value): value is string => Boolean(value))
      )
    );
  };

  const findProductByProductId = (productId: number) =>
    products.find((product) => {
      if (typeof product.id === 'number') {
        return product.id === productId;
      }

      if (typeof product.id === 'string') {
        const parsedId = Number(product.id);
        return Number.isFinite(parsedId) && parsedId === productId;
      }

      return false;
    });

  const getCartQuantityForItem = (itemId: string) =>
    cartEntries.find((entry) => normalizeCatalogItemId(entry.itemId) === normalizeCatalogItemId(itemId))?.quantity ?? 0;

  const getStockBlockMessage = (itemId: string, quantityDelta = 1) => {
    const product = findProductByItemId(itemId);

    if (typeof product?.stock !== 'number') {
      return '';
    }

    if (product.stock <= 0) {
      return 'This product is out of stock.';
    }

    if (getCartQuantityForItem(itemId) + quantityDelta > product.stock) {
      return `Only ${product.stock} item${product.stock === 1 ? '' : 's'} available in stock.`;
    }

    return '';
  };

  const resolveProductId = (itemId: string) => {
    const product = findProductByItemId(itemId);

    if (!product) {
      return null;
    }

    if (typeof product.id === 'number' && Number.isFinite(product.id)) {
      return product.id;
    }

    if (typeof product.id === 'string') {
      const parsedId = Number(product.id);
      return Number.isFinite(parsedId) ? parsedId : null;
    }

    return null;
  };

  const resolveProductIdForCart = async (itemId: string) => {
    const localProductId = resolveProductId(itemId);

    if (localProductId) {
      return localProductId;
    }

    const normalizedItemId = normalizeCatalogItemId(itemId);

    try {
      const apiProduct = await commonApi.products.getBySlug(normalizedItemId);

      if (typeof apiProduct.id === 'number' && Number.isFinite(apiProduct.id)) {
        return apiProduct.id;
      }

      if (typeof apiProduct.id === 'string') {
        const parsedId = Number(apiProduct.id);
        return Number.isFinite(parsedId) ? parsedId : null;
      }
    } catch {
    }

    try {
      const backendProducts = await commonApi.products.getAll({ limit: 100 });
      const localProduct = findProductByItemId(itemId);
      const normalizedSlug = normalizeLookupValue(normalizedItemId);
      const normalizedName = normalizeLookupValue(localProduct?.name ?? itemId);

      const matchedBackendProduct = backendProducts.find((product) => {
        const backendSlug = normalizeLookupValue(product.slug ?? '');
        const backendName = normalizeLookupValue(product.name ?? '');

        return backendSlug === normalizedSlug || backendName === normalizedName || backendName === normalizedSlug;
      });

      if (typeof matchedBackendProduct?.id === 'number' && Number.isFinite(matchedBackendProduct.id)) {
        return matchedBackendProduct.id;
      }

      if (typeof matchedBackendProduct?.id === 'string') {
        const parsedId = Number(matchedBackendProduct.id);
        return Number.isFinite(parsedId) ? parsedId : null;
      }
    } catch {
    }

    return null;
  };

  const resolveCartEntryItemId = (item: {
    product?: { slug?: string | null } | null;
    product_id: number;
  }) => {
    const slugFromApi = item.product?.slug?.trim();

    if (slugFromApi) {
      return normalizeCatalogItemId(slugFromApi);
    }

    const matchedProduct = findProductByProductId(item.product_id);

    if (matchedProduct?.slug) {
      return normalizeCatalogItemId(matchedProduct.slug);
    }

    return normalizeCatalogItemId(String(item.product_id));
  };

  const mapCartEntries = (
    items: Array<{
      id: number;
      quantity: number;
      product?: CartProductSnapshot | null;
      product_id: number;
    }>
  ) =>
    items.map((item) => ({
      cartItemId: item.id,
      itemId: resolveCartEntryItemId(item),
      quantity: item.quantity,
      product: item.product ?? null
    }));


  const applyCartResponse = (cart: {
    items: Array<{ id: number; quantity: number; product?: CartProductSnapshot | null; product_id: number }>;
  }) => {
    const nextEntries = mapCartEntries(cart.items);

    if (currentUser?.email) {
      syncCartForUser(currentUser.email, nextEntries);
      return;
    }

    setCartEntries(nextEntries);
  };

  const buildCartEntryUpsert = (itemId: string, quantityDelta: number) => (entries: CartEntry[]) => {
    const existingEntry = entries.find((entry) => entry.itemId === itemId);

    if (!existingEntry) {
      return quantityDelta > 0 ? [...entries, { itemId, quantity: quantityDelta }] : entries;
    }

    const nextQuantity = existingEntry.quantity + quantityDelta;

    if (nextQuantity <= 0) {
      return entries.filter((entry) => entry.itemId !== itemId);
    }

    return entries.map((entry) => (entry.itemId === itemId ? { ...entry, quantity: nextQuantity } : entry));
  };

  const mapWishlistEntries = (
    items: Array<{ id: number; product?: { slug?: string | null } | null; product_id: number }>
  ): WishlistEntry[] =>
    items.map((item) => ({
      wishlistItemId: item.id,
      itemId: String(item.product_id)
    }));

  const applyWishlistResponse = (
    email: string,
    wishlist: { items: Array<{ id: number; product?: { slug?: string | null } | null; product_id: number }> }
  ) => {
    const entries = mapWishlistEntries(wishlist.items);

    setWishlistEntriesByUser((current) => ({
      ...current,
      [email]: entries
    }));
    syncWishlistStorage(email, entries, setWishlistsByUser);
  };

  const fetchCart = async (token: string) => {
    const cart = await commonApi.cart.getCart(token);
    applyCartResponse(cart);
    return cart;
  };

  const fetchWishlist = async (email: string, token: string) => {
    const wishlist = await commonApi.wishlist.get(token);
    applyWishlistResponse(email, wishlist);
    return wishlist;
  };

  useEffect(() => {
    const storedWishlists = normalizeStoredItems(readJson<Record<string, string[]>>(WISHLISTS_KEY, {}));
    const storedCarts = normalizeStoredCarts(readJson<Record<string, CartEntry[]>>(CARTS_KEY, {}));
    const storedUsers = readJson<StoredUser[]>(USERS_KEY, []);
    const storedSession = readJson<SessionUser | null>(SESSION_KEY, null);

    setWishlistsByUser(storedWishlists);
    setCartsByUser(storedCarts);
    setWishlistEntriesByUser({
      [GUEST_STORAGE_KEY]: (storedWishlists[GUEST_STORAGE_KEY] ?? []).map((itemId, index) => ({
        wishlistItemId: index + 1,
        itemId
      }))
    });
    setUsers(storedUsers);

    if (storedSession?.email && !isLocalOnlyToken(storedSession.token)) {
      setCurrentUser({
        ...storedSession,
        email: storedSession.email.trim().toLowerCase()
      });
    } else if (storedSession?.email) {
      persistSession(null);
    }

    writeJson(WISHLISTS_KEY, storedWishlists);
    writeJson(CARTS_KEY, storedCarts);
    writeJson(USERS_KEY, storedUsers);
  }, []);

  useEffect(() => {
    const storageKey = currentUser?.email ?? GUEST_STORAGE_KEY;
    setCartEntries(cartsByUser[storageKey] ?? []);
  }, [cartsByUser, currentUser]);

  useEffect(() => {
    const authToken = resolveAuthToken();

    if (!authToken) {
      setCartEntries(cartsByUser[GUEST_STORAGE_KEY] ?? []);
      return;
    }

    const pendingMigrationEntries = readJson<CartEntry[]>(PENDING_CART_MIGRATION_KEY, []);

    if (currentUser?.email && pendingMigrationEntries.length > 0) {
      let cancelled = false;
      const storedCarts = readJson<Record<string, CartEntry[]>>(CARTS_KEY, {});
      const localUserEntries = storedCarts[currentUser.email] ?? cartsByUser[currentUser.email] ?? [];

      if (localUserEntries.length > 0) {
        setCartEntries(localUserEntries);
      }

      void (async () => {
        try {
          window.localStorage.removeItem(PENDING_CART_MIGRATION_KEY);

          for (const entry of pendingMigrationEntries) {
            const productId = await resolveProductIdForCart(entry.itemId);

            if (!productId || cancelled) {
              continue;
            }

            await commonApi.cart.addItem(
              {
                product_id: productId,
                quantity: entry.quantity
              },
              authToken
            );
          }

          if (!cancelled) {
            await fetchCart(authToken);
          }
        } catch {
          if (!cancelled && localUserEntries.length > 0) {
            setCartEntries(localUserEntries);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    void fetchCart(authToken).catch(() => {
      if (currentUser?.email) {
        setCartEntries(cartsByUser[currentUser.email] ?? []);
        return;
      }

      setCartEntries([]);
    });
  }, [currentUser, products]);

  useEffect(() => {
    const authToken = resolveAuthToken();

    if (!currentUser?.email || !authToken) {
      return;
    }

    const pendingWishlistMigrationEntries = readJson<WishlistEntry[]>(PENDING_WISHLIST_MIGRATION_KEY, []);

    if (pendingWishlistMigrationEntries.length > 0) {
      let cancelled = false;
      const localUserEntries = wishlistEntriesByUser[currentUser.email] ?? [];

      if (localUserEntries.length > 0) {
        syncWishlistStorage(currentUser.email, localUserEntries, setWishlistsByUser);
      }

      void (async () => {
        try {
          window.localStorage.removeItem(PENDING_WISHLIST_MIGRATION_KEY);

          for (const entry of pendingWishlistMigrationEntries) {
            const productId = await resolveProductIdForCart(entry.itemId);

            if (!productId || cancelled) {
              continue;
            }

            try {
              await commonApi.wishlist.add(productId, authToken);
            } catch {
            }
          }

          if (!cancelled) {
            await fetchWishlist(currentUser.email, authToken);
          }
        } catch {
          if (!cancelled && localUserEntries.length > 0) {
            syncWishlistStorage(currentUser.email, localUserEntries, setWishlistsByUser);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    void fetchWishlist(currentUser.email, authToken).catch(() => {
      const localUserEntries = wishlistEntriesByUser[currentUser.email] ?? [];
      syncWishlistStorage(currentUser.email, localUserEntries, setWishlistsByUser);
    });
  }, [currentUser, products]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    const pendingAction = readJson<PendingAction | null>(PENDING_ACTION_KEY, null);

    if (!pendingAction) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        if (pendingAction.type === 'cart') {
          const authToken = resolveAuthToken();
          const productId = await resolveProductIdForCart(pendingAction.itemId);

          if (!productId || !authToken || cancelled) {
            return;
          }

          const cart = await commonApi.cart.addItem({ product_id: productId, quantity: 1 }, authToken);

          if (!cancelled) {
            applyCartResponse(cart);
            showToast('Your product was successfully added to cart.');
          }
        }

        if (pendingAction.type === 'wishlist') {
          const authToken = resolveAuthToken();
          const productId = await resolveProductIdForCart(pendingAction.itemId);

          if (!productId || !authToken || cancelled) {
            return;
          }

          const wishlist = await commonApi.wishlist.add(productId, authToken);

          if (!cancelled) {
            applyWishlistResponse(currentUser.email, wishlist);
            showToast('Your product was successfully added to wishlist.');
          }
        }
      } catch {
      } finally {
        if (!cancelled) {
          persistPendingAction(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser, products]);

  const wishlistItems = wishlistsByUser[currentUser?.email ?? GUEST_STORAGE_KEY] ?? [];
  const cartItems = useMemo(
    () => cartEntries.flatMap((entry) => Array.from({ length: entry.quantity }, () => entry.itemId)),
    [cartEntries]
  );

  const openAuthModal = (mode: AuthMode = 'login', message = 'Please login to continue.', redirectPath?: string) => {
    setAuthMode(mode);
    setAuthMessage(message);

    if (window.location.pathname !== '/login' || redirectPath) {
      window.localStorage.setItem(AUTH_REDIRECT_KEY, redirectPath ?? window.location.pathname);
    }

    navigateTo('/login');
  };

  const closeAuthModal = () => {
    const redirectPath = window.localStorage.getItem(AUTH_REDIRECT_KEY) ?? '/';
    window.localStorage.removeItem(AUTH_REDIRECT_KEY);
    navigateTo(redirectPath === '/login' ? '/' : redirectPath);
  };

  const signup = async (fullName: string, email: string, password: string, phone?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone?.trim() || null;

    if (!fullName.trim() || !normalizedEmail || !password.trim()) {
      return { success: false, message: 'Please fill all signup details.' };
    }

    try {
      const payload = await commonApi.auth.signup({
        name: fullName.trim(),
        email: normalizedEmail,
        password,
        phone: normalizedPhone
      });

      upsertStoredUser(buildStoredUserFromProfile(payload.user, password));
      const successMessage = 'Signup successful. Please check your email for the OTP.';
      setAuthMessage(successMessage);
      return { success: true, message: successMessage };
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Unable to create your account right now.';
      setAuthMessage(message);
      return { success: false, message };
    }
  };

  const login = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const payload = await commonApi.auth.login({
        email: normalizedEmail,
        password
      });

      upsertStoredUser(buildStoredUserFromProfile(payload.user, password));
      completeLoginFlow(buildSessionFromAuth(payload));
      return { success: true, message: 'Login successful.' };
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Invalid email or password.';
      const isNetworkFailure =
        /failed to fetch|networkerror|network error|ecconnrefused|econnrefused|load failed|fetch failed/i.test(message);
      const matchedUser = users.find((user) => user.email === normalizedEmail && user.password === password);

      if (!matchedUser || !isNetworkFailure) {
        return {
          success: false,
          message
        };
      }

      completeLoginFlow(buildSession(matchedUser));
      return {
        success: true,
        message: 'Logged in using local fallback session because backend is unreachable. Protected APIs may stay unavailable.'
      };
    }
  };

  const updateProfile = async (name: string, phone?: string | null) => {
    const normalizedName = name.trim();
    const normalizedPhone = phone?.trim() || null;
    const authToken = resolveAuthToken();

    if (!currentUser || !authToken) {
      return { success: false, message: 'Please login first to update your profile.' };
    }

    try {
      const updatedProfile = await commonApi.auth.updateProfile(
        {
          name: normalizedName,
          phone: normalizedPhone
        },
        authToken
      );
      const nextSession: SessionUser = {
        ...currentUser,
        fullName: updatedProfile.name?.trim() || normalizedName,
        phone: updatedProfile.phone ?? normalizedPhone,
        role: updatedProfile.role ?? currentUser.role
      };

      setCurrentUser(nextSession);
      persistSession(nextSession);
      setUsers((current) => {
        const nextUsers = current.map((user) =>
          user.email === currentUser.email
            ? {
                ...user,
                fullName: nextSession.fullName,
                phone: nextSession.phone
              }
            : user
        );

        writeJson(USERS_KEY, nextUsers);
        return nextUsers;
      });

      return { success: true, message: 'Profile updated successfully.' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unable to update profile.'
      };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      return { success: false, message: 'Please enter both current and new passwords.' };
    }

    const authToken = resolveAuthToken();

    if (authToken && currentUser) {
      try {
        const response = await commonApi.auth.changePassword(
          {
            currentPassword,
            newPassword
          },
          authToken
        );

        setUsers((current) => {
          const nextUsers = current.map((user) =>
            user.email === currentUser.email ? { ...user, password: newPassword } : user
          );

          writeJson(USERS_KEY, nextUsers);
          return nextUsers;
        });

        return { success: true, message: response.message ?? 'Password changed successfully.' };
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unable to change password.'
        };
      }
    }

    if (!currentUser) {
      return { success: false, message: 'Please login first.' };
    }

    const matchedUser = users.find((user) => user.email === currentUser.email);

    if (!matchedUser || matchedUser.password !== currentPassword) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const nextUsers = users.map((user) =>
      user.email === currentUser.email ? { ...user, password: newPassword } : user
    );
    setUsers(nextUsers);
    writeJson(USERS_KEY, nextUsers);
    return { success: true, message: 'Password changed successfully.' };
  };

  const logout = () => {
    setCurrentUser(null);
    setCartEntries([]);
    persistPendingAction(null);
    persistSession(null);
    navigateTo('/');
  };

  const addToCart = async (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const authToken = resolveAuthToken();
    const stockBlockMessage = getStockBlockMessage(normalizedItemId);

    if (stockBlockMessage) {
      showToast(stockBlockMessage, 'error');
      return { success: false, message: stockBlockMessage };
    }

    if (!currentUser || !authToken) {
      const nextGuestEntries = buildCartEntryUpsert(normalizedItemId, 1)(cartsByUser[GUEST_STORAGE_KEY] ?? []);
      syncCartForUser(GUEST_STORAGE_KEY, nextGuestEntries);
      showToast('Your product was successfully added to cart.');
      return { success: true, message: 'Added to cart.' };
    }

    const nextUserEntries = buildCartEntryUpsert(normalizedItemId, 1)(cartEntries);
    syncCartForUser(currentUser.email, nextUserEntries);

    const productId = await resolveProductIdForCart(normalizedItemId);

    if (!productId) {
      return { success: false, message: 'Product not found.' };
    }

    try {
      const cart = await commonApi.cart.addItem({ product_id: productId, quantity: 1 }, authToken);
      applyCartResponse(cart);
      showToast('Your product was successfully added to cart.');
      return { success: true, message: 'Added to cart.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add item to cart.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };

  const startBuyNow = async (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const product = findProductByItemId(normalizedItemId);

    if (typeof product?.stock === 'number' && product.stock <= 0) {
      const message = 'This product is out of stock.';
      showToast(message, 'error');
      return { success: false, message };
    }

    if (!currentUser) {
      const itemAlreadyInGuestCart = (cartsByUser[GUEST_STORAGE_KEY] ?? []).some(
        (entry) => entry.itemId === normalizedItemId
      );

      persistPendingAction(itemAlreadyInGuestCart ? null : { type: 'cart', itemId: normalizedItemId });
      openAuthModal('login', 'Login to get more offers', '/cart');
      return { success: false, message: 'Please login first.' };
    }

    if (getCartItemQuantity(normalizedItemId) > 0) {
      navigateTo('/cart');
      return { success: true, message: 'Opening cart.' };
    }

    const stockBlockMessage = getStockBlockMessage(normalizedItemId);

    if (stockBlockMessage) {
      showToast(stockBlockMessage, 'error');
      return { success: false, message: stockBlockMessage };
    }

    const addResult = await addToCart(normalizedItemId);

    if (addResult.success) {
      navigateTo('/cart');
    }

    return addResult;
  };

  const incrementCartItem = async (itemId: string) => addToCart(itemId);

  const decrementCartItem = async (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const authToken = resolveAuthToken();

    if (!currentUser || !authToken) {
      const existingGuestEntry = (cartsByUser[GUEST_STORAGE_KEY] ?? []).find((entry) => entry.itemId === normalizedItemId);

      if (!existingGuestEntry) {
        return { success: false, message: 'Cart item not found.' };
      }

      const nextGuestEntries = buildCartEntryUpsert(normalizedItemId, -1)(cartsByUser[GUEST_STORAGE_KEY] ?? []);
      syncCartForUser(GUEST_STORAGE_KEY, nextGuestEntries);
      return { success: true, message: 'Cart updated.' };
    }

    const existingEntry = cartEntries.find((entry) => entry.itemId === normalizedItemId);

    if (!existingEntry) {
      return { success: false, message: 'Cart item not found.' };
    }

    const nextUserEntries = buildCartEntryUpsert(normalizedItemId, -1)(cartEntries);
    syncCartForUser(currentUser.email, nextUserEntries);

    if (typeof existingEntry.cartItemId !== 'number') {
      return { success: true, message: 'Cart updated.' };
    }

    try {
      const cart =
        existingEntry.quantity <= 1
          ? await commonApi.cart.removeItem(existingEntry.cartItemId, authToken)
          : await commonApi.cart.updateItemQuantity(
              existingEntry.cartItemId,
              { quantity: existingEntry.quantity - 1 },
              authToken
            );

      applyCartResponse(cart);
      return { success: true, message: 'Cart updated.' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update cart.';
      showToast(message, 'error');
      return { success: false, message };
    }
  };

  const removeCartItem = async (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const authToken = resolveAuthToken();

    if (!currentUser || !authToken) {
      const nextGuestEntries = (cartsByUser[GUEST_STORAGE_KEY] ?? []).filter((entry) => entry.itemId !== normalizedItemId);
      syncCartForUser(GUEST_STORAGE_KEY, nextGuestEntries);
      return { success: true, message: 'Item removed.' };
    }

    const existingEntry = cartEntries.find((entry) => entry.itemId === normalizedItemId);

    if (!existingEntry) {
      return { success: false, message: 'Cart item not found.' };
    }

    if (typeof existingEntry.cartItemId !== 'number') {
      return { success: false, message: 'Cart item is not ready to remove yet.' };
    }

    try {
      const cart = await commonApi.cart.removeItem(existingEntry.cartItemId, authToken);
      applyCartResponse(cart);
      return { success: true, message: 'Item removed.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to remove item.' };
    }
  };

  const clearCart = async () => {
    const authToken = resolveAuthToken();

    if (!currentUser || !authToken) {
      syncCartForUser(GUEST_STORAGE_KEY, []);
      return { success: true, message: 'Cart cleared.' };
    }

    try {
      const cart = await commonApi.cart.clearCart(authToken);
      applyCartResponse(cart);
      return { success: true, message: 'Cart cleared.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to clear cart.' };
    }
  };

  const getCartItemQuantity = (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    return cartEntries.find((entry) => entry.itemId === normalizedItemId)?.quantity ?? 0;
  };

  const toggleWishlist = async (itemId: string) => {
    const normalizedItemId = normalizeCatalogItemId(itemId);
    const wishlistLookupIds = getWishlistLookupIds(normalizedItemId);
    const authToken = resolveAuthToken();

    if (!currentUser?.email || !authToken) {
      const guestEntries = wishlistEntriesByUser[GUEST_STORAGE_KEY] ?? [];
      const existingGuestEntry = guestEntries.find((entry) => wishlistLookupIds.includes(entry.itemId));
      const nextGuestEntries = existingGuestEntry
        ? guestEntries.filter((entry) => !wishlistLookupIds.includes(entry.itemId))
        : [...guestEntries, { wishlistItemId: Date.now(), itemId: normalizedItemId }];

      setWishlistEntriesByUser((current) => ({
        ...current,
        [GUEST_STORAGE_KEY]: nextGuestEntries
      }));
      syncWishlistStorage(GUEST_STORAGE_KEY, nextGuestEntries, setWishlistsByUser);

      if (!existingGuestEntry) {
        showToast('Your product was successfully added to wishlist.');
        return { success: true, message: 'Added to wishlist.' };
      }

      return { success: true, message: 'Removed from wishlist.' };
    }

    const existingEntry = (wishlistEntriesByUser[currentUser.email] ?? []).find((entry) =>
      wishlistLookupIds.includes(entry.itemId)
    );

    try {
      if (existingEntry) {
        const wishlist = await commonApi.wishlist.remove(existingEntry.wishlistItemId, authToken);
        applyWishlistResponse(currentUser.email, wishlist);
        return { success: true, message: 'Removed from wishlist.' };
      }

      const productId = await resolveProductIdForCart(normalizedItemId);

      if (!productId) {
        return { success: false, message: 'Product not found.' };
      }

      const wishlist = await commonApi.wishlist.add(productId, authToken);
      applyWishlistResponse(currentUser.email, wishlist);
      showToast('Your product was successfully added to wishlist.');
      return { success: true, message: 'Added to wishlist.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unable to update wishlist.' };
    }
  };

  const isInWishlist = (itemId: string) => {
    const wishlistLookupIds = getWishlistLookupIds(itemId);
    return wishlistItems.some((wishlistItemId) => wishlistLookupIds.includes(wishlistItemId));
  };

  const value: ShopContextValue = {
    isAuthenticated: Boolean(currentUser),
    currentUser,
    wishlistItems,
    cartItems,
    cartEntries,
    authMode,
    authMessage,
    openAuthModal,
    closeAuthModal,
    signup,
    login,
    updateProfile,
    changePassword,
    logout,
    addToCart,
    startBuyNow,
    incrementCartItem,
    decrementCartItem,
    removeCartItem,
    clearCart,
    getCartItemQuantity,
    toggleWishlist,
    isInWishlist
  };

  return (
    <ShopContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="pointer-events-none fixed bottom-5 right-5 z-[120] max-w-sm">
          <div
            className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold shadow-[0_18px_36px_rgba(90,50,45,0.16)] ${
              toast.kind === 'success'
                ? 'border-[#d7ead5] bg-[linear-gradient(135deg,#fffdfa_0%,#eef9ee_100%)] text-black'
                : 'border-[#f2d2d2] bg-[linear-gradient(135deg,#fffafa_0%,#fff0f0_100%)] text-[#a13f45]'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);

  if (!context) {
    throw new Error('useShop must be used within ShopProvider');
  }

  return context;
}
