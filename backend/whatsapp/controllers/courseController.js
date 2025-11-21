// controllers/courseController.js

const stateManager = require("../state/stateManager");
const courseService = require("../services/courseService");
const { sendWhatsApp } = require("../services/messaging/twilioService");
const { getLabel } = require("../utils/i18n");
const parse = require("../utils/parsing");

module.exports = {
  // -----------------------------------------------------
  // STEP 1 — Show course LIST
  // -----------------------------------------------------
  showCourseList: async ({ biz, from, customer, state }) => {
    const lang = customer.language;
    const CL = getLabel(lang, "course_labels");

    let courses = await courseService.getUpcomingCourses(biz._id);

    if (!courses.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: CL.noCourses,
      });
    }

    // Store course IDs in state
    await stateManager.setState(state, {
      step: "VIEW_COURSES_LIST",
      data: { courseIds: courses.map((c) => String(c._id)) },
    });

    const listText = [
      CL.listTitle,
      "",
      ...courses.map((c, i) => {
        const price = c.price ? `${c.price}₪` : "";
        const first = c.sessions?.[0]?.date || "";
        const sessionsCount = c.sessions?.length || 0;

        const meta = [];

        if (c.instructor) meta.push(`👩‍🏫 ${CL.instructor}: ${c.instructor}`);
        if (first) meta.push(`📅 ${CL.firstDate}: ${first}`);
        if (sessionsCount > 1) meta.push(`🗓️ ${CL.sessionsCount}: ${sessionsCount}`);
        if (typeof c.maxParticipants === "number")
          meta.push(`👥 ${CL.capacity}: ${c.maxParticipants}`);

        const metaBlock = meta.length ? "\n   " + meta.join("\n   ") : "";
        const desc = c.description ? `\n   📝 ${courseService.short(c.description, 160)}` : "";

        return `${i + 1}) 🎓 *${c.title}* ${price ? `— ${price}` : ""}${metaBlock}${desc}`;
      }),
      "",
      CL.listCta,
    ].join("\n");

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: listText,
    });
  },

  // -----------------------------------------------------
  // STEP 2 — Show course DETAILS
  // -----------------------------------------------------
  showCourseDetails: async ({ biz, from, customer, state, text }) => {
    const lang = customer.language;
    const CL = getLabel(lang, "course_labels");

    const index = parse.number(text);
    const courseIds = state.data?.courseIds || [];

    if (index < 1 || index > courseIds.length) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: CL.invalidCourse,
      });
    }

    const courseId = courseIds[index - 1];
    const course = await courseService.getCourseById(courseId);

    if (!course) {
      return sendWhatsApp({
        from: biz.wa.number,
        to: from,
        body: CL.courseNotFound,
      });
    }

    // Sort sessions chronologically
    const sessions = (course.sessions || [])
      .slice()
      .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

    const sessionLines = sessions.length
      ? sessions.map((s) => `• ${s.date} — ${s.startTime}–${s.endTime}`).join("\n")
      : "-";

    const details = [
      `${CL.detailTitle} #${index}`,
      "",
      `🎓 *${course.title}* ${course.price ? `— ${course.price}₪` : ""}`,
      `👩‍🏫 ${CL.instructor}: ${course.instructor || "-"}`,
      `👥 ${CL.capacity}: ${course.maxParticipants ?? "-"}`,
      `🗓️ ${CL.sessionsHeader}:\n${sessionLines}`,
      "",
      `📝 ${course.description || "-"}`,
      "",
      CL.detailCta,
    ].join("\n");

    await sendWhatsApp({
      from: biz.wa.number,
      to: from,
      body: details,
    });

    // Stay in the same state so user can choose another course number
  },
};