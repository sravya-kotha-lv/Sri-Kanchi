import { memo, useEffect, useRef, useState } from 'react';
import { FaFacebookF, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import commonApi, { type Category } from '../api/commonapi';
import { navigateTo } from '../utils/navigation';

const quickLinks = [
  { label: 'Home', path: '/' },
  { label: 'Shop', path: '/collections' },
  { label: 'About Us', path: '/about-us' },
  { label: 'Collections', path: '/collections' },
  { label: 'New Arrivals', path: '/new-arrivals' },
  { label: 'Contact', path: '/contact' }
];

const customerServiceLinks = [
  { label: 'Terms & Conditions', path: '/terms-and-conditions' },
  { label: 'Privacy Policy', path: '/privacy-policy' }
];

const categoryLinks = [
  { label: 'Banarasi', path: '/categories/banarasi' },
  { label: 'Kanchipuram', path: '/categories/kanchipuram' },
  { label: 'Cotton Sarees', path: '/categories/cotton-sarees' },
  { label: 'Bridal Edit', path: '/bridal' }
];

type ExternalSocialLink = {
  label: string;
  icon: typeof FaFacebookF;
  href: string;
  external: true;
};

const socialLinks: ExternalSocialLink[] = [
  { label: 'Facebook', icon: FaFacebookF, href: 'https://www.facebook.com/profile.php?id=61584010242379', external: true },
  { label: 'Instagram', icon: FaInstagram, href: 'https://www.instagram.com/srikanchibanarassilks/?hl=en', external: true }
];

type FooterCta = 'collections' | null;
type StoredFooterSession = {
  role?: string | null;
};

const normalizeCategoryLink = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\bsarees?\b/g, '')
    .replace(/[^a-z0-9]+/g, '');

