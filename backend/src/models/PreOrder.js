const mongoose = require("mongoose");
const Counter = require("./Counter");

const preOrderSchema = new mongoose.Schema(
  {
    // null = guest pre-order, same convention as Order.customer
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    customerName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    notes: { type: String, default: "" },

    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    // Snapshot of the product at pre-order time (name/image can change
    // or the product can be deleted later — keep the record readable).
    productName: { type: String, required: true },
    productImage: { type: String, default: "" },
    size: { type: Number },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }, // DB price, never trusted from the client

    status: {
      type: String,
      enum: ["Pending", "Contacted", "Fulfilled", "Cancelled"],
      default: "Pending",
    },

    // Human-friendly sequential id, same idea as Order.orderNumber but
    // its own counter/prefix so pre-orders are visibly a different
    // series from regular orders (e.g. #PO1001 vs #10001).
    preOrderNumber: { type: Number, index: true },
  },
  { timestamps: { createdAt: "date", updatedAt: true }, toJSON: { virtuals: true } },
);

preOrderSchema.pre("save", async function (next) {
  if (!this.preOrderNumber) {
    this.preOrderNumber = await Counter.next("preorder");
  }
  next();
});

preOrderSchema.virtual("displayId").get(function () {
  return this.preOrderNumber
    ? `#PO${1000 + this.preOrderNumber}`
    : `#${String(this._id).slice(-6).toUpperCase()}`;
});

// Speeds up the admin Pre-orders list (status filter, newest-first).
preOrderSchema.index({ status: 1, date: -1 });

module.exports = mongoose.model("PreOrder", preOrderSchema);
