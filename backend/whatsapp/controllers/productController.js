// controllers/productController.js

const stateManager = require("../state/stateManager");
const productService = require("../services/productService");
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { getLabel } = require("../utils/i18n");
const parse = require("../utils/parsing");

module.exports = {
  // -----------------------------------------------------
  // Step 1 — Show list of products
  // -----------------------------------------------------
  showProductList: async ({ biz, from, customer, state }) => {
    const lang = customer.language;

    const products = await productService.getActiveProducts(biz._id);
    if (!products.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: getLabel(lang, "no_products"),
      });
    }

    // Save product IDs in session
    await stateManager.setState(state, {
      step: "VIEW_PRODUCTS_LIST",
      data: { productIds: products.map((p) => String(p._id)) },
    });

    const langKey = productService.getLangKey(lang);

    const listMessage = [
      getLabel(lang, "product_list_title"),
      "",
      ...products.map((p, i) => {
        const name = productService.localize(p.name, langKey);
        const desc = productService.short(p.description?.[langKey] || "", 120);
        const price = p.price ? `${p.price}₪` : "";

        return `${i + 1}) ✨ *${name}* — ${price}\n📝 ${desc}`;
      }),
      "",
      getLabel(lang, "product_list_footer"),
    ].join("\n");

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: listMessage,
    });
  },

  // -----------------------------------------------------
  // Step 2 — Show product details
  // -----------------------------------------------------
  showProductDetails: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;
    const langKey = productService.getLangKey(lang);

    const index = parse.number(text);
    const productIds = state.data?.productIds || [];

    if (index < 1 || index > productIds.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: getLabel(lang, "invalid_product"),
      });
    }

    const productId = productIds[index - 1];
    const product = await productService.getProductById(productId);

    if (!product) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: getLabel(lang, "product_not_found"),
      });
    }

    const name = productService.localize(product.name, langKey);
    const desc = productService.localize(product.description, langKey);
    const price = product.price ? `${product.price}₪` : "";
    const category = productService.localize(product.category, langKey);
    const sku = product.sku || "-";
    const stock = typeof product.stock === "number" ? product.stock : null;
    const phone = biz.owner?.phone || biz.whatsappNumber || biz.wa?.number || "";

    const stockLine = stock != null ? `📦 ${getLabel(lang, "stock")}: ${stock}` : "";

    // 1️⃣ Send image first if exists
    const imageUrl = product.image?.url || product.image?.secure_url;
    if (imageUrl) {
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: `🛍️ ${name}`,
        mediaUrl: imageUrl,
      });
    }

    // 2️⃣ Send details
    const details = [
      `${getLabel(lang, "product_details_title")} #${index}`,
      "",
      `✨ *${name}* — ${price}`,
      `📂 ${getLabel(lang, "category")}: ${category}`,
      `🆔 ${getLabel(lang, "sku")}: ${sku}`,
      stockLine,
      `📝 ${desc || "-"}`,
      "",
      `📞 ${getLabel(lang, "order_now")}`,
      phone ? `- ${phone}` : `- ${getLabel(lang, "phone_missing")}`,
      "",
      getLabel(lang, "product_details_footer"),
    ].filter(Boolean).join("\n");

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: details,
    });

    // Stay in VIEW_PRODUCTS_LIST state
  },
};