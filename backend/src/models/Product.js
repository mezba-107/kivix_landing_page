const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    oldPrice: { type: Number, default: null },
    discount: { type: Number, default: 0 }, // percentage, 0 = no sale badge
    tone: { type: String, default: "#1a1a1a" }, // fallback swatch colour if no image
    tag: { type: String, default: "" }, // "Best Seller", "New Arrival", etc.
    image: { type: String, default: "" },
    gallery: { type: [String], default: [] },
    description: { type: String, default: "" },
    features: { type: [String], default: [] },
    sizes: { type: [Number], default: [] },
    defaultSize: { type: Number, default: null },
    // Map key = size (as a string, e.g. "42"), value = qty left.
    // A product with no stock map at all is treated as unlimited stock,
    // same behaviour as the original frontend.
    stock: { type: Map, of: Number, default: undefined },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, flattenMaps: true },
    toObject: { virtuals: true, flattenMaps: true },
  },
);

productSchema.methods.toPublicJSON = function () {
  const obj = this.toObject({ virtuals: true });
  obj.stock = obj.stock
    ? Object.fromEntries(this.stock.entries())
    : undefined;
  return obj;
};

// Speeds up the storefront's common queries: brand filter chips, the
// "Offers" discount filter, and newest-first sorting.
productSchema.index({ brand: 1 });
productSchema.index({ discount: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
