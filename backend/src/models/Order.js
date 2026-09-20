const mongoose = require("mongoose");
const Counter = require("./Counter");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    size: { type: Number },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    }, // null = guest checkout
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    notes: { type: String, default: "" },
    items: { type: [orderItemSchema], required: true },
    shippingFee: { type: Number, default: 0 },
    couponCode: { type: String, default: "" },
    discount: { type: Number, default: 0 },
    loyaltyRewardApplied: { type: Boolean, default: false },
    loyaltyDiscount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Done", "Cancelled"],
      default: "Pending",
    },
    cancelRequested: { type: Boolean, default: false },
    // Guards against double-counting loyalty stamps if an order's status
    // bounces to "Done" more than once (e.g. corrected by mistake).
    loyaltyStampsCounted: { type: Boolean, default: false },
    // Human-friendly sequential id (1, 2, 3…) shown everywhere as
    // "#10001" instead of a chunk of the random Mongo _id — assigned
    // once, below, the first time a document is saved without one.
    orderNumber: { type: Number, index: true },
  },
  { timestamps: { createdAt: "date", updatedAt: true }, toJSON: { virtuals: true } },
);

orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    this.orderNumber = await Counter.next("order");
  }
  next();
});

orderSchema.virtual("displayId").get(function () {
  return this.orderNumber
    ? `#${10000 + this.orderNumber}`
    : `#${String(this._id).slice(-6).toUpperCase()}`;
});

// Speeds up the admin Orders list (status filter, newest-first) and a
// customer's own order history lookup.
orderSchema.index({ status: 1, date: -1 });
orderSchema.index({ customer: 1, date: -1 });

module.exports = mongoose.model("Order", orderSchema);
