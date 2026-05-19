import FooterPage from './FooterPage';

const sections = [
  {
    title: 'Use Of The Website',
    text: 'Sri Kanchi Banaras Silks provides this website for browsing saree collections, checking product details, and placing orders. Please use the site only for lawful personal shopping and account activity.'
  },
  {
    title: 'Product Information',
    text: 'We try to present product names, images, prices, descriptions, and availability clearly. Minor differences in color, texture, or display can happen because of screen settings and photography.'
  },
  {
    title: 'Orders And Payments',
    text: 'Orders are confirmed after the required customer details and payment steps are completed. If a product becomes unavailable, our team may contact you about replacement, delay, or cancellation options.'
  },
  {
    title: 'Returns And Support',
    text: 'Return, exchange, and support requests are reviewed based on product condition, order details, and store policy. Customers should contact us promptly with order information for help.'
  }
];

function TermsAndConditionsPage() {
  return (
    <>
      <div className="space-y-8 px-3 pb-10 sm:px-5 sm:pb-12 lg:px-8 lg:pb-14">
        <section className="app-width overflow-hidden rounded-[2.4rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,249,243,0.94),rgba(242,227,216,0.88))] px-6 py-12 text-center shadow-[0_24px_60px_rgba(90,50,45,0.12)] sm:px-8 lg:px-10">
          <p className="page-eyebrow">Sri Kanchi Banaras Silks</p>
          <h1 className="mt-4 font-display text-4xl text-wine sm:text-5xl">Terms &amp; Conditions</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-ink/62 sm:text-base">
            These terms explain the basic expectations for using our website, browsing collections, and placing orders.
          </p>
        </section>

        <section className="app-width page-card p-6 sm:p-8 lg:p-10">
          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[1.3rem] border border-[#ead7ce] bg-white/58 p-5">
                <h2 className="font-display text-2xl text-wine">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-ink/64">{section.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <FooterPage />
    </>
  );
}

export default TermsAndConditionsPage;
