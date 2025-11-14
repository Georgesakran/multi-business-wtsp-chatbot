// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const ConversationState = require("../models/ConversationState");

// Twilio send helpers
const { sendWhatsApp, sendTemplate } = require("../utils/sendTwilio");

// -------------------- constants & helpers --------------------
const BACK = "0";
const CANCEL = "9";

const rawText = (req) => (req.body?.Body || "").trim();
const lower = (s) => String(s || "").toLowerCase();
const isCancelCmd = (txt) => txt === CANCEL || lower(txt) === "cancel";
// restart means: reset language + state
const isRestartCmd = (txt) =>
  ["restart", "/restart", "start"].includes(lower(txt));
const isHelpCmd = (txt) => ["help", "?", "instructions"].includes(lower(txt));

// normalize E.164 without "whatsapp:"
const toE164 = (x) => String(x || "").replace(/^whatsapp:/, "");

// ---------- state helpers ----------
async function getState({ businessId, phoneNumber }) {
  let doc = await ConversationState.findOne({ businessId, phoneNumber });
  if (!doc) {
    doc = await ConversationState.create({
      businessId,
      phoneNumber,
      step: "LANGUAGE_SELECT",
      data: {},
    });
  }
  return doc;
}

async function setState(stateDoc, patch) {
  if (!stateDoc) return null;
  if (patch.step) stateDoc.step = patch.step;
  if (patch.data) stateDoc.data = { ...(stateDoc.data || {}), ...patch.data };
  await stateDoc.save();
  return stateDoc;
}

// ---------- language parsing / mapping ----------

// ---------- Product helpers for multi-language fields ----------

const PRODUCT_LABELS = {
    arabic: {
      category: "الفئة",
      sku: "الكود",
      stock: "الكمية المتوفرة",
      listTitle: "🛍️ *منتجات مختارة لك*",
      listCta:
        "💬 أرسلي رقم المنتج الذي أعجبك أو اكتبي سؤالك عن أي منتج، ويمكنك دائمًا كتابة *menu* للعودة للقائمة.",
      detailTitle: "🛍️ *تفاصيل المنتج*",
      detailCta:
        "📞 للطلب الآن: يمكنك الاتصال على الرقم الظاهر أو الرد باسمك + مدينتك + الكمية المطلوبة.\nاكتبي رقم منتج آخر لعرض تفاصيله، أو اكتبي *menu* للعودة للقائمة.",
    },
    hebrew: {
      category: "קטגוריה",
      sku: "מק״ט",
      stock: "כמות במלאי",
      listTitle: "🛍️ *מוצרים נבחרים עבורך*",
      listCta:
        "💬 שלחי את מספר המוצר שאהבת או כתבי שאלה על כל מוצר. ניתן תמיד לכתוב *menu* כדי לחזור לתפריט.",
      detailTitle: "🛍️ *פרטי המוצר*",
      detailCta:
        "📞 להזמנה: אפשר להתקשר למספר שמופיע או לשלוח לנו את שמך + העיר + הכמות.\nאפשר לשלוח מספר מוצר אחר לפרטים נוספים, או לכתוב *menu* כדי לחזור לתפריט.",
    },
    english: {
      category: "Category",
      sku: "SKU",
      stock: "Stock",
      listTitle: "🛍️ *Featured Products*",
      listCta:
        "💬 Send the product number you like or ask any question. You can always type *menu* to return.",
      detailTitle: "🛍️ *Product Details*",
      detailCta:
        "📞 To order: call the number shown or reply with your name, city and desired quantity.\nYou can send another product number for details, or type *menu* to go back.",
    },
  };
  
  function productText(fieldObj, langKey) {
    return (
      (fieldObj && fieldObj[langKey]) ||
      fieldObj?.en ||
      fieldObj?.ar ||
      fieldObj?.he ||
      ""
    );
  }
  
  function shortText(txt, max = 150) {
    if (!txt) return "";
    return txt.length > max ? txt.slice(0, max) + "..." : txt;
  }


function parseLanguageChoice(txt) {
  const t = lower(txt);
  // numbers
  if (t === "1") return "arabic";
  if (t === "2") return "english";
  if (t === "3") return "hebrew";

  // labels (accept many variants)
  if (["العربية", "ar", "arabic", "arabic 🇸🇦"].includes(t)) return "arabic";
  if (["english", "en", "english 🇬🇧", "english 🇺🇸"].includes(t)) return "english";
  if (["עברית", "hebrew", "he"].includes(t)) return "hebrew";

  return null;
}

