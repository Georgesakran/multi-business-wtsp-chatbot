// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();
const moment = require("moment");

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Course = require("../models/Course");
const Booking = require("../models/Booking");
const ConversationState = require("../models/ConversationState");
const sendDatePickerTemplate =require("../utils/sendDatePickerTemplate");
// Twilio send helpers
const { sendWhatsApp, sendTemplate } = require("../utils/sendTwilio");
const getNext10Days = require("../utils/getNext10Days");

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

const COURSE_LABELS = {
    arabic: {
      listTitle: "🎓 *الدورات وورش العمل المتاحة*",
      listCta:
        "💬 أرسلي رقم الدورة التي تهمك لعرض التفاصيل، أو اكتبي *menu* للعودة للقائمة.",
      detailTitle: "🎓 *تفاصيل الدورة*",
      noCourses: "لا توجد دورات أو ورش عمل مضافة حالياً.",
      price: "السعر",
      instructor: "المدرِّبة",
      capacity: "الحد الأقصى للمشاركات",
      sessionsHeader: "مواعيد الجلسات",
      sessionLine: "{{date}} — {{timeRange}}",
      sessionsCount: "عدد الجلسات",
      firstDate: "تبدأ في",
      detailCta:
        "📞 للتسجيل في الدورة: أرسلي اسمك الكامل + مدينتك + رقم الهاتف، أو اكتبي *menu* للعودة للقائمة.",
    },
    hebrew: {
      listTitle: "🎓 *קורסים וסדנאות זמינים*",
      listCta:
        "💬 שלחי את מספר הקורס שמעניין אותך כדי לראות פרטים, או כתבי *menu* כדי לחזור לתפריט.",
      detailTitle: "🎓 *פרטי הקורס*",
      noCourses: "אין כרגע קורסים או סדנאות מוגדרים.",
      price: "מחיר",
      instructor: "מדריכה",
      capacity: "מספר משתתפות מקסימלי",
      sessionsHeader: "מועדי המפגשים",
      sessionLine: "{{date}} — {{timeRange}}",
      sessionsCount: "מספר המפגשים",
      firstDate: "מתחיל ב־",
      detailCta:
        "📞 להרשמה לקורס: שלחי לנו שם מלא + עיר + מספר טלפון, או כתבי *menu* כדי לחזור לתפריט.",
    },
    english: {
      listTitle: "🎓 *Available Courses & Workshops*",
      listCta:
        "💬 Send the course number to see details, or type *menu* to go back to the menu.",
      detailTitle: "🎓 *Course Details*",
      noCourses: "No courses or workshops are defined yet.",
      price: "Price",
      instructor: "Instructor",
      capacity: "Max participants",
      sessionsHeader: "Session schedule",
      sessionLine: "{{date}} — {{timeRange}}",
      sessionsCount: "Number of sessions",
      firstDate: "Starts on",
      detailCta:
        "📞 To register: reply with your full name, city and phone number, or type *menu* to return to the menu.",
    },
  };

  
  function productText(fieldObj, langKey) {
    return getLocalized(fieldObj, langKey);
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
    "💬 Please choose language:\n" +
    "1) العربية\n" +
    "2) English\n" +
    "3) עברית";
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

async function handleMenuAction({ action, payload, lang, langKey, biz, state, from }) {
    switch (action) {
      case "book_appointment": {
        // 1) Check if this business supports bookings
        if (!biz.enabledServices?.includes("bookingFlow")) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "حالياً هذا النشاط لا يدعم حجز المواعيد عبر الواتساب."
                : lang === "hebrew"
                ? "לעסק הזה אין עדיין מערכת תורים דרך הצ'אט."
                : "This business does not support booking appointments via WhatsApp yet.",
          });
          return;
        }

        // 2) Get bookable services
        const services = (biz.services || []).filter(
          (s) => s && s.isActive !== false && s.bookable !== false
        );

        if (!services.length) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "لا توجد خدمات للحجز مضافة حالياً."
                : lang === "hebrew"
                ? "אין כרגע שירותים זמינים לחיוב תורים."
                : "There are no bookable services configured yet.",
          });
          return;
        }

        const key = langKey; // 'ar' | 'en' | 'he'

        const intro =
          lang === "arabic"
            ? "تمام! نبدأ الحجز بخطوات بسيطة 👇"
            : lang === "hebrew"
            ? "מעולה! נתחיל הזמנה בכמה שלבים פשוטים 👇"
            : "Great! Let’s start your booking in a few simple steps 👇";

        const header =
          lang === "arabic"
            ? "1️⃣ *اختار/ي الخدمة المطلوبة*"
            : lang === "hebrew"
            ? "1️⃣ *בחר/י את השירות*"
            : "1️⃣ *Choose a service*";

        const lines = services.map((s, i) => {
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
            `${i + 1}) 🔹 *${name}*` +
            (price ? ` — ${price}` : "") +
            (duration ? ` • ${duration}` : "") +
            (desc ? `\n   ${desc}` : "")
          );
        });

        const footer =
          lang === "arabic"
            ? "\n💬 أرسلي رقم الخدمة التي تريدين حجزها.\nيمكنك في أي وقت كتابة *menu* للعودة للقائمة."
            : lang === "hebrew"
            ? "\n💬 כתבי את מספר השירות שברצונך להזמין.\nאפשר בכל שלב לכתוב *menu* כדי לחזור לתפריט."
            : "\n💬 Reply with the number of the service you want to book.\nYou can type *menu* anytime to go back.";

        // 3) Save state with service IDs
        await setState(state, {
          step: "BOOKING_SELECT_SERVICE",
          data: {
            serviceIds: services.map((s) => String(s._id)),
          },
        });

        // 4) Send message
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body: [intro, header, lines.join("\n\n"), footer].join("\n\n"),
        });

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
  
            const lines = services.map((s, i) => {
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
                `${i + 1}) 🔹 *${name}*` +
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
  
        return;
      }
  
      case "view_courses": {
        const CL = COURSE_LABELS[lang] || COURSE_LABELS.english;
      
        // === Define "today" (midnight) ===
        const today = new Date();
        today.setHours(0, 0, 0, 0);
      
        // === Fetch all courses, we'll filter manually ===
        let courses = await Course.find({ businessId: biz._id }).lean();
      
        // === Filter: only upcoming courses (first session today or later) ===
        courses = courses.filter((c) => {
          const firstSession = (c.sessions || [])[0];
          if (!firstSession?.date) return false;
      
          const sessionDate = new Date(firstSession.date);
          sessionDate.setHours(0, 0, 0, 0);
      
          return sessionDate >= today;
        });
      
        // === Sort by first session date ASC ===
        courses.sort((a, b) => {
          const d1 = new Date(a.sessions?.[0]?.date || 0);
          const d2 = new Date(b.sessions?.[0]?.date || 0);
          return d1 - d2;
        });
      
        // === Limit to 8 ===
        courses = courses.slice(0, 8);
      
        // === If no future courses ===
        if (!courses.length) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: CL.noCourses, // already translated label
          });
          return;
        }
      
        // === Save state: list of IDs ===
        await setState(state, {
          step: "VIEW_COURSES_LIST",
          data: {
            courseIds: courses.map((c) => String(c._id)),
          },
        });
      
        // === Build WhatsApp list message ===
        const list = courses
          .map((c, i) => {
            const firstSession = (c.sessions || [])[0];
            const firstDate = firstSession?.date || "";
            const sessionsCount = (c.sessions || []).length || 0;
      
            const main =
              `${i + 1}) 🎓 *${c.title}*` +
              (c.price ? ` — ${c.price}₪` : "");
      
            const metaLines = [];
      
            if (c.instructor) {
              metaLines.push(`👩‍🏫 ${CL.instructor}: ${c.instructor}`);
            }
      
            if (firstDate) {
              metaLines.push(`📅 ${CL.firstDate}: ${firstDate}`);
            }
      
            if (sessionsCount > 1) {
              metaLines.push(`🗓️ ${CL.sessionsCount}: ${sessionsCount}`);
            }
      
            if (typeof c.maxParticipants === "number") {
              metaLines.push(`👥 ${CL.capacity}: ${c.maxParticipants}`);
            }
      
            const meta =
              metaLines.length > 0 ? "\n   " + metaLines.join("\n   ") : "";
      
            const desc = c.description
              ? `\n   📝 ${shortText(c.description, 180)}`
              : "";
      
            return `${main}${meta}${desc}\n────────────────────`;
          })
          .join("\n");
      
        const body = `${CL.listTitle}
      
      ${list}
      
      ${CL.listCta}`;
      
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body,
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

