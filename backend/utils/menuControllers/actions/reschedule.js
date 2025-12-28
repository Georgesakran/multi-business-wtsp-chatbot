const { sendWhatsApp } = require("../../twilio/sendTwilio");
const setState = require("../states/setState");
const parseMenuIndexFromText = require("../menuControllers/menuUtils/menuParser");
const handleBookingSelectDateList = require("../states/stepStates/handleBookingSelectDateList");
const Customer = require("../../models/Customer");

module.exports = async function reschedule({ lang, langKey, biz, from, payload, state }) {
  const customer = await Customer.findOne({ businessId: biz._id, phone: from });
  const appointments = customer?.appointments || [];

  if (!appointments.length) {
    const msg =
      lang === "arabic"
        ? "❌ ليس لديك أي مواعيد للحجز."
        : lang === "hebrew"
        ? "❌ אין לך תורים קיימים."
        : "❌ You don’t have any existing appointments.";
    await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });
    return;
  }

  // --- show appointment list ---
  let msg;
  if (appointments.length === 1) {
    const a = appointments[0];
    msg =
      lang === "arabic"
        ? `📅 لديك موعد واحد:\n1️⃣ ${a.date} – ${a.time} – ${a.serviceName} – ${a.duration} min\n\nأرسلي 1 لتغيير الموعد أو 0 للرجوع للقائمة.`
        : lang === "hebrew"
        ? `📅 יש לך תור אחד:\n1️⃣ ${a.date} – ${a.time} – ${a.serviceName} – ${a.duration} דק\n\nשלחי 1 לשינוי התור או 0 כדי לחזור.`
        : `📅 You have one appointment:\n1️⃣ ${a.date} – ${a.time} – ${a.serviceName} – ${a.duration} min\n\nReply 1 to reschedule or 0 to go back.`;
  } else {
    const lines = appointments.map(
      (a, i) =>
        `${i + 1}) ${a.date} – ${a.time} – ${a.serviceName} – ${a.duration} min`
    );
    msg =
      lang === "arabic"
        ? `📅 مواعيدك:\n${lines.join("\n")}\n\nأرسلي رقم الموعد لتغييره أو 0 للرجوع للقائمة.`
        : lang === "hebrew"
        ? `📅 התורים שלך:\n${lines.join("\n")}\n\nשלחי מספר התור לשינוי או 0 כדי לחזור.`
        : `📅 Your appointments:\n${lines.join("\n")}\n\nReply with the number of the appointment to reschedule or 0 to go back.`;
  }

  await sendWhatsApp({ from: biz.wa.number, to: from, body: msg });

  // --- save in state that we are waiting for appointment selection ---
  await setState(state, {
    step: "RESCHEDULE_SELECT_APPOINTMENT",
    data: {
      ...state.data,
      customerId: customer._id,
      appointments,
    },
  });
};
