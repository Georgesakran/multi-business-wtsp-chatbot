// models/KnowledgeDoc.js
const KnowledgeDocSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref:"Business", index:true, required:true },
    title: String,
    type: { type: String, enum:["faq","policy","menu","guide","other"], default:"other" },
    source: { type: String },   // "manual", "upload:policies.md", URL
    content: { type: String },  // raw markdown/text
    chunks: [{
      text: String,
      // embedding: store vector in external store or here as Float32Array if you use pgvector/qdrant
      embedding: { type: [Number], select: false }
    }]
  }, { timestamps:true, versionKey:false });
  
  module.exports = mongoose.model("KnowledgeDoc", KnowledgeDocSchema);