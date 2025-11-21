// services/menuService.js

const { t } = require("../utils/i18n");
const { sendWhatsApp } = require("../services/messaging/twilioService");

// --------------------------------------------------
// Parse menu index (Arabic/Hebrew/English digits)
// --------------------------------------------------
function parseMenuIndex(text) {
  if (!text) return null;

  text = text.trim();

  const arZero = "٠".charCodeAt(0);
  const faZero = "۰".charCodeAt(0);

  let normalized = "";

  for (const ch of text) {
    const code = ch.charCodeAt(0);

    if (code >= arZero && code <= arZero + 9) {
      normalized += (code - arZero).toString();
      continue;
    }

    if (code >= faZero && code <= faZero + 9) {
      normalized += (code - faZero).toString();
      continue;
    }

    if (/[0-9]/.test(ch)) {
      normalized += ch;
    }
  }

  if (!normalized) return null;
  const n = parseInt(normalized, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n - 1;
}

// --------------------------------------------------
// Business menu items (from MongoDB)
// --------------------------------------------------
function getVisibleMenuItems(biz) {
  return biz.config?.menuItems || [];
}

// --------------------------------------------------
// Build localized menu text
// --------------------------------------------------
function buildMenuText(biz, langKey, lang) {
  const items = getVisibleMenuItems(biz);

  const title = t(langKey, "main_menu_title") || "";
  let lines = [];

  items.forEach((item, i) => {
    const label =
      item.label?.[langKey] ||
      item.label?.en ||
      item.label?.ar ||
      item.label?.he ||
      "";

    lines.push(`${i + 1}) ${label}`);
  });

  const footer =
    langKey === "ar"
      ? "\n\n💬 أرسل رقم الخيار أو اكتب *menu* لعرض القائمة."
      : langKey === "he"
      ? "\n\n💬 כתוב/י מספר בתפריט או *menu*."
      : "\n\n💬 Send a number or type *menu*.";

  return `${title}\n\n${lines.join("\n")}${footer}`;
}

// --------------------------------------------------
// Execute action by calling correct controller
// --------------------------------------------------
async function executeMenuAction({
  action,
  payload,
  biz,
  from,
  customer,
  state,
  lang,
  langKey,
}) {
  switch (action) {
    // --------------------------------------------------
    // BOOKING FLOW
    // --------------------------------------------------
    case "book_appointment":
      const bookingController = require("../controllers/bookingController");
      return bookingController.startFlow({
        biz,
        from,
        customer,
        state,
        lang,
      });

    // --------------------------------------------------
    // SERVICES
    // --------------------------------------------------
    case "view_services":
      const servicesController = require("../controllers/servicesController");
      return servicesController.showServices({
        biz,
        from,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // PRODUCTS
    // --------------------------------------------------
    case "view_products":
      const productController = require("../controllers/productController");
      return productController.showProducts({
        biz,
        from,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // COURSES
    // --------------------------------------------------
    case "view_courses":
      const courseController = require("../controllers/courseController");
      return courseController.showCourses({
        biz,
        from,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // ABOUT / LOCATION
    // --------------------------------------------------
    case "about_location":
      const aboutController = require("../controllers/aboutController");
      return aboutController.showAbout({
        biz,
        from,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // CONTACT US
    // --------------------------------------------------
    case "contact_us":
      const contactController = require("../controllers/contactController");
      return contactController.showContact({
        biz,
        from,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // MY APPOINTMENTS
    // --------------------------------------------------
    case "my_appointments":
      const appointmentsController = require("../controllers/appointmentsController");
      return appointmentsController.showAppointments({
        biz,
        from,
        customer,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // MY ORDERS
    // --------------------------------------------------
    case "my_orders":
      const ordersController = require("../controllers/ordersController");
      return ordersController.showOrders({
        biz,
        from,
        customer,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // RESCHEDULE / CANCEL
    // --------------------------------------------------
    case "reschedule_appointment":
      const rescheduleController = require("../controllers/rescheduleController");
      return rescheduleController.startReschedule({
        biz,
        from,
        customer,
        state,
        langKey,
        lang,
      });

    // --------------------------------------------------
    // INSTAGRAM LINK
    // --------------------------------------------------
    case "follow_instagram":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          biz?.social?.instagram ||
          (langKey === "ar"
            ? "📸 لا يوجد حساب إنستغرام."
            : langKey === "he"
            ? "📸 אין חשבון אינסטגרם."
            : "📸 No Instagram page available."),
      });

    // --------------------------------------------------
    // CUSTOM ACTION → returns payload text
    // --------------------------------------------------
    case "custom":
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: payload || t(langKey, "unknown_option"),
      });

    // --------------------------------------------------
    // DEFAULT
    // --------------------------------------------------
    default:
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(langKey, "unknown_option"),
      });
  }
}

module.exports = {
  parseMenuIndex,
  getVisibleMenuItems,
  buildMenuText,
  executeMenuAction,
};