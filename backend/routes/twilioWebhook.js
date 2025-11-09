// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const ConversationState = require("../models/ConversationState");

// Twilio send helpers
const { sendWhatsApp, sendTemplate } = require("../utils/sendTwilio");

// -------------------- constants & helpers --------------------
const BACK = "0";
const CANCEL = "9";

const rawText = (req) => (req.body?.Body || "").trim();
const lower = (s) => String(s || "").toLowerCase();
const isCancelCmd = (txt) => txt === CANCEL || lower(txt) === "cancel";
const isRestartCmd = (txt) => ["restart", "menu"].includes(lower(txt));
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

// ---------- NEW: helpers to read config.messages ----------
function langKeyFromCustomer(customer, biz) {
  // customer.language is "arabic" | "english" | "hebrew"
  if (customer?.language === "arabic") return "ar";
  if (customer?.language === "english") return "en";
  if (customer?.language === "hebrew") return "he";

  // business config language (same enum)
  if (biz?.config?.language === "arabic") return "ar";
  if (biz?.config?.language === "english") return "en";
  if (biz?.config?.language === "hebrew") return "he";

  // wa.locale is "ar" | "en" | "he"
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
        // fallback if config empty
        t(choice, "welcome")
      );

      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: welcomeText,
      });

      return res.sendStatus(200);
    }

    // 5) We have a known customer + language
    const lang = langFromCustomer(customer, biz);
    const langKey = langKeyFromCustomer(customer, biz);

    // ---- MENU command ----
    if (lower(txt) === "menu") {
      const menuText = getConfigMessage(
        biz,
        langKey,
        "main_menu",
        // fallback main menu text
        lang === "arabic"
          ? "*القائمة*\n1) حجز موعد 💅\n2) الأسئلة الشائعة ❓\n3) تواصل مع المالك 📞\n\nأرسل رقم الخيار."
          : lang === "hebrew"
          ? "*תפריט*\n1) קבע/י תור 💅\n2) שאלות נפוצות ❓\n3) יצירת קשר 📞\n\nשלח/י מספר."
          : "*Menu*\n1) Book an appointment 💅\n2) FAQs ❓\n3) Contact owner 📞\n\nReply with a number."
      );

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
      if (["1", "١"].includes(txt)) {
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
        return res.sendStatus(200);
      }

      if (["2", "٢"].includes(txt)) {
        const faqs = biz.faqs || [];
        const qKey = lang === "arabic" ? "ar" : lang === "hebrew" ? "he" : "en";
        const lines = faqs.slice(0, 5).map((f, i) => {
          const Q = f.question?.[qKey] || f.question?.en || "";
          const A = f.answer?.[qKey] || f.answer?.en || "";
          return `${i + 1}) ${Q}\n${A}`;
        });

        await sendWhatsApp({
          from: biz.wa.number,
          to: from,
          body: lines.length
            ? lines.join("\n\n")
            : lang === "arabic"
            ? "لا يوجد أسئلة شائعة بعد."
            : lang === "hebrew"
            ? "אין שאלות נפוצות עדיין."
            : "No FAQs yet.",
        });
        return res.sendStatus(200);
      }

      if (["3", "٣"].includes(txt)) {
        const owner = biz.owner || {};
        const body =
          lang === "arabic"
            ? `تواصل مع المالك:\nهاتف: ${owner.phone || "-"}\nبريد: ${owner.email || "-"}`
            : lang === "hebrew"
            ? `יצירת קשר עם בעל/ת העסק:\nטלפון: ${owner.phone || "-"}\nאימייל: ${owner.email || "-"}`
            : `Contact owner:\nPhone: ${owner.phone || "-"}\nEmail: ${owner.email || "-"}`;

        await sendWhatsApp({ from: biz.wa.number, to: from, body });
        return res.sendStatus(200);
      }

      // unknown input while in MENU
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body:
          lang === "arabic"
            ? "من فضلك اختر رقم من القائمة (1/2/3) أو أرسل *menu* لعرضها مرة أخرى."
            : lang === "hebrew"
            ? "בחר/י מספר מהתפריט (1/2/3) או שלח/י *menu* להצגה מחדש."
            : "Please choose 1/2/3 from the menu, or send *menu* again.",
      });
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