// tiny i18n for helper texts (help, cancel, etc.)
function t(lang, key, vars = {}) {
  const L = {
    choose_language: {
      arabic: "من فضلك اختر اللغة:",
      english: "Please choose your language:",
      hebrew: "בחר/י שפה בבקשה:",
    },
    got_language: {
      arabic: "تم تحديث اللغة ✅",
      english: "Language updated ✅",
      hebrew: "השפה עודכנה ✅",
    },
    welcome: {
      arabic: "أهلاً بك! كيف نقدر نساعدك اليوم؟",
      english: "Welcome! How can we help you today?",
      hebrew: "ברוך/ה הבא/ה! איך נוכל לעזור היום?",
    },
    hint_menu: {
      arabic: "أرسل *menu* لعرض القائمة أو *book* لبدء الحجز.",
      english: "Send *menu* for the menu or *book* to start booking.",
      hebrew: "שלח/י *menu* לתפריט או *book* כדי להתחיל הזמנה.",
    },
    cancelled: {
      arabic: "❌ تم الإلغاء. أرسل *menu* للبدء من جديد.",
      english: "❌ Cancelled. Send *menu* to start again.",
      hebrew: "❌ בוטל. שלח/י *menu* כדי להתחיל מחדש.",
    },
    restarting: {
      arabic: "🔁 نبدأ من جديد…",
      english: "🔁 Starting again…",
      hebrew: "🔁 מתחילים מחדש…",
    },
    help: {
      arabic: `ℹ️ *طريقة الاستخدام*\n• اختر بالزر أو الأرقام (1، 2، 3...)\n• *${CANCEL}* أو *cancel* للإلغاء\n• *menu* لعرض القائمة`,
      english: `ℹ️ *How to use*\n• Choose by button or numbers (1, 2, 3...)\n• *${CANCEL}* or *cancel* to cancel\n• *menu* to see options`,
      hebrew: `ℹ️ *איך משתמשים*\n• בחר/י בכפתור או במספרים (1, 2, 3...)\n• *${CANCEL}* או *cancel* לביטול\n• *menu* להצגת אפשרויות`,
    },
  };

  let s = L[key]?.[lang] || L[key]?.english || "";
  Object.entries(vars).forEach(([k, v]) => {
    s = s.replaceAll(`{{${k}}}`, v);
  });
  return s;
}

// full word language used in Customer + biz.config
function langFromCustomer(cust, biz) {
  return (
    cust?.language ||
    biz?.config?.language ||
    biz?.language ||
    (biz?.wa?.locale === "ar"
      ? "arabic"
      : biz?.wa?.locale === "he"
      ? "hebrew"
      : "english") ||
    "english"
  );
}

// ---------- helpers to read config.messages ----------
function langKeyFromCustomer(customer, biz) {
  if (customer?.language === "arabic") return "ar";
  if (customer?.language === "english") return "en";
  if (customer?.language === "hebrew") return "he";

  if (biz?.config?.language === "arabic") return "ar";
  if (biz?.config?.language === "english") return "en";
  if (biz?.config?.language === "hebrew") return "he";

  if (biz?.wa?.locale === "ar") return "ar";
  if (biz?.wa?.locale === "he") return "he";
  if (biz?.wa?.locale === "en") return "en";

  return "en";
}

function langKeyFromChoice(choice) {
  if (choice === "arabic") return "ar";
  if (choice === "english") return "en";
  if (choice === "hebrew") return "he";
  return "en";
}

function getLocalized(field, langKey) {
    if (!field) return "";
  
    // case 1: field is simple string (current Product schema)
    if (typeof field === "string") return field;
  
    // case 2: field is an object: { ar, en, he }
    if (typeof field === "object") {
      return (
        field[langKey] ||
        field.en ||
        field.ar ||
        field.he ||
        ""
      );
    }
  
    return "";
  }

function businessNameFor(biz, langKey) {
  if (!biz) return "";
  if (langKey === "ar") return biz.nameArabic || biz.nameEnglish || "";
  if (langKey === "he") return biz.nameHebrew || biz.nameEnglish || "";
  return biz.nameEnglish || biz.nameArabic || biz.nameHebrew || "";
}

// type: "welcome_first" | "welcome_returning" | "fallback" | "main_menu"
function getConfigMessage(biz, langKey, type, fallbackText = "") {
  const msg =
    biz?.config?.messages?.[langKey]?.[type] ||
    biz?.config?.messages?.en?.[type] ||
    fallbackText ||
    "";

  const name = businessNameFor(biz, langKey);
  return msg.replaceAll("{{business_name}}", name);
}

