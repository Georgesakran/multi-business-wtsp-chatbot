const express = require("express");
const multer = require("multer");
const cloudinary = require("../utils/cloudinary");
const router = express.Router();

const storage = multer.diskStorage({});
const upload = multer({ storage });

// POST /upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products", // optional: put inside "products" folder
    });
    res.json({ url: result.secure_url, public_id: result.public_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

module.exports = router;