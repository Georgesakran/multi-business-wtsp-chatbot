// models/Conversation.js
const ConversationSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true, required:true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref:"Customer", index:true },
    phoneNumber: { type:String, index:true, required:true },
    lastMessageAt: { type: Date, index:true },
    lastAgent: { type: String, enum:["bot","human"], default:"bot" },
    open: { type:Boolean, default:true },
    tags: [String],
    meta: Object
  }, { timestamps:true, versionKey:false });

  ConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60*60*24*7 }); // auto-delete after 7d

  module.exports = mongoose.model("Conversation", ConversationSchema);