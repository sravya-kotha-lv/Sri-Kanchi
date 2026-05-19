const { sequelize } = require("../config/db");
const { sendMail } = require("../common/utils/mail");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatPrice = (value) => {
  const amount = Number(value || 0);
  return `Rs. ${amount.toFixed(2)}`;
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const getStoreName = () => process.env.STORE_NAME || "Sri Kanchi Banaras Silks";
const buildProductUrl = (frontendUrl, slug) => `${frontendUrl}/products/${encodeURIComponent(slug || "")}`;
const buildNewArrivalsUrl = (frontendUrl) => `${frontendUrl}/new-arrivals`;
const emailTheme = {
  pageBg: "#ffffff",
  primary: "#7b1f3d",
  primaryDark: "#5b2a34",
  accent: "#c85b4d",
  accentEnd: "#e58c56",
  softBg: "#ffffff",
  softBorder: "#e5e7eb",
};
const getFallbackImageUrl = (productName) => {
  const label = encodeURIComponent(productName || "Sri Kanchi Saree");
  return `https://placehold.co/140x180/f3f4f6/9ca3af?text=${label}`;
};

const parseDataUriImage = (value) => {
  const match = String(value || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    return null;
  }

  return {
    contentType: match[1],
    content: match[2].replace(/\s+/g, ""),
  };
};

const getImageExtension = (contentType) => {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  return "img";
};

const buildEmailImageSource = (product, attachments) => {
  const productImageUrl = product.images?.[0]?.image_url;

  if (typeof productImageUrl === "string" && /^https?:\/\//i.test(productImageUrl.trim())) {
    return productImageUrl.trim();
  }

  const dataUriImage = parseDataUriImage(productImageUrl);
  if (dataUriImage) {
    const cid = `new-arrival-${product.id}@sri-kanchi-banaras-silks`;
    attachments.push({
      filename: `${String(product.slug || product.id || "product")}.${getImageExtension(dataUriImage.contentType)}`,
      content: dataUriImage.content,
      encoding: "base64",
      contentType: dataUriImage.contentType,
      cid,
    });
    return `cid:${cid}`;
  }

  if (typeof product.category_image_url === "string" && /^https?:\/\//i.test(product.category_image_url.trim())) {
    return product.category_image_url.trim();
  }

  return getFallbackImageUrl(product?.name);
};

const listNewArrivalProducts = async () => {
  const [products] = await sequelize.query(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.short_description,
      p.fabric,
      p.occasion,
      p.color,
      c.image_url AS category_image_url,
      p.mrp,
      p.selling_price,
      p.stock,
      p.is_new_arrival,
      p.status,
      p.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'image_url', pi.image_url,
            'alt_text', pi.alt_text,
            'is_primary', pi.is_primary,
            'sort_order', pi.sort_order
          )
          ORDER BY pi.is_primary DESC, pi.sort_order ASC, pi.id ASC
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) AS images
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_images pi ON pi.product_id = p.id
    WHERE p.is_new_arrival = TRUE
      AND p.status = 'active'
    GROUP BY p.id, c.image_url
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 12
  `);

  return products;
};

const buildProductTextList = (products, frontendUrl) => {
  if (!products.length) {
    return "No new arrival products are currently active.";
  }

  return products
    .map((product, index) => {
      const productUrl = buildProductUrl(frontendUrl, product.slug);
      return `${index + 1}. ${product.name} - ${formatPrice(product.selling_price)} - ${productUrl}`;
    })
    .join("\n");
};

const buildProductHtmlList = (products, frontendUrl, attachments) => {
  if (!products.length) {
    return {
      html: `
      <div style="border:1px solid ${emailTheme.softBorder}; background:${emailTheme.softBg}; padding:16px; margin-bottom:18px;">
        <p style="margin:0; font-size:14px; color:#4b5563;">
          No new arrival products are currently active.
        </p>
      </div>
    `,
      attachments,
    };
  }

  const html = products
    .map((product) => {
      const productUrl = buildProductUrl(frontendUrl, product.slug);
      const imageUrl = buildEmailImageSource(product, attachments);
      const productDescription = product.short_description || product.fabric || "Fresh saree arrival";

      return `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e5e7eb; border-collapse:separate; margin-bottom:16px; background:#ffffff;">
          <tr>
            <td width="160" valign="top" style="padding:16px 12px 16px 16px;">
              <img
                src="${escapeHtml(imageUrl)}"
                alt="${escapeHtml(product.name)}"
                width="140"
                height="180"
                style="display:block; width:140px; height:180px; border-radius:8px; object-fit:cover; border:1px solid #e5e7eb;"
              />
            </td>
            <td valign="top" style="padding:16px 16px 16px 12px;">
              <h3 style="margin:0 0 8px 0; font-size:20px; line-height:28px; color:#111827;">
                ${escapeHtml(product.name)}
              </h3>
              <p style="margin:0 0 8px 0; font-size:18px; color:${emailTheme.primary}; font-weight:700;">
                ${escapeHtml(formatPrice(product.selling_price))}
              </p>
              <p style="margin:0 0 8px 0; font-size:14px; color:#4b5563; line-height:22px;">
                ${escapeHtml(productDescription)}
              </p>
              <p style="margin:0 0 14px 0; font-size:13px; color:#6b7280;">
                ${product.color ? `Colour: ${escapeHtml(product.color)}` : ""}
                ${product.color && product.occasion ? " | " : ""}
                ${product.occasion ? `Occasion: ${escapeHtml(product.occasion)}` : ""}
              </p>
              <a
                href="${escapeHtml(productUrl)}"
                style="display:inline-block; background:${emailTheme.primary}; color:#ffffff; padding:10px 16px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:700;"
              >
                Place Order
              </a>
            </td>
          </tr>
        </table>
      `;
    })
    .join("");

  return { html, attachments };
};

const sendNewArrivalEmail = async (email) => {
  const frontendUrl = getFrontendUrl();
  const storeName = getStoreName();
  const newArrivalsUrl = buildNewArrivalsUrl(frontendUrl);
  const products = await listNewArrivalProducts();
  const { html: productsHtml, attachments } = buildProductHtmlList(products, frontendUrl, []);
  const subject = `New Arrivals from ${storeName}`;
  const text = `Hello!

New saree arrivals are now available at ${storeName}.

${buildProductTextList(products, frontendUrl)}

Explore the latest collection: ${newArrivalsUrl}`;
  const html = `
    <div style="background:${emailTheme.pageBg}; padding:24px; font-family: Arial, sans-serif;">
      <div style="max-width:700px; margin:0 auto; background:#ffffff; border:1px solid ${emailTheme.softBorder};">
        <div style="background:${emailTheme.primary}; color:#ffffff; padding:16px 20px; font-size:22px; font-weight:700;">
          ${escapeHtml(storeName)}
        </div>

        <div style="padding:20px;">
          <p style="margin:0 0 10px 0; font-size:16px; color:#111827;">
            Hello,
          </p>

          <h1 style="margin:0 0 16px 0; font-size:28px; color:${emailTheme.primaryDark};">
            New arrivals are here
          </h1>

          <p style="margin:0 0 18px 0; font-size:14px; color:#4b5563;">
            Fresh saree arrivals are now available at ${escapeHtml(storeName)}. Browse the latest picks below and continue to place your order.
          </p>

          <div style="margin-bottom:18px;">
            <p style="margin:0 0 10px 0; font-size:16px; color:${emailTheme.primary}; font-weight:700;">
              New Arrival Items
            </p>
            ${productsHtml}
          </div>

          <div style="padding-top:12px; border-top:1px solid #e5e7eb;">
            <a
              href="${escapeHtml(newArrivalsUrl)}"
              style="display:inline-block; background:${emailTheme.accent}; background-image:linear-gradient(90deg, ${emailTheme.primary} 0%, ${emailTheme.accent} 55%, ${emailTheme.accentEnd} 100%); color:#ffffff; padding:12px 18px; border-radius:6px; text-decoration:none; font-size:14px; font-weight:700;"
            >
              Explore New Arrivals
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  await sendMail(email, subject, text, html, { attachments });

  return {
    email,
    count: products.length,
    products,
    emailSent: true,
  };
};

module.exports = {
  sendNewArrivalEmail,
  listNewArrivalProducts,
};
