const Booking = require("../../../models/Booking");
const { sendWhatsApp } = require("../../twilio/sendTwilio");
const setState = require("../../../utils/states/setState");

module.exports = async function startReschedule({ biz, from, lang, langKey, state }) {
  const bookings = await Booking.find({
    businessId: biz._id,
    phoneNumber: from,
    status: "confirmed",
  }).sort({ date: 1, time: 1 });

  if (!bookings.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body:
        lang === "arabic"
          ? "ليس لديك أي مواعيد حالياً."
          : lang === "hebrew"
          ? "אין לך תורים פעילים כרגע."
          : "You don’t have any upcoming appointments.",
    });
    return;
  }

  const lines = bookings.map((b, i) => {
    const serviceName =
      b.serviceSnapshot?.name?.[langKey] ||
      b.serviceSnapshot?.name?.en ||
      "Service";

    return `${i + 1}️⃣ ${b.date} – ${b.time} – ${serviceName} – ${b.serviceSnapshot.duration} min`;
  });

  const text =
    (bookings.length === 1
      ? lang === "arabic"
        ? "لديك موعد واحد:\n\n"
        : lang === "hebrew"
        ? "יש לך תור אחד:\n\n"
        : "You have one appointment:\n\n"
      : lang === "arabic"
      ? "اختر موعدًا لتعديله:\n\n"
      : lang === "hebrew"
      ? "בחר תור לשינוי:\n\n"
      : "Select an appointment to reschedule:\n\n") +
    lines.join("\n") +
    `\n\n0️⃣ ${
      lang === "arabic"
        ? "العودة للقائمة"
        : lang === "hebrew"
        ? "חזרה לתפריט"
        : "Back to menu"
    }`;

  await setState(state, {
    step: "RESCHEDULE_SELECT_APPOINTMENT",
    data: { appointments: bookings },
  });

  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body: text,
  });
};
