// utils/menuControllers/actions/viewCourses.js

const Course = require("../../../models/Course");
const setState = require("../../states/setState");
const sendWhatsApp= require("../../twilio/sendTwilio");
const { shortText } = require("../../misc/textHelpers");
const COURSE_LABELS = require("../../language/labels/courseLabels");

module.exports = async function viewCourses({ lang, langKey, biz, state, from }) {
  const CL = COURSE_LABELS[lang] || COURSE_LABELS.english;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1) Fetch courses
  let courses = await Course.find({ businessId: biz._id }).lean();

  // Filter upcoming only
  courses = courses.filter((c) => {
    const firstSession = c.sessions?.[0];
    if (!firstSession?.date) return false;

    const sessionDate = new Date(firstSession.date);
    sessionDate.setHours(0, 0, 0, 0);

    return sessionDate >= today;
  });

  // Sort by soonest course
  courses.sort((a, b) => {
    const d1 = new Date(a.sessions?.[0]?.date || 0);
    const d2 = new Date(b.sessions?.[0]?.date || 0);
    return d1 - d2;
  });

  courses = courses.slice(0, 8);

  if (!courses.length) {
    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: CL.noCourses,
    });
    return;
  }

  // Save for selection
  await setState(state, {
    step: "VIEW_COURSES_LIST",
    data: {
      courseIds: courses.map((c) => String(c._id)),
    },
  });

  const list = courses
    .map((c, i) => {
      const firstSession = c.sessions?.[0];
      const firstDate = firstSession?.date || "";
      const sessionsCount = c.sessions?.length || 0;

      const main =
        `${i + 1}) 🎓 *${c.title}*` +
        (c.price ? ` — ${c.price}₪` : "");

      const meta = [];
      if (c.instructor) meta.push(`👩‍🏫 ${CL.instructor}: ${c.instructor}`);
      if (firstDate) meta.push(`📅 ${CL.firstDate}: ${firstDate}`);
      if (sessionsCount > 1)
        meta.push(`🗓️ ${CL.sessionsCount}: ${sessionsCount}`);
      if (typeof c.maxParticipants === "number")
        meta.push(`👥 ${CL.capacity}: ${c.maxParticipants}`);

      const desc = c.description
        ? `\n📝 ${shortText(c.description, 180)}`
        : "";

      return `${main}
${meta.map((m) => `   ${m}`).join("\n")}${desc}
──────────────────`;
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
};