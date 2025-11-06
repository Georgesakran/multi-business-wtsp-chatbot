// routes/twilioWebhook.js
const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const Customer = require("../models/Customer");
const ConversationState = require("../models/ConversationState"); // if you used a different name, adjust here

// Twilio send helpers (must exist in your project)
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

// Light state accessors (scoped to business + phone)
async function getState({ businessId, phoneNumber }) {
  let doc = await ConversationState.findOne({ businessId, phoneNumber });
  if (!doc) {
    doc = await ConversationState.create({ businessId, phoneNumber, step: "LANGUAGE_SELECT", data: {} });
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

// map UI label/number → internal code
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

// localize tiny messages
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

function langFromCustomer(cust, biz) {
  // preference order: customer.language → biz.config.language → biz.language → biz.wa.locale → english
  return (
    cust?.language ||
    biz?.config?.language ||
    biz?.language ||
    (biz?.wa?.locale === "ar" ? "arabic" : biz?.wa?.locale === "he" ? "hebrew" : "english") ||
    "english"
  );
}

// send language picker template (Twilio Content SID)
async function sendLanguageTemplate(biz, to) {
  const contentSid = biz?.wa?.templates?.languageSelectSid;
  if (!contentSid) return false;

  await sendTemplate({
    from: biz.wa.number,
    to,
    contentSid,
    variables: {}, // not needed for quick replies
    messagingServiceSid: biz?.wa?.messagingServiceSid || undefined,
  });

  return true;
}

// fallback plain text language prompt (if no template)
async function sendLanguageFallback(biz, to) {
  const body =
    "Please choose language:\n" +
    "1) العربية\n" +
    "2) English\n" +
    "3) עברית";
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

// after language saved → greet + hint
async function sendWelcomeAfterLanguage(biz, to, lang) {
  const body = [t(lang, "got_language"), "", t(lang, "welcome"), t(lang, "hint_menu")].join("\n");
  await sendWhatsApp({ from: biz.wa.number, to, body });
}

// -------------------- webhook --------------------
router.post("/", async (req, res) => {
  try {
    const from = toE164(req.body?.From); // customer's WA number E.164
    const to = toE164(req.body?.To); // business WA number E.164
    const txt = rawText(req);

    // 1) Find business by recipient number
    const biz = await Business.findOne({ "wa.number": to, isActive: true });
    if (!biz) return res.sendStatus(200);

    // 2) Fetch state + customer
    let state = await getState({ businessId: biz._id, phoneNumber: from });
    let customer = await Customer.findOne({ businessId: biz._id, phone: from });

    // 3) Global commands
    if (isHelpCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      await sendWhatsApp({ from: biz.wa.number, to: from, body: t(lang, "help") });
      return res.sendStatus(200);
    }
    if (isRestartCmd(txt)) {
      state = await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      const sent = await sendLanguageTemplate(biz, from);
      if (!sent) await sendLanguageFallback(biz, from);
      // no welcome here; user must pick language again
      return res.sendStatus(200);
    }
    if (isCancelCmd(txt)) {
      const lang = langFromCustomer(customer, biz);
      // reset step to language for a fresh start next message
      await setState(state, { step: "LANGUAGE_SELECT", data: {} });
      await sendWhatsApp({ from: biz.wa.number, to: from, body: t(lang, "cancelled") });
      return res.sendStatus(200);
    }

    // 4) If no customer or no language set → force language selection
    if (!customer || !customer.language) {
      // If the current step is not LANGUAGE_SELECT, send the template & move to LANGUAGE_SELECT
      if (state.step !== "LANGUAGE_SELECT") {
        await setState(state, { step: "LANGUAGE_SELECT" });
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      // If we are already in LANGUAGE_SELECT, try to parse the user choice
      const choice = parseLanguageChoice(txt);
      if (!choice) {
        // re-send prompt to guide the user
        const sent = await sendLanguageTemplate(biz, from);
        if (!sent) await sendLanguageFallback(biz, from);
        return res.sendStatus(200);
      }

      // Save customer (upsert) with chosen language
      customer = await Customer.findOneAndUpdate(
        { businessId: biz._id, phone: from },
        {
          $setOnInsert: { businessId: biz._id, phone: from },
          $set: { language: choice, "stats.lastSeenAt": new Date() },
        },
        { new: true, upsert: true }
      );

      // Advance step to MENU (or any initial screen you want)
      await setState(state, { step: "MENU", data: { language: choice } });

      // Welcome & hint
      await sendWelcomeAfterLanguage(biz, from, choice);

      // If you have Twilio menu templates per language (biz.wa.templates.menu[lang]),
      // you can send them here instead of the text hint.
      // Example when you add SIDs:
      // const menuSid = biz?.wa?.templates?.menu?.[choice === "arabic" ? "ar" : choice === "hebrew" ? "he" : "en"];
      // if (menuSid) await sendTemplate({ from: biz.wa.number, to: from, contentSid: menuSid });

      return res.sendStatus(200);
    }

    // 5) We have a language → route simple commands (you can expand from here)
    const lang = langFromCustomer(customer, biz);

    // Minimal MENU demo (text). Later you’ll replace with a Twilio Content Template SID per language.
    if (lower(txt) === "menu") {
      const bodyByLang = {
        arabic:
          "*القائمة*\n" +
          "1) حجز موعد 💅\n" +
          "2) الأسئلة الشائعة ❓\n" +
          "3) تواصل مع المالك 📞\n" +
          `\nأرسل رقم الخيار. أو أرسل *${CANCEL}* للإلغاء.`,
        english:
          "*Menu*\n" +
          "1) Book an appointment 💅\n" +
          "2) FAQs ❓\n" +
          "3) Contact owner 📞\n" +
          `\nReply with a number. Or send *${CANCEL}* to cancel.`,
        hebrew:
          "*תפריט*\n" +
          "1) קבע/י תור 💅\n" +
          "2) שאלות נפוצות ❓\n" +
          "3) יצירת קשר 📞\n" +
          `\nשלח/י מספר. או *${CANCEL}* לביטול.`,
      };
      await sendWhatsApp({ from: biz.wa.number, to: from, body: bodyByLang[lang] || bodyByLang.english });
      await setState(state, { step: "MENU" });
      return res.sendStatus(200);
    }

    // Example: basic menu selection handling (1/2/3). You can wire these to your booking flow or FAQ flow.
    if (state.step === "MENU") {
      if (["1", "١"].includes(txt)) {
        // Start booking flow here (template-driven later)
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
        // Show FAQs (text for now)
        // You have biz.faqs multilingual — you can localize here.
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
          body: lines.length ? lines.join("\n\n") : (lang === "arabic" ? "لا يوجد أسئلة شائعة بعد." : lang === "hebrew" ? "אין שאלות נפוצות עדיין." : "No FAQs yet."),
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
      // If unknown input in MENU:
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

    // Default fallback when no state handler caught it
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: t(lang, "hint_menu"),
    });
    return res.sendStatus(200);
  } catch (err) {
    console.error("Twilio webhook error:", err);
    // Always 200 so Twilio doesn’t retry
    return res.sendStatus(200);
  }
});

module.exports = router;