const Booking = require("../../../models/Booking");
const { sendWhatsApp } = require("../../twilio/sendTwilio");

module.exports = async function myAppointments({ lang, langKey, biz, from }) {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const bookings = await Booking.find({
      businessId: biz._id,
      phoneNumber: from,
      date: { $gte: today }
    }).sort({ date: 1, time: 1 });

    // No appointments
    if (!bookings || bookings.length === 0) {
      const msg = {
        arabic: "لا يوجد لديك أي مواعيد قادمة.",
        hebrew: "אין לך תורים קרובים.",
        english: "You have no upcoming appointments."
      };
      await sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: msg[lang] || msg.english
      });
      return;
    }

    // Header
    let body = {
      arabic: "📅 *مواعيدك القادمة:*\n\n",
      hebrew: "📅 *התורים הקרובים שלך:*\n\n",
      english: "📅 *Your upcoming appointments:*\n\n"
    }[lang];

    // Format each booking
    for (const b of bookings) {
      body +=
        `• *${b.serviceSnapshot?.name?.[langKey] || b.serviceSnapshot?.name?.en}*\n` +
        `  👤 ${b.customerName}\n` +
        `  📆 ${b.date}\n` +
        `  ⏰ ${b.time}\n\n`;
    }

    // Footer
    body += {
      arabic: "اكتب *menu* للعودة للقائمة.",
      hebrew: "כתוב *menu* כדי לחזור לתפריט.",
      english: "Type *menu* to return to the menu."
    }[lang];

    // Send
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body
    });

  } catch (err) {
    console.error("myAppointments error:", err);
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: "Error loading your appointments."
    });
  }
};
