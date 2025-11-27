// utils/menuControllers/actions/viewProducts.js

const Product = require("../../../models/Product");
const setState = require("../../states/setState");
const {sendWhatsApp} = require("../../twilio/sendTwilio");
const { shortText } = require("../../misc/textHelpers");
const { getLocalized } = require("../../language/localization");
const PRODUCT_LABELS = require("../../language/labels/productLabels");

module.exports = async function viewProducts({ lang, langKey, biz, state, from }) {
  const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;

  // 1) Fetch available products
  const products = await Product.find({
    businessId: biz._id,
    status: "active",
    stock: { $gt: 0 },
  })
    .sort({ createdAt: -1 })
    .limit(8);

  if (!products.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "لا توجد منتجات متاحة حالياً."
          : lang === "hebrew"
          ? "אין כרגע מוצרים זמינים."
          : "No products available right now.",
    });
    return;
  }

  // 2) Save state for selecting products
  await setState(state, {
    step: "VIEW_PRODUCTS_LIST",
    data: {
      productIds: products.map((p) => String(p._id)),
    },
  });

  const list = products
    .map((p, i) => {
      const name = getLocalized(p.name, langKey);
      const desc = shortText(getLocalized(p.description, langKey), 180);
      const category = getLocalized(p.category, langKey);
      const price = p.price ? `${p.price}₪` : "";
      const sku = p.sku || "-";

      return (
        `${i + 1}) ✨ *${name}* — ${price}
        📂 ${PL.category}: ${category}
        🆔 ${PL.sku}: ${sku}
        📝 ${desc}
        ──────────────────`
      );
    })
    .join("\n");

  const body = `${PL.listTitle}

${list}

${PL.listCta}`;

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body,
  });
};