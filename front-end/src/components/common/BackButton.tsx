type BackButtonProps = {
  fallbackPath?: string;
  className?: string;
};
 
const navigateBack = (fallbackPath: string) => {
  if (typeof window === 'undefined') return;
 
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.assign(fallbackPath);
  }
};
 
function BackButton({ fallbackPath = '/', className = '' }: BackButtonProps) {
  return (
    <button
      type="button"
      onClick={() => navigateBack(fallbackPath)}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#7f3150] shadow-sm ring-1 ring-[#ead7df] transition hover:bg-white hover:text-[#5a2e40] ${className}`}
      aria-label="Go back"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10.7 5.3 4 12l6.7 6.7 1.4-1.4L7.8 13H20v-2H7.8l4.3-4.3-1.4-1.4Z" />
      </svg>
    </button>
  );
}
 
export default BackButton;
