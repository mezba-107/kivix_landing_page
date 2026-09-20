const mongoose = require("mongoose");

// A single site-wide countdown bar ("Buy 2 Products — Sale ends in:
// 01:30:54") with an optional linked coupon. Only one document of this
// collection is ever used — enforced via the fixed `key` value below.
const offerTimerSchema = new mongoose.Schema(
  {
    key: { type: String, default: "singleton", unique: true },
    active: { type: Boolean, default: false },
    title: { type: String, default: "Limited Time Offer" },
    subtitle: { type: String, default: "Sale ends in:" },
    endsAt: { type: Date, default: null },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
  },
  { toJSON: { virtuals: true } },
);

offerTimerSchema.statics.getSingleton = async function () {
  let doc = await this.findOne({ key: "singleton" }).populate("coupon");
  if (!doc) doc = await this.create({ key: "singleton" });
  return doc;
};

module.exports = mongoose.model("OfferTimer", offerTimerSchema);
