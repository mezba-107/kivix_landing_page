const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");
const Review = require("../models/Review");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");
const {
  isCloudinaryConfigured,
  uploadBuffer,
  deleteImage,
} = require("../config/cloudinary");

const router = express.Router();

// "Write a Review" needs no login, so without a limit a script could
// flood a product with fake/spam reviews. 10 per 15 minutes per IP is
// plenty for a real shopper leaving one review.
const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reviews submitted — please try again later" },
});

// Same memory-storage/size-cap/image-only setup as the main
// /api/uploads/:folder route (see upload.routes.js), but kept separate
// and public: review photos are attached by anonymous shoppers before
// their review even exists, so this can't sit behind requireAnyAuth the
// way product/avatar/etc uploads do. It's still rate-limited with the
// same reviewLimiter used for posting the review itself.
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Public: upload a photo for the "Write a Review" form. Returns the
// Cloudinary URL to send back as `image` on POST /reviews.
router.post(
  "/upload-image",
  reviewLimiter,
  photoUpload.single("image"),
  ah(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file was sent" });
    }
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        message:
          "Cloudinary isn't configured yet — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env",
      });
    }
    const result = await uploadBuffer(req.file.buffer, "reviews");
    res.status(201).json({ url: result.secure_url });
  }),
);

// Public: reviews for a product's details page (?productId=...) or, with
// no query, the admin's full moderation list.
router.get(
  "/",
  ah(async (req, res) => {
    const query = {};
    if (req.query.productId) query.product = req.query.productId;
    const reviews = await Review.find(query).sort({ createdAt: -1 });
    if (req.query.productId) res.set("Cache-Control", "public, max-age=30");
    res.json(reviews);
  }),
);

// Public: "Write a Review" on a product details page.
router.post(
  "/",
  reviewLimiter,
  ah(async (req, res) => {
    const { product, name, rating, title, text, image } = req.body;
    if (!product || !name || !rating || !text) {
      return res.status(400).json({ message: "Missing required review fields" });
    }
    const review = await Review.create({
      product,
      name,
      rating,
      title,
      text,
      image: image || "",
    });
    res.status(201).json(review);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.image) deleteImage(review.image);
    res.json({ deleted: true });
  }),
);

module.exports = router;
