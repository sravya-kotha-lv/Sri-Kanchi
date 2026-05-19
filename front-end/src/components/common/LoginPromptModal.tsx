type LoginPromptModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

function LoginPromptModal({ isOpen, onClose }: LoginPromptModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#4a2a2c]/28 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,248,242,0.94),rgba(245,227,217,0.9))] p-6 shadow-[0_30px_60px_rgba(90,50,45,0.24),inset_0_1px_0_rgba(255,255,255,0.84)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-10%] top-[-8%] h-28 w-28 rounded-full bg-[#fff6ea]/70 blur-2xl" />
          <div className="absolute bottom-[-8%] right-[-5%] h-32 w-32 rounded-full bg-[#e5a487]/30 blur-3xl" />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/55 text-wine shadow-[0_10px_18px_rgba(108,61,50,0.08)]"
          aria-label="Close login prompt"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
            <path d="M6.2 5.1 10 8.9l3.8-3.8 1.1 1.1L11.1 10l3.8 3.8-1.1 1.1L10 11.1l-3.8 3.8-1.1-1.1L8.9 10 5.1 6.2Z" />
          </svg>
        </button>

        <div className="relative z-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,#8c3f56_0%,#d48667_100%)] text-white shadow-[0_18px_30px_rgba(106,45,59,0.22)]">
            <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden="true">
              <path d="M12 2a5 5 0 0 1 5 5v2h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h1V7a5 5 0 0 1 5-5Zm3 7V7a3 3 0 0 0-6 0v2h6Z" />
            </svg>
          </div>

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.28em] text-wine/70">Login Required</p>
          <h3 className="mt-3 font-display text-4xl text-wine">Please Login</h3>
          <p className="mt-3 text-base leading-7 text-ink/68">
            Sign in to save favourites and add sarees to your cart. Your selections will be ready after login.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button type="button" onClick={onClose} className="liquid-btn px-6 py-3 text-sm font-semibold text-white">
              Login
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/75 bg-white/48 px-5 py-3 text-sm font-semibold text-wine shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_12px_22px_rgba(108,61,50,0.06)]"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPromptModal;
