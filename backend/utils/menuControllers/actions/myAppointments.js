const Booking = require("../../../models/Booking");
const Customer = require("../../../models/Customer");
const { sendWhatsApp } = require("../../twilio/sendTwilio");

function formatAppointmentsList(bookings, lang, langKey) {
  if (!bookings.length) {
    return (
      lang === "arabic"
        ? "ليس لديك أي مواعيد قادمة حالياً."
        : lang === "hebrew"
        ? "אין לך תורים קרובים כרגע."
        : "You currently have no upcoming appointments."
    );
  }

  const pad = (num) => String(num).padStart(2, "0");

  let body = "";
  let i = 1;

  for (const b of bookings) {
    const serviceName =
      b.serviceSnapshot?.name?.[langKey] ||
      b.serviceSnapshot?.name?.en ||
      "-";

    const duration = b.serviceSnapshot?.duration || 0;

    // Calculate end time
    const [hour, minute] = b.time.split(":").map(Number);
    const end = new Date(0, 0, 0, hour, minute + duration);
    const endTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

    const nameLine =
      lang === "arabic"
        ? `👤 الاسم: ${b.customerName || "-"}`
        : lang === "hebrew"
        ? `👤 שם: ${b.customerName || "-"}`
        : `👤 Name: ${b.customerName || "-"}`;

    const dateLine =
      lang === "arabic"
        ? `📆 التاريخ: ${b.date}`
        : lang === "hebrew"
        ? `📆 תאריך: ${b.date}`
        : `📆 Date: ${b.date}`;

    const timeLine =
      lang === "arabic"
        ? `⏰ الوقت: ${b.time} - ${endTime}`
        : lang === "hebrew"
        ? `⏰ שעה: ${b.time} - ${endTime}`
        : `⏰ Time: ${b.time} - ${endTime}`;

    body +=
      `*${i}. ${serviceName}*\n` +
      `${nameLine}\n` +
      `${dateLine}\n` +
      `${timeLine}\n\n`;

    i++;
  }

  return body;
}

module.exports = async function myAppointments({ lang, langKey, biz, from }) {
  
    const today = new Date().toISOString().split("T")[0];
  
    const bookings = await Booking.find({
      businessId: biz._id,
      phoneNumber: from,
      date: { $gte: today },
    }).sort({ date: 1, time: 1 });
  
    const body = formatAppointmentsList(bookings, lang, langKey);
  
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body,
    });
};

