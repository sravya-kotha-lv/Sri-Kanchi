const { sendMail } = require("../common/utils/mail");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getReceiverEmail = () =>
  process.env.CONTACT_RECEIVER_EMAIL || process.env.EMAIL_USER;

const sendContactMail = async (payload) => {
  const { full_name, phone_number, email, subject, message } = payload;
  const receiverEmail = getReceiverEmail();
  const mailSubject = `Sri Kanchi Banaras Silks-Customer Enquiry: ${subject}`;

  const text = `
New contact enquiry

Name: ${full_name}
Phone: ${phone_number}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
      <h2 style="margin:0 0 16px 0; color:#8b2f55;">New Contact Enquiry</h2>
      <p><strong>Name:</strong> ${escapeHtml(full_name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(phone_number)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-line;">${escapeHtml(message)}</p>
    </div>
  `;

  await sendMail(receiverEmail, mailSubject, text, html, {
    replyTo: email,
  });

  return {
    emailSent: true,
  };
};

module.exports = {
  sendContactMail,
};
