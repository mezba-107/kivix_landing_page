const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "" },
    text: { type: String, required: true },
    image: { type: String, default: "" },
    verified: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
    toJSON: { virtuals: true },
  },
);

// A product details page always asks "reviews for product X, newest
// first" — index the exact shape of that query.
reviewSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