// ---------- NEW: menuItems helpers (using id/action/label) ----------

// enabled + sorted by id
function getVisibleMenuItemsSorted(biz) {
  const arr = (biz?.config?.menuItems || []).filter(
    (item) => item && item.enabled !== false
  );

  arr.sort((a, b) => {
    const aid = Number(a.id) || 0;
    const bid = Number(b.id) || 0;
    return aid - bid;
  });

  return arr;
}

// build the full menu text ONLY from config.menuItems
function buildMenuText(biz, langKey, langFull) {
    const items = getVisibleMenuItemsSorted(biz);
    const bizName = businessNameFor(biz, langKey);
  
    // If no structured menuItems → fallback to *old main_menu* behavior
    if (!items.length) {
      return getConfigMessage(
        biz,
        langKey,
        "main_menu",
        langFull === "arabic"
          ? "*القائمة*\n1) حجز موعد 💅\n2) الأسئلة الشائعة ❓\n3) تواصل مع المالك 📞\n\nأرسل رقم الخيار."
          : langFull === "hebrew"
          ? "*תפריט*\n1) קבע/י תור 💅\n2) שאלות נפוצות ❓\n3) יצירת קשר 📞\n\nשלח/י מספר."
          : "*Menu*\n1) Book an appointment 💅\n2) FAQs ❓\n3) Contact owner 📞\n\nReply with a number."
      );
    }
  
    // ✅ NEW: header is generated in code – we IGNORE messages.main_menu
    const header =
      langFull === "arabic"
        ? `🌿 *القائمة الرئيسية — ${bizName}*`
        : langFull === "hebrew"
        ? `🌿 *תפריט ראשי — ${bizName}*`
        : `🌿 *Main Menu — ${bizName}*`;
  
    const lines = items.map((item, idx) => {
      const n = idx + 1;
      const labelObj = item.label || item.labels || {};
      const label =
        labelObj[langKey] ||
        labelObj.en ||
        labelObj.ar ||
        labelObj.he ||
        item.action;
  
      return `${n}) ${label}`;
    });
  
    const footer =
      langFull === "arabic"
        ? "\n💬 أرسل رقم الخيار أو اكتب *menu* في أي وقت لعرض القائمة مرة أخرى."
        : langFull === "hebrew"
        ? "\n💬 שלח/י את מספר האפשרות או כתוב/י *menu* בכל זמן כדי לראות את התפריט שוב."
        : "\n💬 Send the option number or type *menu* anytime to see this list again.";
  
    return [header, lines.join("\n"), footer].filter(Boolean).join("\n\n");
  }