// ---------- BOOKING HELPERS (same logic as bookingsRoutes.js) ----------
// const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
// const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));
// let days = getNext10Days(biz);

// // get today's date
// const todayStr = moment().format("YYYY-MM-DD");

// if (days.includes(todayStr)) {
//   const hasFreeSlots = await checkFreeSlotsToday(biz); // we will write this helper next
  
//   if (!hasFreeSlots) {
//     // remove today
//     days = days.filter(d => d !== todayStr);
//   }
// }

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};
const toHHMM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const weekdayFromISO = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });

async function checkFreeSlotsToday(biz) {
  const booking = biz.config.booking;
  const openingTime = booking.openingTime || "09:00";
  const closingTime = booking.closingTime || "18:00";
  const gap = Number(booking.slotGapMinutes || 15);

  const today = moment().format("YYYY-MM-DD");

  const grid = makeDayGrid(openingTime, closingTime, gap);
  const taken = await getTakenMap(biz._id, today);

  const now = moment();

  for (let i = 0; i < grid.length; i++) {
    const slotTime = moment(grid[i], "HH:mm");
    if (slotTime.isBefore(now)) continue; // skip past times
    if (taken[i] !== true) return true; // found at least ONE free slot
  }

  return false;
}


function makeDayGrid(openingTime, closingTime, slotGapMinutes) {
  const start = toMinutes(openingTime);
  const end = toMinutes(closingTime);
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  const out = [];
  for (let t = start; t + gap <= end; t += gap) out.push(toHHMM(t));
  return out;
}

