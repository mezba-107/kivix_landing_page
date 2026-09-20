const express = require("express");
const rateLimit = require("express-rate-limit");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Customer = require("../models/Customer");
const { ah } = require("../middleware/errorHandler");
const {
  requireAdmin,
  requireFullAdmin,
  requireCustomer,
  optionalCustomer,
} = require("../middleware/auth");

const router = express.Router();

// Fixed delivery fees — must mirror DELIVERY_ZONES in Checkout/Checkout.js.
// Kept server-side (never trusting the client's shippingFee number) so an
// order can't be placed with a tampered/zero shipping charge.
const DELIVERY_ZONES = {
  inside: 80,
  outside: 140,
};

// Basic abuse protection on checkout — placing an order is free/unauthed
// (guest checkout), so without a limit someone could script thousands of
// fake orders. 20 orders per 15 minutes per IP is generous for a real
// shopper, restrictive for a script.
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many orders from this device — please try again in a few minutes" },
});

/* ---------------------------------------------------
   Stock helpers — mirror the original frontend's rule:
   stock is only ever touched once an order is Approved,
   and given back if it's later Cancelled or deleted.
--------------------------------------------------- */
async function adjustStock(productId, size, delta) {
  const product = await Product.findById(productId);
  if (!product || !product.stock) return; // stock not tracked for this product
  const key = String(size);
  const current = Number(product.stock.get(key) ?? 0);
  product.stock.set(key, Math.max(0, current + delta));
  product.markModified("stock");
  await product.save();
}
async function decrementStockForItems(items) {
  for (const item of items) {
    await adjustStock(item.productId, item.size, -Math.abs(item.qty));
  }
}
async function restoreStockForItems(items) {
  for (const item of items) {
    await adjustStock(item.productId, item.size, Math.abs(item.qty));
  }
}

/* ---------------------------------------------------
   Loyalty stamp card — buy 5 pairs, the 6th is 70% off.
   Called once a delivered order's pairs are counted. Every pair
   advances the stamp counter by 1; hitting 5 unlocks the reward
   (loyaltyRewardReady) and rolls the counter back to 0, so the
   very next pair delivered starts the following cycle.
--------------------------------------------------- */
const LOYALTY_STAMPS_NEEDED = 5;
const LOYALTY_DISCOUNT_PERCENT = 70;

function addLoyaltyStamps(customer, pairCount) {
  for (let i = 0; i < pairCount; i++) {
    customer.loyaltyStamps += 1;
    if (customer.loyaltyStamps >= LOYALTY_STAMPS_NEEDED) {
      customer.loyaltyStamps = 0;
      customer.loyaltyRewardReady = true;
    }
  }
}

