const express = require("express");
const Product = require("../models/Product");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");
const { deleteImage, deleteImages } = require("../config/cloudinary");

const router = express.Router();

// Public: list products (storefront collection/search page).
// Supports ?brand=Nike and ?discount=1 (offers-only) like the frontend
// filter, plus ?page/&limit for pagination on larger catalogs.
router.get(
  "/",
  ah(async (req, res) => {
    const query = {};
    if (req.query.brand && req.query.brand !== "all") query.brand = req.query.brand;
    if (req.query.discount === "1") query.discount = { $gt: 0 };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 60);

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    // Safe to cache briefly at the browser/CDN level — the catalog
    // doesn't change second-to-second, and this cuts repeat DB hits.
    res.set("Cache-Control", "public, max-age=30");
    res.json({ products, total, page, pages: Math.ceil(total / limit) || 1 });
  }),
);

// Public: single product detail page.
router.get(
  "/:id",
  ah(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.set("Cache-Control", "public, max-age=30");
    res.json(product);
  }),
);

// Admin: create.
router.post(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  }),
);

// Admin: update (details, or a stock adjustment from the admin form).
router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const before = await Product.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Product not found" });

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Clean up any old images this update swapped out — otherwise every
    // re-upload just leaves the previous one sitting in Cloudinary forever.
    const droppedImages = [];
    if (
      req.body.image !== undefined &&
      before.image &&
      before.image !== product.image
    ) {
      droppedImages.push(before.image);
    }
    if (req.body.gallery !== undefined) {
      const newGallery = new Set(product.gallery || []);
      for (const old of before.gallery || []) {
        if (!newGallery.has(old)) droppedImages.push(old);
      }
    }
    deleteImages(droppedImages); // fire-and-forget, never blocks the response

    res.json(product);
  }),
);

// Admin: delete.
router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    deleteImages([product.image, ...(product.gallery || [])]);
    res.json({ deleted: true });
  }),
);

module.exports = router;
