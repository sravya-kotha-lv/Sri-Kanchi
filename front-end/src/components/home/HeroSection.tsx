import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { navigateTo, navigateToProduct } from '../../utils/navigation';

export interface HeroSlide {
  title: string;
  subtitle: string;
  tag: string;
  image: string;
  target?: string;
}

const defaultSlides: HeroSlide[] = [
  {
    title: 'Timeless sarees crafted for modern elegance.',
    subtitle: 'A refined banner experience blending heritage weaves with contemporary luxury styling.',
    tag: 'Heirloom Edit',
    image:
      'https://plus.unsplash.com/premium_photo-1724762183376-b43979bf9af2?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    title: 'Celebrate tradition with every drape.',
    subtitle: 'Soft textures, rich colors, and graceful silhouettes designed for every occasion.',
    tag: 'Festive Collection',
    image:
      'https://plus.unsplash.com/premium_photo-1724762180795-35a31eaae15e?q=80&w=871&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  },
  {
    title: 'Luxury sarees that tell a story.',
    subtitle: 'Experience curated craftsmanship with a modern editorial aesthetic.',
    tag: 'Signature Styles',
    image:
      'https://images.unsplash.com/photo-1758797315311-07c928608c04?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  }
];

type HeroSectionProps = {
  slides?: HeroSlide[];
  stats?: Array<{ label: string; value: string }>;
};

function HeroSection({ slides = defaultSlides, stats = [] }: HeroSectionProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [index, slides.length]);

  useEffect(() => {
    if (index > slides.length - 1) {
      setIndex(0);
    }
  }, [index, slides.length]);

  const activeSlide = slides[index] ?? defaultSlides[0];

  const handleExplore = () => {
    const targetPath = activeSlide.target ?? '/collections';

    if (targetPath.startsWith('/products/')) {
      navigateToProduct(targetPath.replace('/products/', ''));
      return;
    }

    navigateTo(targetPath);
  };

  return (
    <section className="px-1 pb-2 pt-0 sm:px-2 sm:pb-3 lg:px-3">
      <div className="relative mx-auto h-[400px] max-w-[100rem] overflow-hidden rounded-[30px] shadow-xl sm:h-[470px] lg:h-[560px] lg:rounded-[36px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(20,10,10,0.75), rgba(20,10,10,0.2)), url(${activeSlide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
        </AnimatePresence>

        <div className="relative z-10 grid h-full items-center px-8 lg:grid-cols-2">
          <motion.div
            key={`${index}-text`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-xl space-y-4 text-white"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-xs uppercase tracking-widest">{activeSlide.tag}</span>
            </div>

            <h1 className="text-3xl font-serif leading-tight md:text-5xl">{activeSlide.title}</h1>

            <p className="text-sm text-white/80 md:text-base">{activeSlide.subtitle}</p>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExplore}
                className="rounded-full bg-gradient-to-r from-pink-500 to-orange-400 px-5 py-2.5 font-semibold text-white shadow-[0_8px_25px_rgba(255,120,120,0.5)]"
              >
                Explore
              </motion.button>
            </div>

            {stats.length ? (
              <div className="grid max-w-md grid-cols-2 gap-3 pt-4 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 backdrop-blur-md">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/65">{stat.label}</p>
                    <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
