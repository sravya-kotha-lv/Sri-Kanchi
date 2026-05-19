import { useState } from 'react';
import { FaEnvelope, FaMapMarkerAlt, FaPhoneAlt, FaWhatsapp } from 'react-icons/fa';
import FooterPage from './FooterPage';
import commonApi from '../api/commonapi';


// Validation utilities
const validateName = (value: string): boolean => /^[a-zA-Z\s]*$/.test(value);
const validatePhone = (value: string): boolean => /^\d*$/.test(value) && value.length <= 10;
const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const contactInfo = [
  {
    title: 'Visit Our Store',
    value: 'Sri Kanchi Banaras Silks',
    note: 'Open the location directly in Google Maps.',
    icon: FaMapMarkerAlt,
    href: 'https://share.google/xjIRBEZSochtC66Xf'
  },
  {
    title: 'Call Us',
    value: '+91 78939 80950',
    note: 'Reach us directly for product enquiries.',
    icon: FaPhoneAlt,
    href: 'tel:917893980950'
  },
  {
    title: 'Email Us',
    value: 'usravanireddy@gmail.com',
    note: 'Send us your enquiry anytime.',
    icon: FaEnvelope,
    href: 'mailto:usravanireddy@gmail.com'
  },
  {
    title: 'WhatsApp',
    value: 'Monday - Saturday',
    note: 'Chat with us directly for quick help.',
    icon: FaWhatsapp,
    href: 'https://wa.me/917893980950'
  }
];

const faqs = [
  {
    title: 'Do you offer video call support?',
    description: 'Yes. We can help you view saree options and share collection details through WhatsApp.'
  },
  {
    title: 'Can I ask about stock availability?',
    description: 'Yes. Contact us with the product name or screenshot and we will help you check availability.'
  },
  {
    title: 'Can I get support before placing an order?',
    description: 'Yes. You can contact us for styling help, collection guidance, and product clarification before purchase.'
  }
];

function ContactPage() {
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'phone' | 'email' | 'subject' | 'message', string>>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Validation based on field type
    if (name === 'name' && value && !validateName(value)) {
      return; // Reject non-letter characters
    }
    if (name === 'phone' && value && !validatePhone(value)) {
      return; // Reject non-digit characters
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSendEmail = async (e: React.MouseEvent<HTMLButtonElement>) => {
  e.preventDefault();

  if (submitLoading) return;

  const { name, phone, email, subject, message } = formData;
  const nextErrors: typeof fieldErrors = {};

  if (!name.trim()) {
    nextErrors.name = 'Please enter your name.';
  }
  if (!phone || phone.length !== 10) {
    nextErrors.phone = 'Please enter a valid 10-digit phone number.';
  }
  if (!email || !validateEmail(email)) {
    nextErrors.email = 'Please enter a valid email address.';
  }
  if (!subject.trim()) {
    nextErrors.subject = 'Please enter a subject.';
  }
  if (!message.trim()) {
    nextErrors.message = 'Please enter your message.';
  }

  if (Object.keys(nextErrors).length > 0) {
    setFieldErrors(nextErrors);
    setSubmitMessage('Please fix the highlighted fields.');
    return;
  }

  setFieldErrors({});
  setSubmitMessage('');
  setSubmitLoading(true);

  try {
    await commonApi.contact.sendMail({
      full_name: name.trim(),
      phone_number: phone.trim(),
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim()
    });

    setSubmitMessage('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', phone: '', email: '', subject: '', message: '' });
  } catch (err) {
    setSubmitMessage(err instanceof Error ? err.message : 'Unable to send your message. Please try again.');
  } finally {
    setSubmitLoading(false);
  }
};





  return (
    <div className="space-y-8 px-3 pb-10 sm:px-5 sm:pb-12 lg:px-8 lg:pb-14">
      <section className="app-width overflow-hidden rounded-[2.4rem] border border-white/80 bg-[linear-gradient(145deg,rgba(255,249,243,0.94),rgba(242,227,216,0.88))] px-6 py-12 text-center shadow-[0_24px_60px_rgba(90,50,45,0.12)] sm:px-8 lg:px-10">
        <p className="page-eyebrow">Contact</p>
        <h1 className="mt-4 font-display text-4xl text-wine sm:text-5xl">Get In Touch</h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-ink/62 sm:text-base">
          We would love to hear from you. Send us a message and we will respond as soon as possible.
        </p>
      </section>

      <section className="app-width grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {contactInfo.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                if (item.href.startsWith('tel:')) {
                  e.preventDefault();
                  window.location.href = item.href;
                }
              }}
              className="page-card block p-6 text-center transition hover:-translate-y-1"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e7df] text-wine">
                <Icon className="text-sm" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-[#4a2a2c]">{item.title}</h2>
              <p className="mt-3 text-sm font-medium text-ink/72">{item.value}</p>
              <p className="mt-2 text-sm leading-6 text-ink/58">{item.note}</p>
            </a>
          );
        })}
      </section>

      <section className="app-width">
        <div className="mx-auto max-w-2xl page-card p-6 sm:p-8">
          <h2 className="text-center font-display text-3xl text-wine">Send us a Message</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-ink/70">
              Full Name
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                inputMode="text"
                pattern="[A-Za-z ]*"
                className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#2c2f3d] outline-none bg-white ${
                  fieldErrors.name ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                }`}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-[#d44b4b] font-medium">{fieldErrors.name}</p>}
            </label>
            <label className="text-sm text-ink/70">
              Phone Number
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter your phone number"
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]*"
                className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#2c2f3d] outline-none bg-white ${
                  fieldErrors.phone ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                }`}
              />
              {fieldErrors.phone && <p className="mt-1 text-xs text-[#d44b4b] font-medium">{fieldErrors.phone}</p>}
            </label>
            <label className="text-sm text-ink/70 sm:col-span-2">
              Email Address
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="example@email.com"
                className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#2c2f3d] outline-none bg-white ${
                  fieldErrors.email ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                }`}
              />
              {fieldErrors.email && <p className="mt-1 text-xs text-[#d44b4b] font-medium">{fieldErrors.email}</p>}
            </label>
            <label className="text-sm text-ink/70 sm:col-span-2">
              Subject
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="How can we help you?"
                className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#2c2f3d] outline-none bg-white ${
                  fieldErrors.subject ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                }`}
              />
              {fieldErrors.subject && <p className="mt-1 text-xs text-[#d44b4b] font-medium">{fieldErrors.subject}</p>}
            </label>
            <label className="text-sm text-ink/70 sm:col-span-2">
              Message
              <textarea
                rows={5}
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Type your message here..."
                className={`mt-2 w-full rounded-[1rem] border px-4 py-3 text-sm text-[#2c2f3d] outline-none bg-white ${
                  fieldErrors.message ? 'border-[#d44b4b]' : 'border-[#e2c8bc]'
                }`}
              />
              {fieldErrors.message && <p className="mt-1 text-xs text-[#d44b4b] font-medium">{fieldErrors.message}</p>}
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
  type="button"
  onClick={handleSendEmail}
  disabled={submitLoading}
  className="rounded-[1rem] bg-[#7f3150] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#6d2944] disabled:cursor-not-allowed disabled:opacity-60"
