// models/Payment.js
const PaymentSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true, required:true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref:"Order", index:true },
    provider: { type:String, enum:["stripe","tranzilla","manual","other"] },
    method: { type:String, enum:["card","cash","transfer","link"] },
    amount: { type:Number, required:true },
    currency: { type:String, default:"ILS" },
    status: { type:String, enum:["pending","paid","failed","refunded","void"], index:true, default:"pending" },
    linkUrl: String,
    providerRef: String,
    meta: Object
  }, { timestamps:true });
  
  module.exports = mongoose.model("Payment", PaymentSchema);