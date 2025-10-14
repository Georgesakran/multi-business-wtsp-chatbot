// routes/courses.js
const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const { protect } = require("../middleware/authMiddleware");

// @POST /courses → create a course
router.post("/", protect, async (req, res) => {
  try {
    const { businessId, title, instructor, price, sessions, description, maxParticipants } = req.body;

    if (!businessId || !title || !description || !sessions || sessions.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newCourse = new Course({
      businessId,
      title,
      instructor,
      price,
      sessions,
      description,
      maxParticipants,
    });

    const saved = await newCourse.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("Error creating course:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// routes/courses.js (replace your GET "/" with this)
router.get("/", protect, async (req, res) => {
  try {
    const {
      businessId, q, instructor, priceMin, priceMax,
      capacityMin, capacityMax, dateFrom, dateTo, status,
      sortBy = "createdAt_desc", page = 1, limit = 10
    } = req.query;

    if (!businessId) return res.status(400).json({ message: "Missing businessId" });

    // --------- helpers ----------
    const toDateTime = (dateStr, timeStr = "00:00") => {
      if (!dateStr) return null;
      const [y, m, d] = dateStr.split("-").map(Number);
      const [hh = 0, mm = 0] = (timeStr || "00:00").split(":").map(Number);
      return new Date(y, m - 1, d, hh, mm, 0, 0);
    };
    const sessionState = (s, now) => {
      const start = toDateTime(s.date, s.startTime);
      const end = toDateTime(s.date, s.endTime || s.startTime);
      if (!start || !end) return "upcoming";
      if (end <= now) return "done";
      if (start > now) return "upcoming";
      return "ongoing";
    };
    const courseStatus = (course, now) => {
      const states = (course.sessions || []).map(s => sessionState(s, now));
      if (states.length === 0) return "upcoming"; // or choose another default
      const allDone = states.every(s => s === "done");
      if (allDone) return "done";
      const allUpcoming = states.every(s => s === "upcoming");
      if (allUpcoming) return "upcoming";
      const hasOngoing = states.includes("ongoing");
      const hasDone = states.includes("done");
      const hasUpcoming = states.includes("upcoming");
      if (hasOngoing || (hasDone && hasUpcoming)) return "in-progress";
      return "in-progress";
    };
    const buildSort = (sortByStr = "createdAt_desc") => {
      const [field, dir] = sortByStr.split("_");
      const allowed = { createdAt: "createdAt", price: "price", title: "title" };
      const key = allowed[field] || "createdAt";
      return { [key]: dir === "asc" ? 1 : -1 };
    };

    // --------- coarse Mongo filter (fast) ----------
    const filter = { businessId };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    if (instructor) {
      filter.instructor = { $regex: instructor, $options: "i" };
    }
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }
    if (capacityMin || capacityMax) {
      filter.maxParticipants = {};
      if (capacityMin) filter.maxParticipants.$gte = Number(capacityMin);
      if (capacityMax) filter.maxParticipants.$lte = Number(capacityMax);
    }
    // Date window on sessions (as strings "YYYY-MM-DD")
    if (dateFrom || dateTo) {
      filter["sessions.date"] = {};
      if (dateFrom) filter["sessions.date"].$gte = dateFrom;
      if (dateTo)   filter["sessions.date"].$lte = dateTo;
    }

    // Fetch all candidates for this page of filters (minus status),
    // but do NOT paginate yet because status is computed in app memory.
    const sort = buildSort(sortBy);
    const baseRows = await Course.find(
      filter,
      { title: 1, instructor: 1, price: 1, maxParticipants: 1, sessions: 1, createdAt: 1 }
    ).sort(sort).lean();

    // Compute status and filter by it
    const now = new Date();
    const withStatus = baseRows.map(r => ({ ...r, _status: courseStatus(r, now) }));
    const afterStatus = (!status || status === "any")
      ? withStatus
      : withStatus.filter(c => c._status === status);

    // Paginate AFTER status filtering so counts/pages are correct
    const _page = Math.max(1, parseInt(page));
    const _limit = Math.min(50, Math.max(1, parseInt(limit)));
    const start = (_page - 1) * _limit;
    const end = start + _limit;
    const items = afterStatus.slice(start, end);
    const total = afterStatus.length;

    res.json({ items, total, page: _page, limit: _limit });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});


// @GET /courses/:businessId → get all courses for a business
router.get("/:businessId", protect, async (req, res) => {
  try {
    const courses = await Course.find({ businessId: req.params.businessId }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

// @GET /courses/one/:id → get single course by ID
router.get("/one/:id", protect, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch course" });
  }
});

// @PUT /courses/:businessId/:id → update a course
router.put("/:businessId/:id", protect, async (req, res) => {
  try {
    const { businessId, id } = req.params;
    const updates = req.body;

    const updated = await Course.findOneAndUpdate(
      { _id: id, businessId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: "Course not found" });
    res.json(updated);
  } catch (err) {
    console.error("Error updating course:", err);
    res.status(500).json({ message: "Failed to update course" });
  }
});

// @DELETE /courses/:businessId/:id → delete a course
router.delete("/:businessId/:id", protect, async (req, res) => {
  try {
    const { businessId, id } = req.params;

    const deleted = await Course.findOneAndDelete({ _id: id, businessId });
    if (!deleted) return res.status(404).json({ message: "Course not found" });

    res.json({ message: "Course deleted" });
  } catch (err) {
    console.error("Error deleting course:", err);
    res.status(500).json({ message: "Failed to delete course" });
  }
});

module.exports = router;