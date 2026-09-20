const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const PreOrder = require("../models/PreOrder");
const Admin = require("../models/Admin");
const Coupon = require("../models/Coupon");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const [totalProducts, totalOrders, pendingOrders, pendingPreOrders, totalAdmins, activeCoupons] =
      await Promise.all([
        Product.countDocuments(),
        Order.countDocuments(),
        Order.countDocuments({ status: "Pending" }),
        PreOrder.countDocuments({ status: "Pending" }),
        Admin.countDocuments(),
        Coupon.countDocuments({ active: true }),
      ]);
    res.json({ totalProducts, totalOrders, pendingOrders, pendingPreOrders, totalAdmins, activeCoupons });
  }),
);

/* ===================================================
   Real, server-side visit counter (replaces the
   frontend's localStorage-only version). One document,
   incremented once per unique session token the client
   sends — pass any stable per-tab id you like.
=================================================== */
const visitSchema = new mongoose.Schema({
  key: { type: String, default: "singleton", unique: true },
  count: { type: Number, default: 0 },
});
const Visit = mongoose.models.Visit || mongoose.model("Visit", visitSchema);

router.get(
  "/visits",
  ah(async (req, res) => {
    const doc = (await Visit.findOne({ key: "singleton" })) || { count: 0 };
    res.json({ count: doc.count });
  }),
);

router.post(
  "/visits",
  ah(async (req, res) => {
    const doc = await Visit.findOneAndUpdate(
      { key: "singleton" },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );
    res.json({ count: doc.count });
  }),
);

module.exports = router;
