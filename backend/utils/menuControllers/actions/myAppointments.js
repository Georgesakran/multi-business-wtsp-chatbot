const Booking = require("../../../models/Booking");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const { t } = require("../../language/languageTextHelper");

module.exports = async function myAppointments({ lang, langKey, biz, from, customer }) {
  try {
    // Get upcoming bookings for this customer
    const now = new Date();
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

    const bookings = await Booking.find({
      businessId: biz._id,
      phoneNumber: from,      // user phone number
      date: { $gte: today }   // upcoming only
    }).sort({ date: 1, time: 1 });
    

    // If no appointments
    if (!bookings || bookings.length === 0) {
      const noApptText = {
        arabic: "لا يوجد لديك أي مواعيد قادمة.",
        hebrew: "אין לך תורים קרובים.",
        english: "You have no upcoming appointments."
      };

      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: noApptText[lang] || noApptText.english
      });

      return;
    }

    // Format bookings
    let bodyText = {
      arabic: "📅 *مواعيدك القادمة:*\n\n",
      hebrew: "📅 *התורים הקרובים שלך:*\n\n",
      english: "📅 *Your upcoming appointments:*\n\n"
    }[lang];

    for (const b of bookings) {
      const dateStr = b.date.toLocaleDateString("en-GB");
      const timeStr = b.time;

      bodyText +=
        `• *${b.serviceName}*\n` +
        `  📆 ${dateStr}\n` +
        `  ⏰ ${timeStr}\n\n`;
    }

    bodyText += {
      arabic: "يمكنك كتابة *menu* للعودة للقائمة.",
      hebrew: "תוכל לכתוב *menu* כדי לחזור לתפריט.",
      english: "You can type *menu* to return to the menu."
    }[lang];

    // Send response
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: bodyText
    });

  } catch (err) {
    console.error("myAppointments error:", err);

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "An error occurred while fetching your appointments."
    });
  }
};
