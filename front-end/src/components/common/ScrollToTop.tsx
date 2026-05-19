import { useEffect } from 'react';

type ScrollToTopProps = {
  pathname: string;
};

function ScrollToTop({ pathname }: ScrollToTopProps) {
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