function slotsNeeded(duration, slotGapMinutes) {
  const gap = Math.max(5, Number(slotGapMinutes || 15));
  return Math.max(1, Math.ceil(Number(duration || 0) / gap));
}

function findServiceById(biz, serviceId) {
  if (!serviceId) return null;
  const sid = String(serviceId);
  return (biz.services || []).find((s) => String(s._id) === sid) || null;
}

async function getTakenMap(businessId, date) {
  const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));

  const sameDay = await Booking.find({
    businessId,
    date,
    status: { $in: ["pending", "confirmed"] },
  })
    .select("time status")
    .lean();

  const map = new Map();
  for (const b of sameDay) {
    if (isTime(b.time)) map.set(b.time, true);
  }
  return map;
}

function isRangeFree(dayGrid, takenMap, startIndex, need) {
  for (let i = 0; i < need; i++) {
    const t = dayGrid[startIndex + i];
    if (!t || takenMap.get(t)) return false;
  }
  return true;
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

        // ---- BOOKING: SELECT SERVICE ----
        if (state.step === "BOOKING_SELECT_SERVICE") {
          const serviceIds = state.data?.serviceIds || [];
          const index = parseMenuIndexFromText(txt);
    
          if (index == null || index < 0 || index >= serviceIds.length) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "من فضلك أرسلي رقم خدمة من القائمة، أو اكتبي *menu* للعودة."
                  : lang === "hebrew"
                  ? "בחרי מספר שירות מהרשימה, או כתבי *menu* כדי לחזור."
                  : "Please send a service number from the list, or type *menu* to go back.",
            });
            return res.sendStatus(200);
          }
    
          const selectedServiceId = serviceIds[index];
          const svc = findServiceById(biz, selectedServiceId);
          if (!svc) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "هذا الخدمة لم تعد متاحة. اكتبي *menu* لبدء من جديد."
                  : lang === "hebrew"
                  ? "השירות הזה כבר לא זמין. כתבי *menu* כדי להתחיל מחדש."
                  : "This service is no longer available. Type *menu* to start again.",
            });
            return res.sendStatus(200);
          }
    
          const key = langKey; // 'ar' | 'en' | 'he'
          const svcName = svc.name?.[key] || svc.name?.en || "";
    
          // snapshot like in bookingsRoutes
          const serviceSnapshot = {
            name: {
              en: svc.name?.en || "",
              ar: svc.name?.ar || "",
              he: svc.name?.he || "",
            },
            price: Number(svc.price || 0),
            duration: Number(svc.duration || 0),
          };
    
          const rawDays = getNext10Days(biz);
          let days = [...rawDays];
          const todayStr = moment().format("YYYY-MM-DD");
          
          if (days.includes(todayStr)) {
            const hasFree = await checkFreeSlotsToday(biz);
            if (!hasFree) days = days.filter((d) => d !== todayStr);
          }
          
          await setState(state, {
            step: "BOOKING_SELECT_DATE_LIST",
            data: {
              serviceId: selectedServiceId,
              serviceSnapshot,
              days,
            },
          });
          
          // send Twilio Template
          await sendDatePickerTemplate(biz, from, days, lang);
          return res.sendStatus(200);
    
          // const msg =
          //   lang === "arabic"
          //     ? `👍 تم اختيار الخدمة: *${svcName}*\n\n2️⃣ أرسلي تاريخ الموعد المطلوب بصيغة *YYYY-MM-DD* (مثال: 2025-12-05).`
          //     : lang === "hebrew"
          //     ? `👍 נבחר השירות: *${svcName}*\n\n2️⃣ כתבי את תאריך התור בפורמט *YYYY-MM-DD* (לדוגמה: 2025-12-05).`
          //     : `👍 Service selected: *${svcName}*\n\n2️⃣ Please send your preferred date in format *YYYY-MM-DD* (e.g. 2025-12-05).`;
    
          // await sendWhatsApp({
          //   from: biz.wa.number,
          //   to: from,
          //   body: msg,
          // });
    
          // return res.sendStatus(200);
        }
    
        if (state.step === "BOOKING_SELECT_DATE_LIST") {
          const days = state.data?.days || [];
          const idx = parseMenuIndexFromText(txt);
        
          if (idx == null || idx < 0 || idx >= days.length) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "من فضلك اختاري رقم تاريخ صحيح من القائمة."
                  : lang === "hebrew"
                  ? "בחרי מספר תאריך מהרשימה."
                  : "Please select a valid date number.",
            });
            return res.sendStatus(200);
          }
        
          const chosenDate = days[idx];
        
          await setState(state, {
            step: "BOOKING_SELECT_DATE",
            data: {
              ...state.data,
              date: chosenDate,
            },
          });
        
          req.body.Body = chosenDate;  
          //const newTxt = chosenDate;

        }

        // ---- BOOKING: SELECT DATE (show available slots) ----
        if (state.step === "BOOKING_SELECT_DATE") {
          const date = req.body.Body || txt;
          const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

          if (!isDate(date)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "📅 من فضلك اكتبي التاريخ بصيغة صحيحة: *YYYY-MM-DD* (مثال: 2025-12-05)."
                  : lang === "hebrew"
                  ? "📅 בבקשה כתבי את התאריך בפורמט *YYYY-MM-DD* (לדוגמה: 2025-12-05)."
                  : "📅 Please send the date in format *YYYY-MM-DD* (e.g. 2025-12-05).",
            });
            return res.sendStatus(200);
          }
    
          const bookingCfg = biz.config?.booking || {};
          const workingDays = Array.isArray(bookingCfg.workingDays)
            ? bookingCfg.workingDays
            : [];
          const openingTime = bookingCfg.openingTime || "09:00";
          const closingTime = bookingCfg.closingTime || "18:00";
          const gap = Number(bookingCfg.slotGapMinutes || 15);
    
          // closed date?
          if ((biz.closedDates || []).includes(date)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "❌ في هذا التاريخ الصالون مغلق. اختاري تاريخاً آخر."
                  : lang === "hebrew"
                  ? "❌ בתאריך זה העסק סגור. אנא בחרי תאריך אחר."
                  : "❌ The business is closed on that date. Please choose another date.",
            });
            return res.sendStatus(200);
          }
    
          const weekday = weekdayFromISO(date);
          if (!workingDays.includes(weekday)) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? `❌ يوم ${weekday} ليس من أيام العمل. اختاري يوماً آخر.`
                  : lang === "hebrew"
                  ? `❌ יום ${weekday} אינו יום עבודה. בחרי יום אחר.`
                  : `❌ ${weekday} is not a working day. Please choose a different date.`,
            });
            return res.sendStatus(200);
          }
    
          const grid = makeDayGrid(openingTime, closingTime, gap);
          const taken = await getTakenMap(biz._id, date);
    
          const serviceId = state.data?.serviceId;
          const snapshot = state.data?.serviceSnapshot || {};
          let need = 1;
          if (snapshot.duration) {
            need = slotsNeeded(snapshot.duration, gap);
          } else if (serviceId) {
            const svc = findServiceById(biz, serviceId);
            if (svc?.duration) {
              need = slotsNeeded(Number(svc.duration), gap);
            }
          }
    
          const free = [];
          for (let i = 0; i < grid.length; i++) {
            if (isRangeFree(grid, taken, i, need)) free.push(grid[i]);
          }
    
          if (!free.length) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "⚠️ في هذا التاريخ لا يوجد أوقات متاحة. حاولي تاريخاً آخر."
                  : lang === "hebrew"
                  ? "⚠️ אין שעות פנויות בתאריך הזה. נסי תאריך אחר."
                  : "⚠️ There are no free time slots on that date. Please choose another date.",
            });
            return res.sendStatus(200);
          }
    
          const slotsToShow = free.slice(0, 10); // show up to 10 options
          const lines = slotsToShow.map((t, i) => `${i + 1}) ${t}`);
    
          await setState(state, {
            step: "BOOKING_SELECT_TIME",
            data: {
              ...state.data,
              date,
              slots: slotsToShow,
              slotGapMinutes: gap,
              openingTime,
              closingTime,
            },
          });
    
          const msg =
            lang === "arabic"
              ? `3️⃣ الأوقات المتاحة في *${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 أرسلي رقم الوقت المناسب لك.`
              : lang === "hebrew"
              ? `3️⃣ השעות הפנויות ב-*${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 כתבי את מספר השעה המתאימה.`
              : `3️⃣ Available times on *${date}*:\n\n${lines.join(
                  "\n"
                )}\n\n💬 Please reply with the number of your preferred time.`;
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
          });
    
          return res.sendStatus(200);
        }
    
        // ---- BOOKING: SELECT TIME ----
        if (state.step === "BOOKING_SELECT_TIME") {
          const slots = state.data?.slots || [];
          const idx = parseMenuIndexFromText(txt);
    
          if (idx == null || idx < 0 || idx >= slots.length) {
            const lines = slots.map((t, i) => `${i + 1}) ${t}`);
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? `من فضلك اختار/ي رقمًا من الأوقات:\n\n${lines.join(
                      "\n"
                    )}\n\nأو اكتب/ي *menu* للعودة.`
                  : lang === "hebrew"
                  ? `בחר/י מספר מתוך השעות הבאות:\n\n${lines.join(
                      "\n"
                    )}\n\nאו כתב/י *menu* כדי לחזור.`
                  : `Please choose a number from these times:\n\n${lines.join(
                      "\n"
                    )}\n\nOr type *menu* to go back.`,
            });
            return res.sendStatus(200);
          }
    
          const time = slots[idx];
    
          await setState(state, {
            step: "BOOKING_ENTER_NAME",
            data: {
              ...state.data,
              time,
            },
          });
    
          const msg =
            lang === "arabic"
              ? `✅ تم اختيار الوقت: *${time}*\n\n4️⃣ اكتب/ي اسمك الكامل للحجز.`
              : lang === "hebrew"
              ? `✅ נבחרה שעה: *${time}*\n\n4️⃣ כתב/י את שמך המלא להזמנה.`
              : `✅ Time selected: *${time}*\n\n4️⃣ Please send your full name for the booking.`;
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
          });
    
          return res.sendStatus(200);
        }
    
        // ---- BOOKING: ENTER NAME ----
        if (state.step === "BOOKING_ENTER_NAME") {
          const name = txt;
          if (!name || name.length < 2) {
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "من فضلك اكتب/ي اسمًا واضحًا (على الأقل حرفين)."
                  : lang === "hebrew"
                  ? "נא לכתוב שם ברור (לפחות שני תווים)."
                  : "Please send a clear name (at least 2 characters).",
            });
            return res.sendStatus(200);
          }
    
          await setState(state, {
            step: "BOOKING_ENTER_NOTE",
            data: {
              ...state.data,
              customerName: name,
            },
          });
    
          const msg =
            lang === "arabic"
              ? "5️⃣ هل لديك ملاحظات خاصة !! (مثال: لون/شكل/معلومة إضافية)؟\nاكتب/ي ما تريدين، أو اكتب/ي *0* إذا لا توجد ملاحظات."
              : lang === "hebrew"
              ? "5️⃣ יש לך הערות מיוחדות (צבע, צורה, בקשה נוספת)?\nכתב/י מה שצריך, או כתב/י *0* אם אין הערות."
              : "5️⃣ Any special notes (e.g. style, color, anything extra)?\nWrite your note, or send *0* if you have no notes.";
    
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: msg,
          });
    
          return res.sendStatus(200);
        }
    
        // ---- BOOKING: ENTER NOTE + CREATE BOOKING ----
        if (state.step === "BOOKING_ENTER_NOTE") {
          let notes = txt;
          if (notes === "0" || lower(txt) === "skip") {
            notes = "";
          }

          const { serviceId, serviceSnapshot, date, time, customerName } =
            state.data || {};

          if (!serviceId || !date || !time || !customerName) {
            // something went wrong in state
            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body:
                lang === "arabic"
                  ? "حدث خطأ في الحجز. اكتب/ي *menu* للبدء من جديد."
                  : lang === "hebrew"
                  ? "אירעה שגיאה בתהליך ההזמנה. כתב/י *menu* כדי להתחיל מחדש."
                  : "Something went wrong with the booking flow. Please type *menu* to start again.",
            });
            await setState(state, { step: "MENU", data: {} });
            return res.sendStatus(200);
          }

          try {
            const bookingCfg = biz.config?.booking || {};
            const workingDays = Array.isArray(bookingCfg.workingDays)
              ? bookingCfg.workingDays
              : [];
            const weekday = weekdayFromISO(date);

            if ((biz.closedDates || []).includes(date)) {
              throw new Error("Business closed on that date");
            }
            if (!workingDays.includes(weekday)) {
              throw new Error("Selected date is not a working day");
            }

            const openingTime = bookingCfg.openingTime || "09:00";
            const closingTime = bookingCfg.closingTime || "18:00";
            const gap = Number(bookingCfg.slotGapMinutes || 15);
            const grid = makeDayGrid(openingTime, closingTime, gap);
            const idx = grid.indexOf(time);
            if (idx === -1) {
              throw new Error("Time is outside working hours");
            }

            let need = 1;
            if (serviceSnapshot?.duration) {
              need = slotsNeeded(serviceSnapshot.duration, gap);
            }

            const taken = await getTakenMap(biz._id, date);
            if (!isRangeFree(grid, taken, idx, need)) {
              throw new Error("Slot already taken");
            }

            // ✅ decide default status from business config
            const defaultStatus =
              biz?.config?.booking?.chatbotDefaultStatus === "confirmed"
                ? "confirmed"
                : "pending"; // safe fallback

            // ✅ create booking using CORRECT variables
            const booking = await Booking.create({
              businessId: biz._id,
              customerName,
              phoneNumber: from,
              serviceId: serviceId,
              serviceSnapshot: serviceSnapshot,
              date,
              time,
              status: defaultStatus,
              source: "chatbot", // important: for stats
              notes,
            });

            // reset state back to MENU
            await setState(state, { step: "MENU", data: {} });

            const key = langKey;
            const svcName =
              serviceSnapshot?.name?.[key] ||
              serviceSnapshot?.name?.en ||
              "";

            const isAutoConfirmed = defaultStatus === "confirmed";

            let msg;
            if (lang === "arabic") {
              msg = isAutoConfirmed
                ? `✅ تم إنشاء حجزك *وتأكيده* بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nيمكنك دائماً كتابة *menu* للعودة للقائمة.`
                : `✅ تم إنشاء حجزك بنجاح!\n\n👤 الاسم: *${booking.customerName}*\n💅 الخدمة: *${svcName}*\n📅 التاريخ: *${booking.date}*\n⏰ الساعة: *${booking.time}*\n\nسيتم تأكيد الموعد قريباً. يمكنك دائماً كتابة *menu* للعودة للقائمة.`;
            } else if (lang === "hebrew") {
              msg = isAutoConfirmed
                ? `✅ ההזמנה שלך נוצרה ו*אושרה* בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nאפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`
                : `✅ ההזמנה שלך נוצרה בהצלחה!\n\n👤 שם: *${booking.customerName}*\n💅 שירות: *${svcName}*\n📅 תאריך: *${booking.date}*\n⏰ שעה: *${booking.time}*\n\nהאישור הסופי יגיע בהמשך. אפשר בכל רגע לכתוב *menu* כדי לחזור לתפריט.`;
            } else {
              msg = isAutoConfirmed
                ? `✅ Your booking has been *created and confirmed*!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nYou can type *menu* anytime to go back.`
                : `✅ Your booking has been created!\n\n👤 Name: *${booking.customerName}*\n💅 Service: *${svcName}*\n📅 Date: *${booking.date}*\n⏰ Time: *${booking.time}*\n\nThe appointment will be confirmed shortly. You can type *menu* anytime to go back.`;
            }

            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body: msg,
            });

            return res.sendStatus(200);
          } catch (err) {
            console.error("Booking via WhatsApp error:", err);

            const msg =
              lang === "arabic"
                ? "❌ لم نتمكن من تأكيد هذا الموعد (ربما الحجز ممتلئ أو التوقيت غير متاح). اكتبي *menu* وحاول/ي من جديد."
                : lang === "hebrew"
                ? "❌ לא הצלחנו לאשר את התור (אולי השעה נתפסה בינתיים). כתבי *menu* ונסי שוב."
                : "❌ We couldn’t confirm this booking (maybe the time was just taken). Please type *menu* and try again.";

            await sendWhatsApp({
              from: biz.wa.number,
              to: from,
              body: msg,
            });

            await setState(state, { step: "MENU", data: {} });
            return res.sendStatus(200);
          }
        }


        // ---- PRODUCT DETAILS FLOW after "view_products" ----
    if (state.step === "VIEW_PRODUCTS_LIST") {
        const langKey = langKeyFromCustomer(customer, biz);
        const PL = PRODUCT_LABELS[lang] || PRODUCT_LABELS.english;
      
        const index = parseMenuIndexFromText(txt);
        const productIds = state.data?.productIds || [];
      
        // אם המשתמש כתב משהו שהוא לא מספר / מחוץ לטווח
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
      
        // 1️⃣ אם יש תמונה – שולחים קודם את התמונה (עם כותרת קצרה)
        const imgUrl = product.image?.secure_url || product.image?.url;
        console.log("PRODUCT IMAGE URL:", imgUrl, product.image);
      
        if (imgUrl) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body: `🛍️ ${name || ""}`,
            mediaUrl: imgUrl, // sendTwilio כבר יודע לטפל בזה
          });
        }
      
        // 2️⃣ ואז שולחים את פרטי המוצר
        const stockLine =
          stock != null ? `\n📦 ${PL.stock}: ${stock}` : "";
      
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

    // ---- COURSE DETAILS FLOW after "view_courses" ----
    if (state.step === "VIEW_COURSES_LIST") {
        const CL = COURSE_LABELS[lang] || COURSE_LABELS.english;
        const index = parseMenuIndexFromText(txt);
        const courseIds = state.data?.courseIds || [];
      
        // בדיקה שהמספר תקין
        if (
          index == null ||
          index < 0 ||
          index >= courseIds.length
        ) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "من فضلك أرسلي رقم الدورة من القائمة، أو اكتبي *menu* للعودة للقائمة الرئيسية."
                : lang === "hebrew"
                ? "שלחי מספר קורס מהרשימה, או כתבי *menu* כדי לחזור לתפריט הראשי."
                : "Please send a course number from the list, or type *menu* to go back to the main menu.",
          });
          return res.sendStatus(200);
        }
      
        const courseId = courseIds[index];
        const course = await Course.findOne({
          _id: courseId,
          businessId: biz._id,
        });
      
        if (!course) {
          await sendWhatsApp({
            from: biz.wa.number,
            to: from,
            body:
              lang === "arabic"
                ? "هذه الدورة لم تعد متاحة. جرّبي دورة أخرى أو اكتبي *menu*."
                : lang === "hebrew"
                ? "הקורס הזה כבר לא זמין. נסי קורס אחר או כתבי *menu*."
                : "This course is no longer available. Try another one or type *menu*.",
          });
          return res.sendStatus(200);
        }
      
        // סידור המפגשים לפי תאריך + שעה
        const sessions = (course.sessions || [])
          .slice()
          .sort((a, b) => {
            const keyA = `${a.date}T${a.startTime}`;
            const keyB = `${b.date}T${b.startTime}`;
            return keyA.localeCompare(keyB);
          });
      
        const sessionsLines = sessions.length
          ? sessions
              .map((s) => {
                const timeRange = `${s.startTime}–${s.endTime}`;
                return `• ${s.date} — ${timeRange}`;
              })
              .join("\n")
          : "-";
      
        const detailHeader = `${CL.detailTitle} #${index + 1}`;
      
        const body = `${detailHeader}
      
      🎓 *${course.title}*${course.price ? ` — ${course.price}₪` : ""}
      
      👩‍🏫 ${CL.instructor}: ${course.instructor || "-"}
      👥 ${CL.capacity}: ${course.maxParticipants ?? "-"}
      🗓️ ${CL.sessionsHeader}:
      ${sessionsLines}
      
      📝 ${course.description || "-"}
      
      ${CL.detailCta}`;
      
        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body,
        });
      
        // נשארים ב־VIEW_COURSES_LIST כדי שיוכלו לבחור עוד מספר
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