const express = require("express");
const OfferBanner = require("../models/OfferBanner");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");
const { deleteImage } = require("../config/cloudinary");

const router = express.Router();

// Public: only active banners (the homepage popup), unless an admin is
// asking (?all=1) for the full moderation list.
router.get(
  "/",
  ah(async (req, res) => {
    const query = req.query.all === "1" ? {} : { active: true };
    const banners = await OfferBanner.find(query).sort({ createdAt: -1 });
    if (req.query.all !== "1") res.set("Cache-Control", "public, max-age=30");
    res.json(banners);
  }),
);

router.post(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const banner = await OfferBanner.create(req.body);
    res.status(201).json(banner);
  }),
);

router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const before = await OfferBanner.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Banner not found" });
    const banner = await OfferBanner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    if (
      req.body.image !== undefined &&
      before.image &&
      before.image !== banner.image
    ) {
      deleteImage(before.image);
    }
    if (
      req.body.mobileImage !== undefined &&
      before.mobileImage &&
      before.mobileImage !== banner.mobileImage
    ) {
      deleteImage(before.mobileImage);
    }
    res.json(banner);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const banner = await OfferBanner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    deleteImage(banner.image);
    deleteImage(banner.mobileImage);
    res.json({ deleted: true });
  }),
);

module.exports = router;