>
  {submitLoading ? 'Sending...' : 'Send Email'}
</button>

            <a
              href="https://wa.me/917893980950"
              target="_blank"
              rel="noreferrer"
              className="rounded-[1rem] border border-[#e2c8bc] bg-white px-6 py-3 text-sm font-semibold text-[#4a2a2c] transition hover:bg-[#f9f5f2]"
            >
              WhatsApp
            </a>
            <a
              href="https://www.instagram.com/srikanchibanarassilks/?hl=en"
              target="_blank"
              rel="noreferrer"
              className="rounded-[1rem] border border-[#e2c8bc] bg-white px-6 py-3 text-sm font-semibold text-[#4a2a2c] transition hover:bg-[#f9f5f2]"
            >
              Instagram
            </a>
          </div>

          {submitMessage && (
            <div className={`mt-4 rounded-[1rem] p-4 text-center text-sm font-semibold ${submitMessage.includes('✓') ? 'bg-[#e8f6ea] text-[#2b8a4b]' : 'bg-[#fff0f0] text-[#d44b4b]'}`}>
              {submitMessage}
            </div>
            )}
        </div>
      </section>

      <section className="app-width">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-3xl text-wine">Frequently Asked Questions</h2>
          <p className="mt-3 text-center text-sm text-ink/60">Quick answers to common questions.</p>
          <div className="mt-6 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.title} className="page-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq((current) => (current === faq.title ? null : faq.title))}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-[#f9f5f2] transition"
                >
                  <span className="text-base font-semibold text-[#4a2a2c]">{faq.title}</span>
                  <span className={`text-wine transition text-2xl font-light ${openFaq === faq.title ? 'rotate-180' : ''}`}>+</span>
                </button>
                {openFaq === faq.title ? (
                  <p className="border-t border-[#eadfd8] px-5 py-4 text-sm leading-7 text-ink/62">{faq.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <FooterPage />
    </div>
  );
}

export default ContactPage;
