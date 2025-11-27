const {sendWhatsApp} = require("../../twilio/sendTwilio");

module.exports = async function myAppointments({ lang, biz, from }) {
  await sendWhatsApp({
    from: biz.wa.number,
    to: from,
    body:
      lang === "arabic"
        ? "عرض مواعيدك سيتم تفعيله قريبًا."
        : lang === "hebrew"
        ? "צפייה בתורים שלך תופעל בקרוב."
        : "Viewing your appointments will be available soon.",
  });
};