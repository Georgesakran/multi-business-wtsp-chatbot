// utils/states/stepStates/handleViewProductsList.js

const Product = require("../../../models/Product");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const { langKeyFromCustomer } = require("../../language/languageTextHelper");
const PRODUCT_LABELS = require("../../language/labels/productLabels");
const productText = require("../../language/textHelpers");

module.exports = async function handleViewProductsList({
  biz,
  from,
  customer,
  lang,
  txt,
  state,
  res,
}) {
  const langKey = langKeyFromCustomer(customer, biz);
  const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;

  const index = parseMenuIndexFromText(txt);
  const productIds = state.data?.productIds || [];

  // ❌ Invalid index
  if (index == null || index < 0 || index >= productIds.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "من فضلك أرسلي رقم المنتج من القائمة، أو اكتبي *menu* للعودة للقائمة الرئيسية."
          : lang === "hebrew"
          ? "שלחי מספר מוצר מהרשימה, או כתבי *menu* כדי לחזור לתפריט הראשי."
          : "Please send a product number from the list, or type *menu* to go back to the main menu.",
    });
    return res.sendStatus(200);
  }

  // Load product
  const productId = productIds[index];
  const product = await Product.findOne({
    _id: productId,
    businessId: biz._id,
  });

  if (!product) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "هذا المنتج لم يعد متاحاً. جربي منتجاً آخر أو اكتبي *menu*."
          : lang === "hebrew"
          ? "המוצר הזה כבר לא זמין. נסי מוצר אחר או כתבי *menu*."
          : "This product is no longer available. Try another one or type *menu*.",
    });
    return res.sendStatus(200);
  }

  const name = productText(product.name, langKey);
  const descFull = productText(product.description, langKey);
  const category = productText(product.category, langKey);
  const price = product.price ? `${product.price}₪` : "";
  const sku = product.sku || "-";
  const stock = typeof product.stock === "number" ? product.stock : null;

  const owner = biz.owner || {};
  const phone = owner.phone || biz.whatsappNumber || biz.wa?.number || "";

  // Send image if available
  const imgUrl = product.image?.secure_url || product.image?.url;
  if (imgUrl) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: `🛍️ ${name || ""}`,
      mediaUrl: imgUrl,
    });
  }

  const phoneLine = phone
    ? lang === "arabic"
      ? `- الاتصال على: ${phone}`
      : lang === "hebrew"
      ? `- להתקשר אלינו: ${phone}`
      : `- Call us at: ${phone}`
    : lang === "arabic"
    ? "- رقم الهاتف غير مضاف بعد."
    : lang === "hebrew"
    ? "- מספר הטלפון עדיין לא מוגדר."
    : "- Phone number is not configured yet.";

  const detailHeader = `${PL.detailTitle} #${index + 1}`;

  const body = `${detailHeader}

✨ *${name}* — ${price}
📂 ${PL.category}: ${category}
🆔 ${PL.sku}: ${sku}
📝 ${descFull || "-"}

📞 ${
    lang === "arabic"
      ? "للشراء الآن:"
      : lang === "hebrew"
      ? "להזמנה עכשיו:"
      : "To order now:"
  }
${phoneLine}

${PL.detailCta}`;

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body,
  });

  return res.sendStatus(200);
};
