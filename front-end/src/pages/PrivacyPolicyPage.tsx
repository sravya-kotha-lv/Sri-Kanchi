import FooterPage from './FooterPage';

const sections = [
  {
    title: 'Information We Collect',
    text: 'We may collect details such as name, phone number, email, delivery address, order information, and account activity when you use our website or contact us.'
  },
  {
    title: 'How We Use Information',
    text: 'Customer information is used to process orders, provide support, improve the shopping experience, and share order or service-related communication.'
  },
  {
    title: 'Data Care',
    text: 'We aim to handle customer information responsibly and limit access to details needed for store operations, order handling, and support.'
  },
  {
    title: 'Customer Choices',
    text: 'Customers can contact us to ask questions about their information, request corrections, or get help with account and order-related privacy concerns.'
  }
];

function PrivacyPolicyPage() {
  return (
    <>
      <div className="space-y-8 px-3 pb-10 sm:px-5 sm:pb-12 lg:px-8 lg:pb-14">
        <section className="app-width overflow-hidden rounded-[2.4rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,249,243,0.94),rgba(242,227,216,0.88))] px-6 py-12 text-center shadow-[0_24px_60px_rgba(90,50,45,0.12)] sm:px-8 lg:px-10">
          <p className="page-eyebrow">Sri Kanchi Banaras Silks</p>
          <h1 className="mt-4 font-display text-4xl text-wine sm:text-5xl">Privacy Policy</h1>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-ink/62 sm:text-base">
            This policy explains how we care for information shared while browsing, ordering, or contacting our store.
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

export default PrivacyPolicyPage;
