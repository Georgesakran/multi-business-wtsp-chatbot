// models/Job.js
const JobSchema = new mongoose.Schema({
    type: { type:String, required:true },     // "booking:reminder", "order:followup"
    runAt: { type: Date, index:true, required:true },
    businessId: { type: mongoose.Schema.Types.ObjectId, index:true },
    payload: { type:Object, default:{} },
    status: { type:String, enum:["queued","running","done","failed"], default:"queued", index:true },
    attempts: { type:Number, default:0 }
  }, { timestamps:true, versionKey:false });
  
  module.exports = mongoose.model("Job", JobSchema);