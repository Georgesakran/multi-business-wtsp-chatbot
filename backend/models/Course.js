// models/Course.js
const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema(
  {
    date: {
      type: String, // "YYYY-MM-DD" (kept as string to match your queries)
      index: true,
      required: true,
      validate: {
        validator: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
        message: 'Session date must be "YYYY-MM-DD".',
      },
    },
    startTime: {
      type: String, // "HH:mm"
      required: true,
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
        message: 'Start time must be "HH:mm".',
      },
    },
    endTime: {
      type: String, // "HH:mm"
      required: true,
      validate: {
        validator: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
        message: 'End time must be "HH:mm".',
      },
    },
  },
  { _id: false }
);

const CourseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    instructor: {
      type: String,
      index: true,
      trim: true,
    },
    price: {
      type: Number,
      index: true,
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    maxParticipants: {
      type: Number,
      index: true,
      min: [1, "Capacity must be at least 1"],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    sessions: {
      type: [SessionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "At least one session is required.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ensure each session has end > start on the same date
CourseSchema.pre("validate", function (next) {
  if (Array.isArray(this.sessions)) {
    for (const s of this.sessions) {
      if (s?.date && s?.startTime && s?.endTime) {
        const start = new Date(`${s.date}T${s.startTime}`);
        const end = new Date(`${s.date}T${s.endTime}`);
        if (!(start < end)) {
          return next(new Error("Session end time must be after start time."));
        }
      }
    }
  }
  next();
});

// Indexes
CourseSchema.index({ businessId: 1, createdAt: -1 });                // list/sort
CourseSchema.index({ businessId: 1, "sessions.date": 1 });           // filters by business + date
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ price: 1 });
CourseSchema.index({ maxParticipants: 1 });

// Text search with weights (optional but nice)
CourseSchema.index(
  { title: "text", description: "text" },
  { weights: { title: 5, description: 1 }, name: "CourseTextIndex" }
);

module.exports = mongoose.model("Course", CourseSchema);