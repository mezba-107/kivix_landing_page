const mongoose = require("mongoose");

const offerBannerSchema = new mongoose.Schema(
  {
    image: { type: String, required: true }, // PC / desktop image
    mobileImage: { type: String, default: "" }, // optional mobile image
    link: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

module.exports = mongoose.model("OfferBanner", offerBannerSchema);