// parse user input number (supports Arabic digits)
function parseMenuIndexFromText(txt) {
  if (!txt) return null;

  const arabicZero = "٠".charCodeAt(0);
  const arabicExtZero = "۰".charCodeAt(0);

  let normalized = "";
  for (const ch of txt.trim()) {
    const code = ch.charCodeAt(0);
    if (code >= arabicZero && code <= arabicZero + 9) {
      normalized += String(code - arabicZero);
    } else if (code >= arabicExtZero && code <= arabicExtZero + 9) {
      normalized += String(code - arabicExtZero);
    } else if (/[0-9]/.test(ch)) {
      normalized += ch;
    }
  }

  if (!normalized) return null;
  const n = parseInt(normalized, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n - 1; // index
}

// ---------- template helpers ----------
async function sendLanguageTemplate(biz, to) {
  const contentSid = biz?.wa?.templates?.languageSelectSid;
  if (!contentSid) return false;

  await sendTemplate({
    from: biz.wa.number,
    to,
    contentSid,
    variables: {},
    messagingServiceSid: biz?.wa?.messagingServiceSid || undefined,
  });

  return true;
}

async function sendLanguageFallback(biz, to) {
  const body =
    "Please choose language:\n" +
    "1) العربية\n" +
    "2) English\n" +
    "3) עברית";
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function handleMenuAction({ action, payload, lang, langKey, biz, state, from }) {
    switch (action) {
      case "book_appointment": {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "تمام! سنبدأ الحجز بخطوات بسيطة. (لاحقًا سنحولها لقوالب أزرار)"
              : lang === "hebrew"
              ? "מעולה! מתחילים הזמנה בכמה שלבים פשוטים. (בהמשך נעבור לתבניות עם כפתורים)"
              : "Great! Let’s start booking in a few simple steps. (We’ll switch to template buttons next)",
        });
        await setState(state, { step: "BOOKING_START", data: {} });
        return;
      }
  
      case "view_services": {
        const services = (biz.services || []).filter(
          (s) => s && s.isActive !== false
        );
  
        if (!services.length) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "لا توجد خدمات مضافة بعد."
                : lang === "hebrew"
                ? "עדיין לא הוגדרו שירותים."
                : "No services defined yet.",
          });
          return;
        }
  
        const key = langKey; // 'ar' | 'en' | 'he'
  
        const header =
          lang === "arabic"
            ? "✨ *خدماتنا الرئيسية*"
            : lang === "hebrew"
            ? "✨ *השירותים שלנו*"
            : "✨ *Our main services*";
  
        const lines = services.slice(0, 8).map((s, i) => {
          const name = s.name?.[key] || s.name?.en || "";
          const desc = s.description?.[key] || s.description?.en || "";
          const price =
            typeof s.price === "number" && s.price > 0 ? `${s.price}₪` : "";
          const duration =
            typeof s.duration === "number" && s.duration > 0
              ? lang === "arabic"
                ? `${s.duration} دقيقة`
                : lang === "hebrew"
                ? `${s.duration} דק׳`
                : `${s.duration} min`
              : "";
  
          return (
            `${i + 1}) 💅 *${name}*` +
            (price ? ` — ${price}` : "") +
            (duration ? ` • ${duration}` : "") +
            (desc ? `\n   ${desc}` : "")
          );
        });
  
        const footer =
          lang === "arabic"
            ? "\n💬 أرسلي رقم الخدمة التي تهمك، أو اكتبي *menu* للعودة إلى القائمة."
            : lang === "hebrew"
            ? "\n💬 כתבי את מספר השירות שמעניין אותך, או הקלידי *menu* כדי לחזור לתפריט."
            : "\n💬 Reply with the service number you like, or type *menu* to go back to the main menu.";
  
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body: [header, lines.join("\n\n"), footer].join("\n\n"),
        });
  
        return;
      }
  
      case "view_products": {
        // משתמשים ב-langKey שהעברנו לפונקציה – לא ב-customer
        const key = langKey; // 'ar' | 'en' | 'he'
        const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;
  
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
  
        // נשמור את ה־IDs כדי שנוכל לזהות את הבחירה אח"כ
        await setState(state, {
          step: "VIEW_PRODUCTS_LIST",
          data: {
            productIds: products.map((p) => String(p._id)),
          },
        });
  
        const list = products
          .map((p, i) => {
            const name = productText(p.name, key);
            const desc = shortText(productText(p.description, key), 180);
            const category = productText(p.category, key);
            const price = p.price ? `${p.price}₪` : "";
            const sku = p.sku || "-";
  
            return (
  `${i + 1}) ✨ *${name}* — ${price}
     📂 ${PL.category}: ${category}
     🆔 ${PL.sku}: ${sku}
     📝 ${desc}
  ────────────────────────`
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
  
        return;
      }
  
      case "view_courses": {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "الدورات وورش العمل غير مفعّلة بعد. اسألينا في أي وقت وسنساعدك 😊"
              : lang === "hebrew"
              ? "קורסים וסדנאות עדיין לא מחוברים. אפשר לשאול אותנו ונעזור בשמחה 😊"
              : "Courses & workshops are not wired yet. Ask us directly and we’ll help 😊",
        });
        return;
      }
  
      case "about_location": {
        const loc = biz.location || {};
        const body =
          lang === "arabic"
            ? `📍 عن الصالون / الموقع:\nالمدينة: ${loc.city || "-"}\nالشارع: ${
                loc.street || "-"
              }`
            : lang === "hebrew"
            ? `📍 על הסלון / מיקום:\nעיר: ${loc.city || "-"}\nרחוב: ${
                loc.street || "-"
              }`
            : `📍 About the salon / location:\nCity: ${loc.city || "-"}\nStreet: ${
                loc.street || "-"
              }`;
  
        await sendWhatsApp({ from: biz.wa.number, to: from, body });
        return;
      }
  
      case "my_appointments": {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "عرض مواعيدك السابقة والقادمة سيتم تفعيله قريبًا."
              : lang === "hebrew"
              ? "צפייה בתורים שלך תופעל בקרוב."
              : "Viewing your appointments will be available soon.",
        });
        return;
      }
  
      case "my_orders": {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "عرض طلباتك السابقة غير مفعّل بعد."
              : lang === "hebrew"
              ? "צפייה בהזמנות שלך עדיין לא זמינה."
              : "Order history is not wired yet.",
        });
        return;
      }
  
      case "reschedule_appointment": {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "لتعديل أو إلغاء موعد، أرسل لنا تفاصيل الموعد الحالي وسنساعدك يدويًا 👩‍💻"
              : lang === "hebrew"
              ? "כדי לשנות או לבטל תור, כתבי לנו את פרטי התור הנוכחי ונטפל בזה ידנית 👩‍💻"
              : "To reschedule or cancel, please send us your current booking details and we’ll handle it manually 👩‍💻",
        });
        return;
      }
  
      case "contact_us": {
        const owner = biz.owner || {};
        const body =
          lang === "arabic"
            ? `📞 تواصلي معنا:\nهاتف: ${owner.phone || "-"}\nبريد: ${
                owner.email || "-"
              }`
            : lang === "hebrew"
            ? `📞 צרי קשר:\nטלפון: ${owner.phone || "-"}\nאימייל: ${
                owner.email || "-"
              }`
            : `📞 Contact us:\nPhone: ${owner.phone || "-"}\nEmail: ${
                owner.email || "-"
              }`;
  
        await sendWhatsApp({ from: biz.wa.number, to: from, body });
        return;
      }
  
      case "follow_instagram": {
        const url = payload || "";
        const body =
          lang === "arabic"
            ? `📸 تابعينا على إنستغرام:\n${url || "الرابط غير مضاف بعد."}`
            : lang === "hebrew"
            ? `📸 עקבי אחרינו באינסטגרם:\n${url || "הקישור עדיין לא הוגדר."}`
            : `📸 Follow us on Instagram:\n${url || "Link not configured yet."}`;
  
        await sendWhatsApp({ from: biz.wa.number, to: from, body });
        return;
      }
  
      case "custom":
      default: {
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body:
            lang === "arabic"
              ? "هذا الخيار غير مفعّل بعد. جرّبي خيارًا آخر من القائمة أو أرسلي *menu*."
              : lang === "hebrew"
              ? "האפשרות הזו עדיין לא מחוברת. נסי אפשרות אחרת בתפריט או שלחי *menu*."
              : "This option is not wired yet. Please choose another option or send *menu*.",
        });
        return;
      }
    }
  }

