function reorderDocument(doc) {
    return {
      nameEnglish: doc.nameEnglish || null,
      nameArabic: doc.nameArabic || null,
      nameHebrew: doc.nameHebrew || null,
      location: doc.location || null,
      whatsappNumber: doc.whatsappNumber || null,
      verifyToken: doc.verifyToken || null,
      language: doc.language || "arabic", // default to arabic if not set
      accessToken: doc.accessToken || null,
      phoneNumberId: doc.phoneNumberId || null,
      username: doc.username || null,
      password: doc.password || null,      // optional: add if exists
      isActive: doc.isActive,
      services: doc.services,
      // include _id at the end or anywhere if needed
      _id: doc._id,
    };
  }

export default reorderDocument;
  