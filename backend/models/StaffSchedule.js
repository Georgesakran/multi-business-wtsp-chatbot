 // models/StaffSchedule.js
 const StaffScheduleSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true, required:true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref:"Staff", index:true, required:true },
    // weekly template
    weekly: [{
      dow: { type: Number, min:0, max:6 },  // 0=Sun
      start: String, // "09:00"
      end: String,   // "18:00"
      breaks: [{ start: String, end: String }]
    }],
    // exceptions
    closedDates: [String],               // "YYYY-MM-DD"
    overrides: [{ date:String, start:String, end:String }]
  }, { timestamps:true });
  
  module.exports = mongoose.model("StaffSchedule", StaffScheduleSchema);