const express = require("express");
const OfferTimer = require("../models/OfferTimer");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Public: every storefront page reads this to decide whether to show
// the countdown bar.
router.get(
  "/",
  ah(async (req, res) => {
    const timer = await OfferTimer.getSingleton();
    res.set("Cache-Control", "public, max-age=15");
    res.json(timer);
  }),
);

router.put(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const { active, title, subtitle, endsAt, coupon } = req.body;
    if (active && !endsAt) {
      return res.status(400).json({ message: "Pick when the countdown should end" });
    }
    if (active && new Date(endsAt) <= new Date()) {
      return res.status(400).json({ message: "Pick a countdown end time in the future" });
    }
    let timer = await OfferTimer.getSingleton();
    timer.active = !!active;
    timer.title = title || "Limited Time Offer";
    timer.subtitle = subtitle || "Sale ends in:";
    timer.endsAt = endsAt || null;
    timer.coupon = coupon || null;
    await timer.save();
    timer = await OfferTimer.getSingleton();
    res.json(timer);
  }),
);

module.exports = router;
