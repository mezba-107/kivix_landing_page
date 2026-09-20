const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "customer", "order"
  seq: { type: Number, default: 0 },
});

// Atomically hands out the next number for the given counter name —
// safe even if two requests grab a number at the same instant.
counterSchema.statics.next = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc.seq;
};

module.exports = mongoose.model("Counter", counterSchema);
