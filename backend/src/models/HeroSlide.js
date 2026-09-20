const mongoose = require("mongoose");

const heroSlideSchema = new mongoose.Schema(
  {
    image: { type: String, required: true }, // PC / desktop image
    mobileImage: { type: String, default: "" }, // optional mobile image
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { virtuals: true } },
);

module.exports = mongoose.model("HeroSlide", heroSlideSchema);