/* ---------------- Create order (checkout) ---------------- */
// Works for both logged-in customers (token optional) and guests.
router.post(
  "/",
  checkoutLimiter,
  optionalCustomer,
  ah(async (req, res) => {
    const {
      customerName,
      phone,
      email,
      address,
      notes,
      items,
      zone,
      couponCode,
      useLoyaltyReward,
    } = req.body;

    if (!customerName || !phone || !address || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: "Missing required order fields" });
    }
    if (!Object.prototype.hasOwnProperty.call(DELIVERY_ZONES, zone)) {
      return res.status(400).json({ message: "Please choose a valid delivery zone" });
    }

    // SECURITY: never trust price/name/shippingFee from the client — look
    // every item up in the database and price the order from there. This
    // is the only source of truth for what the customer actually pays.
    const productIds = [...new Set(items.map((i) => i.productId).filter(Boolean))];
    const products = await Product.find({ _id: { $in: productIds } });
    const productsById = new Map(products.map((p) => [String(p._id), p]));

    const pricedItems = [];
    for (const raw of items) {
      const product = productsById.get(String(raw.productId));
      if (!product) {
        return res.status(400).json({ message: "One of the items in your cart is no longer available" });
      }
      const qty = Math.max(1, Math.floor(Number(raw.qty) || 0));
      if (!qty) {
        return res.status(400).json({ message: "Invalid quantity in cart" });
      }
      pricedItems.push({
        productId: product.id,
        name: product.name,
        size: raw.size,
        qty,
        price: product.price, // DB price — the client's price is ignored
      });
    }

    const shippingFee = DELIVERY_ZONES[zone];
    const subtotal = pricedItems.reduce((sum, i) => sum + i.price * i.qty, 0);

    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const result = await Coupon.validateForSubtotal(couponCode, subtotal);
      if (!result.ok) return res.status(400).json({ message: result.message });
      discount = result.discount;
      appliedCoupon = result.coupon;
    }

    // The 70%-off loyalty reward — only for a logged-in customer who has
    // actually unlocked it server-side (never trust the client on this).
    let loyaltyDiscount = 0;
    let loyaltyRewardApplied = false;
    if (useLoyaltyReward) {
      if (!req.customer) {
        return res.status(401).json({ message: "Log in to use your loyalty reward" });
      }
      if (!req.customer.loyaltyRewardReady) {
        return res.status(400).json({ message: "No loyalty reward available right now" });
      }
      const cheapestUnitPrice = Math.min(...pricedItems.map((i) => i.price));
      loyaltyDiscount = Math.round((cheapestUnitPrice * LOYALTY_DISCOUNT_PERCENT) / 100);
      loyaltyRewardApplied = true;
    }

    const order = await Order.create({
      customer: req.customer ? req.customer.id : null,
      customerName,
      phone,
      email: email || "",
      address,
      notes: notes || "",
      items: pricedItems,
      shippingFee,
      couponCode: appliedCoupon ? appliedCoupon.code : "",
      discount,
      loyaltyRewardApplied,
      loyaltyDiscount,
      total: subtotal - discount - loyaltyDiscount + shippingFee,
    });

    if (appliedCoupon) {
      appliedCoupon.usedCount += 1;
      await appliedCoupon.save();
    }
    if (loyaltyRewardApplied) {
      req.customer.loyaltyRewardReady = false;
      await req.customer.save();
    }

    res.status(201).json(order);
  }),
);

/* ---------------- Admin: list + manage orders ---------------- */
router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const query = {};
    if (req.query.status && req.query.status !== "all") query.status = req.query.status;
    if (req.query.customer) query.customer = req.query.customer;
    if (req.query.q) {
      const re = new RegExp(req.query.q, "i");
      query.$or = [{ customerName: re }, { phone: re }];
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(query),
    ]);
    res.json({ orders, total, page, pages: Math.ceil(total / limit) || 1 });
  }),
);

router.patch(
  "/:id/status",
  requireAdmin,
  ah(async (req, res) => {
    const { status } = req.body;
    if (!["Pending", "Approved", "Done", "Cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const prevStatus = order.status;
    if (status === "Approved" && prevStatus !== "Approved") {
      await decrementStockForItems(order.items);
    }
    if (status === "Cancelled" && prevStatus === "Approved") {
      await restoreStockForItems(order.items);
    }
    if (status === "Done" && prevStatus !== "Done" && !order.loyaltyStampsCounted) {
      if (order.customer) {
        const customer = await Customer.findById(order.customer);
        if (customer) {
          const pairCount = order.items.reduce((sum, i) => sum + i.qty, 0);
          addLoyaltyStamps(customer, pairCount);
          await customer.save();
        }
      }
      order.loyaltyStampsCounted = true;
    }

    order.status = status;
    await order.save();
    res.json(order);
  }),
);

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "Approved") {
      await restoreStockForItems(order.items);
    }
    await order.deleteOne();
    res.json({ deleted: true });
  }),
);

/* ---------------- Customer: my orders + cancel request ---------------- */
router.get(
  "/mine",
  requireCustomer,
  ah(async (req, res) => {
    const orders = await Order.find({ customer: req.customer.id }).sort({ date: -1 });
    res.json(orders);
  }),
);

router.post(
  "/:id/cancel-request",
  requireCustomer,
  ah(async (req, res) => {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.customer.id,
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "Pending") {
      return res.status(400).json({ message: "Only pending orders can be cancelled" });
    }
    if (order.cancelRequested) {
      return res.status(400).json({ message: "Cancellation already requested" });
    }
    order.cancelRequested = true;
    await order.save();
    res.json(order);
  }),
);

module.exports = router;
