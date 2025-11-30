const Course = require("../../../models/Course");
const COURSE_LABELS = require("../../language/labels/courseLabels");
const parseMenuIndexFromText = require("../../menuControllers/menuUtils/menuParser");
const { sendWhatsApp } = require("../../twilio/sendTwilio");

module.exports = async function handleViewCoursesList({ txt, biz, from, lang, state, res }) {
  const CL = COURSE_LABELS[lang] || COURSE_LABELS.english;
  const index = parseMenuIndexFromText(txt);
  const courseIds = state.data?.courseIds || [];

  // ❌ Invalid number
  if (index == null || index < 0 || index >= courseIds.length) {
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

  // ❌ Course not found
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

  // Sort sessions
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

  // stay in VIEW_COURSES_LIST
  return res.sendStatus(200);
};
