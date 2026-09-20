const express = require("express");
const rateLimit = require("express-rate-limit");
const Coupon = require("../models/Coupon");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");

const router = express.Router();

// Public + unauthenticated, so without a limit someone could script
// through codes (KIVIX10, KIVIX20, ...) to find valid ones. 20 tries
// per 15 minutes per IP is plenty for a real shopper re-checking a code.
const validateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts — please try again in a few minutes" },
});

router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  }),
);

router.post(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  }),
);

router.put(
  "/:id",
  requireAdmin,
  ah(async (req, res) => {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json(coupon);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ deleted: true });
  }),
);

// Public: checkout page calls this to check a code before/at order time.
router.post(
  "/validate",
  validateLimiter,
  ah(async (req, res) => {
    const { code, subtotal } = req.body;
    const result = await Coupon.validateForSubtotal(code, Number(subtotal) || 0);
    if (!result.ok) return res.status(400).json({ message: result.message });
    res.json({ coupon: result.coupon, discount: result.discount });
  }),
);

module.exports = router;
