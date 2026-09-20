const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "flat"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrder: { type: Number, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

// Validates a code against an order subtotal. Returns { ok, message } or
// { ok: true, coupon, discount } — mirrors the original frontend logic
// in data.js exactly so behaviour doesn't change when wired up.
couponSchema.statics.validateForSubtotal = async function (code, subtotal) {
  const coupon = await this.findOne({
    code: String(code || "").trim().toUpperCase(),
  });
  if (!coupon) return { ok: false, message: "Invalid coupon code" };
  if (!coupon.active)
    return { ok: false, message: "This coupon is no longer active" };
  if (coupon.expiresAt && coupon.expiresAt < new Date())
    return { ok: false, message: "This coupon has expired" };
  if (coupon.minOrder && subtotal < coupon.minOrder)
    return {
      ok: false,
      message: `Minimum order of BDT ${coupon.minOrder.toLocaleString()} required for this coupon`,
    };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    return { ok: false, message: "This coupon has reached its usage limit" };

  const rawDiscount =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : coupon.value;
  const discount = Math.max(0, Math.min(rawDiscount, subtotal));
  return { ok: true, coupon, discount };
};

module.exports = mongoose.model("Coupon", couponSchema);