const getCategoryLinkToken = (link: { label: string; path: string }) =>
  normalizeCategoryLink(link.path.replace(/^\/categories\//, '') || link.label);

const resolveFooterCategoryLinks = (categories: Category[]) =>
  categoryLinks.map((link) => {
    if (!link.path.startsWith('/categories/')) {
      return link;
    }

    const target = getCategoryLinkToken(link);
    const matchedCategory = categories.find((category) => {
      const normalizedName = normalizeCategoryLink(category.name);
      const normalizedSlug = normalizeCategoryLink(category.slug ?? '');

      return (
        normalizedName === target ||
        normalizedSlug === target ||
        normalizedName.includes(target) ||
        normalizedSlug.includes(target)
      );
    });
    const slug = matchedCategory?.slug?.trim();

    return slug ? { ...link, path: `/categories/${slug}` } : link;
  });

function getActiveFooterCta(): FooterCta {
  const pathname = window.location.pathname;

  if (pathname.startsWith('/collections')) {
    return 'collections';
  }

  return null;
}

function getCurrentUserRole() {
  try {
    const sessionRaw = window.localStorage.getItem('saree-aura-session');
    const session = sessionRaw ? (JSON.parse(sessionRaw) as StoredFooterSession | null) : null;

    return session?.role?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}

function FooterPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [resolvedCategoryLinks, setResolvedCategoryLinks] = useState(categoryLinks);
  const [activeFooterCta, setActiveFooterCta] = useState<FooterCta>(() => getActiveFooterCta());
  const [currentRole, setCurrentRole] = useState<string | null>(() => getCurrentUserRole());
  const statusTimeoutRef = useRef<number | null>(null);
  const showNewArrivalsSignup = currentRole !== 'admin' && currentRole !== 'superadmin';

  useEffect(() => {
    const syncFooterState = () => {
      setActiveFooterCta(getActiveFooterCta());
      setCurrentRole(getCurrentUserRole());
    };

    window.addEventListener('popstate', syncFooterState);
    window.addEventListener('storage', syncFooterState);

    return () => {
      window.removeEventListener('popstate', syncFooterState);
      window.removeEventListener('storage', syncFooterState);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    commonApi.categories
      .list()
      .then((response) => {
        if (isMounted && response.data.length) {
          setResolvedCategoryLinks(resolveFooterCategoryLinks(response.data));
        }
      })
      .catch(() => {
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showTemporaryStatus = (message: string) => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    setStatus(message);
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatus('');
      statusTimeoutRef.current = null;
    }, 3000);
  };

  const handleSendNewArrivalsEmail = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      showTemporaryStatus('Please enter your email.');
      return;
    }

    setEmail('');
    showTemporaryStatus('New arrivals are sent.');

    void commonApi.newArrivals
      .notify({ email: normalizedEmail })
      .catch((error) => {
        showTemporaryStatus(error instanceof Error ? error.message : 'Unable to send email.');
      });
  };

  const getFooterCtaClassName = (cta: Exclude<FooterCta, null>) =>
    activeFooterCta === cta
      ? 'rounded-full border border-[#f0c4b0] bg-[linear-gradient(135deg,#7a2f4d,#d56d52)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_14px_26px_rgba(153,72,87,0.22)] transition hover:-translate-y-0.5'
      : 'rounded-full border border-white/80 bg-white/72 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a2f4d] shadow-[0_10px_22px_rgba(111,72,61,0.08)] transition hover:-translate-y-0.5 hover:bg-white/88';

  return (
    <footer className="px-1 pb-6 pt-4 sm:px-2 sm:pb-8 lg:px-3">
      <div className="mx-auto max-w-[100rem]">
        <div className="relative overflow-hidden rounded-[2.4rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,250,246,0.96)_0%,rgba(245,232,223,0.92)_52%,rgba(255,244,236,0.96)_100%)] p-6 shadow-[0_28px_70px_rgba(111,72,61,0.12),inset_0_1px_0_rgba(255,255,255,0.82)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-6%] top-[-20%] h-56 w-56 rounded-full bg-[#fff4e8] opacity-90 blur-3xl" />
            <div className="absolute bottom-[-18%] right-[-4%] h-64 w-64 rounded-full bg-[#d9876a]/12 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_top_left,rgba(122,47,77,0.6),transparent_28%),linear-gradient(120deg,transparent,rgba(211,122,97,0.35),transparent)]" />
          </div>

          <div className={`relative z-10 grid gap-8 ${showNewArrivalsSignup ? 'lg:grid-cols-[1.15fr_0.8fr_0.8fr_0.8fr_1fr]' : 'lg:grid-cols-[1.15fr_0.8fr_0.8fr_0.8fr]'}`}>
            <div className="max-w-md">
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="text-left"
              >
                <img src="/logo.png" alt="Sri Kanchi Banaras Silks Logo" className="h-20 w-36 object-contain" />
              </button>
              <p className="mt-4 text-sm leading-7 text-ink/64 sm:text-[0.98rem]">
                Discover sarees shaped by heritage weaving, luminous drape, and modern festive styling for every celebration.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveFooterCta('collections');
                    navigateTo('/collections');
                  }}
                  className={getFooterCtaClassName('collections')}
                >
                  Signature Collections
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b3b3d]">Quick Links</h3>
              <div className="mt-5 space-y-3">
                {quickLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateTo(item.path)}
                    className="block text-left text-[0.98rem] text-ink/66 transition hover:translate-x-1 hover:text-[#7a2f4d]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b3b3d]">Categories</h3>
              <div className="mt-5 space-y-3">
                {resolvedCategoryLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateTo(item.path)}
                    className="block text-left text-[0.98rem] text-ink/66 transition hover:translate-x-1 hover:text-[#7a2f4d]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b3b3d]">Customer Service</h3>
              <div className="mt-5 space-y-3">
                {customerServiceLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigateTo(item.path)}
                    className="block text-left text-[0.98rem] text-ink/66 transition hover:translate-x-1 hover:text-[#7a2f4d]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {showNewArrivalsSignup ? (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6b3b3d]">Stay Updated</h3>
                <p className="mt-5 text-sm leading-7 text-ink/64">
                  Explore fresh saree drops, curated festive edits, and seasonal offers from every collection.
                </p>
                <div className="mt-5 rounded-[1.6rem] border border-white/70 bg-white/50 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setStatus('');
                      }}
                      placeholder="Enter your email"
                      className="min-w-0 flex-1 rounded-[1.1rem] border border-transparent bg-transparent px-4 py-3 text-sm text-ink/72 outline-none placeholder:text-ink/34"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendNewArrivalsEmail()}
                      className="rounded-[1.1rem] bg-[linear-gradient(135deg,#eb4a7b,#ff9347)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(235,74,123,0.26)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Submit
                    </button>
                  </div>
                  {status ? (
                    <p className="mt-2 px-3 text-sm font-medium text-[#7a2f4d]">
                      {status}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative z-10 mt-8 flex flex-col gap-5 border-t border-[#dccfc8] pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-ink/52">(c) 2026 Srikanchi. All rights reserved.</p>

            <a
              href="https://luvetha.com/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#1f3f72] transition hover:text-[#0c5ea8]"
            >
              <span>Design &amp; Developed by</span>
              <span className="-ml-4 flex h-10 w-20 items-center justify-center overflow-visible bg-transparent shadow-none">
                <img src="/lv2-logo.png" alt="Luvetha logo" className="h-full w-full object-contain" />
              </span>
            </a>

            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/917893980950"
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/85 bg-white/68 text-[#5f2b33] shadow-[0_12px_24px_rgba(111,72,61,0.1)] transition hover:-translate-y-0.5 hover:text-[#d34d6b]"
              >
                <FaWhatsapp className="h-4 w-4" />
              </a>

              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={item.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/85 bg-white/68 text-[#5f2b33] shadow-[0_12px_24px_rgba(111,72,61,0.1)] transition hover:-translate-y-0.5 hover:text-[#d34d6b]"
                  >
                    <Icon className="text-base" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default memo(FooterPage);
