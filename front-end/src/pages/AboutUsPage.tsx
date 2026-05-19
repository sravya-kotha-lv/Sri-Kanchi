import { useMemo } from 'react';
import FooterPage from './FooterPage';
import { useCatalog } from '../context/CatalogContext';

const values = [
  {
    title: 'Passion For Sarees',
    description: 'We focus on timeless sarees that bring together graceful drape, festive color, and a strong traditional feel.'
  },
  {
    title: 'Premium Quality',
    description: 'Every collection is presented with care so customers can explore elegant styles with clarity and confidence.'
  },
  {
    title: 'Simple Experience',
    description: 'From browsing collections to checking product details, the store is designed to feel clean, calm, and easy to use.'
  },
  {
    title: 'Customer First',
    description: 'We want the shopping journey to stay warm, helpful, and trustworthy at every step.'
  }
];

const journey = [
  {
    year: 'Start',
    title: 'Store Identity',
    description: 'Sri Kanchi Banaras Silks was shaped around classic saree traditions, rich textures, and occasion-ready styling.'
  },
  {
    year: 'Today',
    title: 'Curated Collections',
    description: 'The catalog now highlights bridal, festive, collection-based, and category-based sarees in one place.'
  },
  {
    year: 'Next',
    title: 'Better Shopping',
    description: 'We continue refining the storefront so product discovery, category browsing, and purchase flow feel smoother.'
  }
];

function AboutUsPage() {
  const { products } = useCatalog();
  const galleryImages = useMemo(
    () => products.map((product) => product.image).filter(Boolean).slice(0, 2),
    [products]
  );

  return (
    <div className="space-y-8 px-3 pb-10 sm:px-5 sm:pb-12 lg:px-8 lg:pb-14">
      <section className="app-width overflow-hidden rounded-[2.4rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,249,243,0.94),rgba(242,227,216,0.88))] px-6 py-12 text-center shadow-[0_24px_60px_rgba(90,50,45,0.12)] sm:px-8 lg:px-10">
        <p className="page-eyebrow">About Us</p>
        <h1 className="mt-4 font-display text-4xl text-wine sm:text-5xl">Our Story</h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-ink/62 sm:text-base">
          Sri Kanchi Banaras Silks was created to bring beautiful saree collections into one refined space where tradition,
          color, and celebration can be explored with ease.
        </p>
      </section>

      <section className="app-width page-card p-6 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <h2 className="font-display text-3xl text-wine">Our Mission</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-ink/66 sm:text-base">
              <p>
                We believe every woman deserves to feel beautiful, confident, and connected to tradition. Our goal is to
                present sarees with the same richness and care they carry in real life.
              </p>
              <p>
                We are committed to simple presentation, premium styling, and a storefront that helps customers understand the
                product clearly before they choose it.
              </p>
              <p>
                From traditional weaves to festive favorites, we want this experience to feel elegant without becoming heavy or
                complicated.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {galleryImages.length ? (
              galleryImages.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="aspect-[4/5] overflow-hidden rounded-[1.5rem] border border-[#eadfd8] bg-[#f7eee7]"
                >
                  <img
                    src={image}
                    alt={`Saree showcase ${index + 1}`}
                    className="h-full w-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
              ))
            ) : (
              <>
                <div className="aspect-[4/5] rounded-[1.5rem] border border-[#eadfd8] bg-[#f7eee7]" />
                <div className="aspect-[4/5] rounded-[1.5rem] border border-[#eadfd8] bg-[#f7eee7]" />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="app-width">
        <div className="text-center">
          <h2 className="font-display text-3xl text-wine">Our Values</h2>
          <p className="mt-3 text-sm text-ink/60">The principles that guide everything we do.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {values.map((value) => (
            <article key={value.title} className="page-card p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e7df] text-sm font-semibold text-wine">
                {value.title.charAt(0)}
              </div>
              <h3 className="mt-4 font-display text-2xl text-wine">{value.title}</h3>
              <p className="mt-3 text-sm leading-7 text-ink/62">{value.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="app-width">
        <div className="text-center">
          <h2 className="font-display text-3xl text-wine">Our Journey</h2>
          <p className="mt-3 text-sm text-ink/60">Key moments in our fashion journey.</p>
        </div>
        <div className="mx-auto mt-6 max-w-4xl space-y-4">
          {journey.map((item) => (
            <article key={item.title} className="page-card grid gap-4 p-5 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e7df] text-sm font-semibold text-wine">
                {item.year}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#4a2a2c]">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/62">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <FooterPage />
    </div>
  );
}

export default AboutUsPage;
