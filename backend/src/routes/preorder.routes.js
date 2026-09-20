const express = require("express");
const rateLimit = require("express-rate-limit");
const PreOrder = require("../models/PreOrder");
const Product = require("../models/Product");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin, requireCustomer, optionalCustomer } = require("../middleware/auth");

const router = express.Router();

// Same reasoning as checkout/reviews: this is a public, unauthenticated
// form, so it needs its own limit to stop it being scripted/spammed.
const preOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many pre-orders from this device — please try again in a few minutes" },
});

/* ---------------- Public: place a pre-order ---------------- */
router.post(
  "/",
  preOrderLimiter,
  optionalCustomer,
  ah(async (req, res) => {
    const { productId, size, qty, customerName, phone, email, address, notes } = req.body;

    if (!productId || !customerName || !phone) {
      return res.status(400).json({ message: "Missing required pre-order fields" });
    }

    // SECURITY: same rule as checkout — price/name/image always come
    // from the database, never from the client.
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({ message: "That product isn't available anymore" });
    }

    const safeQty = Math.max(1, Math.floor(Number(qty) || 1));

    const preOrder = await PreOrder.create({
      customer: req.customer ? req.customer.id : null,
      customerName,
      phone,
      email: email || "",
      address: address || "",
      notes: notes || "",
      product: product.id,
      productName: product.name,
      productImage: product.image || "",
      size,
      qty: safeQty,
      price: product.price,
    });

    res.status(201).json(preOrder);
  }),
);

/* ---------------- Customer: my pre-orders ---------------- */
router.get(
  "/mine",
  requireCustomer,
  ah(async (req, res) => {
    const preOrders = await PreOrder.find({ customer: req.customer.id }).sort({ date: -1 });
    res.json(preOrders);
  }),
);

/* ---------------- Admin: list + manage pre-orders ---------------- */
router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.q) {
      const re = new RegExp(req.query.q, "i");
      query.$or = [{ customerName: re }, { phone: re }, { productName: re }];
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const [preOrders, total] = await Promise.all([
      PreOrder.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PreOrder.countDocuments(query),
    ]);
    res.json({ preOrders, total, page, pages: Math.ceil(total / limit) || 1 });
  }),
);

router.patch(
  "/:id/status",
  requireAdmin,
  ah(async (req, res) => {
    const { status } = req.body;
    if (!["Pending", "Contacted", "Fulfilled", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const preOrder = await PreOrder.findById(req.params.id);
    if (!preOrder) return res.status(404).json({ message: "Pre-order not found" });

    preOrder.status = status;
    await preOrder.save();
    res.json(preOrder);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const preOrder = await PreOrder.findById(req.params.id);
    if (!preOrder) return res.status(404).json({ message: "Pre-order not found" });
    await preOrder.deleteOne();
    res.json({ deleted: true });
  }),
);

module.exports = router;
