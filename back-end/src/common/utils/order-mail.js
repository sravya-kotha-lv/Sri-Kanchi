const { sendMail } = require("./mail");

const emailTheme = {
  pageBg: "#ffffff",
  primary: "#7b1f3d",
  primaryDark: "#5b2a34",
  accent: "#c85b4d",
  accentEnd: "#e58c56",
  softBg: "#ffffff",
  softBorder: "#e5e7eb",
};

const sendOrderConfirmationMail = async ({ to, order }) => {
  const itemsText = order.items
    .map(
      (item) =>
        `${item.product_name} x ${item.quantity} = Rs.${Number(item.line_total).toFixed(2)}`
    )
    .join("\n");

  const itemsHtml = order.items
    .map(
      (item) => `
      <div style="padding:12px 0; border-bottom:1px solid #e5e7eb;">
        <p style="margin:0; font-size:14px; color:#111827; font-weight:600;">
          ${item.product_name}
        </p>
        <p style="margin:6px 0 0 0; font-size:14px; color:#16a34a;">
          Qty: ${item.quantity}
        </p>
        <p style="margin:6px 0 0 0; font-size:14px; color:#111827;">
          Amount: Rs.${Number(item.line_total).toFixed(2)}
        </p>
      </div>
    `
    )
    .join("");

  const text = `
Your order has been placed successfully.

Order Number: ${order.order_number}
Payment Method: Cash on Delivery
Payment Status: ${order.payment_status}
Order Status: ${order.order_status}
Total Amount: Rs.${Number(order.total_amount).toFixed(2)}

Items:
${itemsText}

Shipping Address:
${order.shipping_address}
`.trim();

  const html = `
  <div style="background:${emailTheme.pageBg}; padding:24px; font-family: Arial, sans-serif;">
    <div style="max-width:700px; margin:0 auto; background:#ffffff; border:1px solid ${emailTheme.softBorder};">
      <div style="background:${emailTheme.primary}; color:#ffffff; padding:16px 20px; font-size:22px; font-weight:700;">
        Sri Kanchi Banaras Silks
      </div>

      <div style="padding:20px;">
        <p style="margin:0 0 10px 0; font-size:16px; color:#111827;">
          Hi ${order.customer_name},
        </p>

        <h1 style="margin:0 0 16px 0; font-size:28px; color:${emailTheme.primaryDark};">
          Order placed successfully
        </h1>

        <p style="margin:0 0 18px 0; font-size:14px; color:#4b5563;">
          Your order has been successfully placed and is now being processed.
        </p>

        <div style="border:1px solid ${emailTheme.softBorder}; background:${emailTheme.softBg}; padding:16px; margin-bottom:18px;">
          <p style="margin:0 0 8px 0; font-size:14px;">
            <span style="color:#6b7280; font-weight:600;">Order Number:</span>
            <span style="color:#111827;"> ${order.order_number}</span>
          </p>

          <p style="margin:0 0 8px 0; font-size:14px;">
            <span style="color:#6b7280; font-weight:600;">Payment Status:</span>
            <span style="color:#f59e0b; font-weight:700;"> ${order.payment_status}</span>
          </p>

          <p style="margin:0 0 8px 0; font-size:14px;">
            <span style="color:#6b7280; font-weight:600;">Order Status:</span>
            <span style="color:#16a34a; font-weight:700;"> ${order.order_status}</span>
          </p>

          <p style="margin:0; font-size:16px;">
            <span style="color:#6b7280; font-weight:600;">Total Amount:</span>
            <span style="color:#111827; font-weight:700;"> Rs.${Number(order.total_amount).toFixed(2)}</span>
          </p>
        </div>

        <div style="border:1px solid #d1fae5; background:#f0fdf4; padding:16px; margin-bottom:18px;">
          <p style="margin:0 0 10px 0; font-size:16px; color:#111827; font-weight:700;">
            Delivery Address
          </p>
          <p style="margin:0; font-size:14px; color:#374151; line-height:22px;">
            ${order.shipping_address}
          </p>
        </div>

        <div style="margin-bottom:18px;">
          <p style="margin:0 0 10px 0; font-size:16px; color:${emailTheme.primary}; font-weight:700;">
            Ordered Items
          </p>
          ${itemsHtml}
        </div>

        <div style="padding-top:12px; border-top:1px solid #e5e7eb;">
          <p style="margin:0; font-size:14px; color:#6b7280;">
            Thank you for shopping with Sri Kanchi Banaras Silks.
          </p>
        </div>
      </div>
    </div>
  </div>
`.trim();

  await sendMail(to, "Order placed successfully", text, html);
};

module.exports = {
  sendOrderConfirmationMail,
};