// -------------------- webhook --------------------
router.post("/", async (req, res) => {
  try {
    const from = toE164(req.body?.From); // customer WA number
    const to = toE164(req.body?.To); // business WA number
    const txt = rawText(req);

    // 1) Find business by WA number
    const biz = await Business.findOne({ "wa.number": to, isActive: true });
    if (!biz) return res.sendStatus(200);

    // 2) Load state + customer
    let state = await getState({ businessId: biz._id, phoneNumber: from });
    let customer = await Customer.findOne({ businessId: biz._id, phone: from });

    // 3) Global commands
    if (isHelpCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "help"),
      });
      return res.sendStatus(200);
    }

    if (isRestartCmd(txt)) {
      state = await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      const sent = await sendLanguageTemplate(biz, from);
      if (!sent) await sendLanguageFallback(biz, from);
      return res.sendStatus(200);
    }

    if (isCancelCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: t(lang, "cancelled"),
      });
      return res.sendStatus(200);
    }

    // 4) Language selection flow
    if (!customer || !customer.language) {
      // not yet choosing → send template
      if (state.step !== "LANGUAGE_SELECT") {
        await setState(state, { step: "LANGUAGE_SELECT" });
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      // already in LANGUAGE_SELECT → parse choice
      const choice = parseLanguageChoice(txt);
      if (!choice) {
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      const wasFirstTime = !customer;

      // upsert customer with language
      customer = await Customer.findOneAndUpdate(
        { businessId: biz._id, phone: from },
        {
          $setOnInsert: { businessId: biz._id, phone: from },
          $set: { language: choice, "stats.lastSeenAt": new Date() },
        },
        { new: true, upsert: true }
      );

      await setState(state, { step: "MENU", data: { language: choice } });

      const langKey = langKeyFromChoice(choice);
      const msgType = wasFirstTime ? "welcome_first" : "welcome_returning";

      const welcomeText = getConfigMessage(
        biz,
        langKey,
        msgType,
        t(choice, "welcome")
      );

      const menuText = buildMenuText(biz, langKey, choice);

      // send welcome
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: welcomeText,
      });

      // send menu right after
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: menuText,
      });

      return res.sendStatus(200);
    }

    // 5) We have a known customer + language
    const lang = langFromCustomer(customer, biz);
    const langKey = langKeyFromCustomer(customer, biz);

    // ---- MENU command ----
    if (lower(txt) === "menu") {
      const menuText = buildMenuText(biz, langKey, lang);

      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: menuText,
      });
      await setState(state, { step: "MENU" });
      return res.sendStatus(200);
    }

    // ---- MENU selection logic ----
    if (state.step === "MENU") {
      const structuredItems = getVisibleMenuItemsSorted(biz);

      if (structuredItems.length) {
        const index = parseMenuIndexFromText(txt);

        if (index == null || index < 0 || index >= structuredItems.length) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "من فضلك اختر رقمًا من القائمة أو أرسل *menu* لعرضها مرة أخرى."
                : lang === "hebrew"
                ? "בחר/י מספר מהתפריט או שלח/י *menu* להצגה מחדש."
                : "Please choose a number from the menu, or send *menu* again.",
          });
          return res.sendStatus(200);
        }

        const item = structuredItems[index];
        const action = item.action || "custom";
        const payload = item.payload || "";

        await handleMenuAction({ action, payload, lang, langKey, biz, state, from });
        return res.sendStatus(200);
      }

      // if somehow no structured items while in MENU
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "القائمة غير مهيّأة بعد. أرسلي *menu* لاحقًا أو اكتبي سؤالك بحرية."
            : lang === "hebrew"
            ? "התפריט עדיין לא הוגדר. שלחי *menu* שוב מאוחר יותר או כתבי לנו חופשי."
            : "The menu is not configured yet. Try *menu* later or just ask your question.",
      });
      return res.sendStatus(200);
    }

    // ---- PRODUCT DETAILS FLOW after "view_products" ----
    if (state.step === "VIEW_PRODUCTS_LIST") {
        const langKey = langKeyFromCustomer(customer, biz);
        const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;
    
        const index = parseMenuIndexFromText(txt);
    
        const productIds = state.data?.productIds || [];
    
        // אם המשתמש כתב משהו שהוא לא מספר / מחוץ לטווח
        if (
        index == null ||
        index < 0 ||
        index >= productIds.length
        ) {
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
    
        // 1️⃣ אם יש תמונה – שולחים קודם את התמונה
        const imgUrl = product.image?.secure_url || product.image?.url;
        if (imgUrl) {
        await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: "",           // אפשר גם לשים כותרת קצרה כאן אם אתה רוצה
            mediaUrl: imgUrl,   // ⚠️ ודא שה־sendWhatsApp שלך מעביר mediaUrl ל-Twilio
        });
        }
    
        // 2️⃣ ואז שולחים את פרטי המוצר
        const stockLine =
        stock != null
            ? `\n   📦 ${PL.stock}: ${stock}`
            : "";
    
        const phoneLine =
        phone
            ? (lang === "arabic"
                ? `- الاتصال على: ${phone}`
                : lang === "hebrew"
                ? `- להתקשר אלינו: ${phone}`
                : `- Call us at: ${phone}`)
            : (lang === "arabic"
                ? "- رقم الهاتف غير مضاف بعد."
                : lang === "hebrew"
                ? "- מספר הטלפון עדיין לא מוגדר."
                : "- Phone number is not configured yet.");
    
        const detailHeader =
        lang === "arabic"
            ? `${PL.detailTitle} #${index + 1}`
            : lang === "hebrew"
            ? `${PL.detailTitle} #${index + 1}`
            : `${PL.detailTitle} #${index + 1}`;
    
        const body =
    `${detailHeader}
    
    ✨ *${name}* — ${price}
    📂 ${PL.category}: ${category}
    🆔 ${PL.sku}: ${sku}${stockLine}
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
    
        // נשארים ב־VIEW_PRODUCTS_LIST כדי שיוכל לשלוח עוד מספרים
        return res.sendStatus(200);
    }

    // ---- Default fallback ----
    const fallbackText = getConfigMessage(
      biz,
      langKey,
      "fallback",
      t(lang, "hint_menu")
    );

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: fallbackText,
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Twilio webhook error:", err);
    // Always 200 so Twilio doesn’t retry
    return res.sendStatus(200);
  }
});

module.exports = router;