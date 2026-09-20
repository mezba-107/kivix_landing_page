const express = require("express");
const HeroSlide = require("../models/HeroSlide");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");
const { deleteImage } = require("../config/cloudinary");

const router = express.Router();

router.get(
  "/",
  ah(async (req, res) => {
    const slides = await HeroSlide.find().sort({ sortOrder: 1, createdAt: 1 });
    res.set("Cache-Control", "public, max-age=30");
    res.json(slides);
  }),
);

router.post(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const slide = await HeroSlide.create(req.body);
    res.status(201).json(slide);
  }),
);

router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const slide = await HeroSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ message: "Slide not found" });
    const { image, mobileImage } = req.body;
    if (typeof image === "string" && image && image !== slide.image) {
      deleteImage(slide.image);
    deleteImage(slide.mobileImage);
      slide.image = image;
    }
    if (typeof mobileImage === "string" && mobileImage !== slide.mobileImage) {
      deleteImage(slide.mobileImage);
      slide.mobileImage = mobileImage;
    }
    await slide.save();
    res.json(slide);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const slide = await HeroSlide.findByIdAndDelete(req.params.id);
    if (!slide) return res.status(404).json({ message: "Slide not found" });
    deleteImage(slide.image);
    res.json({ deleted: true });
  }),
);

module.exports = router;
