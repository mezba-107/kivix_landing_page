const express = require("express");
const multer = require("multer");
const { ah } = require("../middleware/errorHandler");
const { requireAnyAuth } = require("../middleware/auth");
const {
  isCloudinaryConfigured,
  uploadBuffer,
} = require("../config/cloudinary");

const router = express.Router();

// Memory storage only — the file buffer is streamed straight to
// Cloudinary and never written to disk or to the database. 30MB cap and
// image-only filter keep the API fast and stop someone uploading a huge
// or bogus file.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// folder: "products" | "hero-slides" | "offer-banners" | "avatars"
// Frontend flow: upload the image here first, get back { url }, then send
// that url as the `image`/`avatar` field on the product/slide/banner/
// profile save — so MongoDB documents only ever store a short link.
router.post(
  "/:folder",
  requireAnyAuth,
  upload.single("image"),
  ah(async (req, res) => {
    const allowedFolders = [
      "products",
      "hero-slides",
      "offer-banners",
      "avatars",
    ];
    if (!allowedFolders.includes(req.params.folder)) {
      return res.status(400).json({ message: "Invalid upload folder" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No image file was sent" });
    }
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        message:
          "Cloudinary isn't configured yet — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env",
      });
    }
    const result = await uploadBuffer(req.file.buffer, req.params.folder);
    res
      .status(201)
      .json({ url: result.secure_url, publicId: result.public_id });
  }),
);

module.exports = router;
