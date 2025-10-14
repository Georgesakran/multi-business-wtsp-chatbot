// models/Staff.js
const StaffSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true, required:true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    // what they can do
    skills: [String],               // e.g. ["gel_polish","basic_manicure"]
    serviceIds: [{ type: mongoose.Schema.Types.ObjectId }], // link to Business.services (or Service model if separated)
    locations: [String],            // if multi-branch
    color: String,                  // calendar color
    isActive: { type: Boolean, default: true }
  }, { timestamps:true });
  
  module.exports = mongoose.model("Staff", StaffSchema);
  
 