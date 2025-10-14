// models/WebhookEvent.js
const WebhookEventSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true },
    provider: { type: String, enum:["meta","twilio"], index:true },
    direction: { type: String, enum:["in","out"], index:true },
    messageId: { type: String, index:true },
    status: { type: String, index:true },     // delivered, read, failed...
    payload: { type: Object },
    error: { type: Object },
  }, { timestamps:true, versionKey:false });
  
  WebhookEventSchema.index({ businessId:1, direction:1, createdAt:-1 });
  module.exports = mongoose.model("WebhookEvent", WebhookEventSchema);