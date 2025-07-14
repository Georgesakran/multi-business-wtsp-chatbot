const mongoose = require("mongoose");
const Booking = require("./models/Booking");

(async () => {
  try {
    await mongoose.connect("mongodb+srv://gsakran14:ZYJyl2Mqmh0STdjh@cluster0.irfchbt.mongodb.net/chatbotdb?retryWrites=true&w=majority&appName=Cluster0");
    console.log("✅ Connected to MongoDB");

    const bookings = await Booking.find({});
    console.log(`📦 Found ${bookings.length} bookings`);

    for (const b of bookings) {
      if (typeof b.date === "string") {
        b.date = new Date(b.date); // convert string to Date object
        await b.save();
        console.log(`✅ Updated booking ${b._id}`);
      }
    }

    console.log("🎉 Done updating all bookings");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
})();