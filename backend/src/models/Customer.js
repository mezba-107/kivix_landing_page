const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Counter = require("./Counter");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: "Home" },
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    zone: { type: String, enum: ["inside", "outside"], default: "inside" },
    division: { type: String, default: "" },
    city: { type: String, default: "" },
    addressLine: { type: String, default: "" },
    isDefault: { type: Boolean, default: false },
  },
  { toJSON: { virtuals: true } },
);

const customerSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, default: "Customer" },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    phone: { type: String, default: null, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    // False only for an account created fresh via "Continue with
    // Google" — it gets a random, never-shown passwordHash just to
    // satisfy the schema, so the person genuinely has no password to
    // enter for Change Password / Delete Account. Flips true forever
    // once they set a real one (see PUT /customers/me/password).
    hasPassword: { type: Boolean, default: true },
    method: { type: String, enum: ["email", "phone", "google"], default: "email" },
    // Set when this account was created (or later linked) via "Continue
    // with Google" — Google's stable per-user id ("sub" in their
    // profile response). Lets a repeat Google sign-in find the same
    // account instead of erroring on the unique email index.
    googleId: { type: String, default: null },
    role: {
      type: String,
      enum: ["Customer", "Mod", "Admin"],
      default: "Customer",
    },
    avatar: { type: String, default: "" },
    addresses: { type: [addressSchema], default: [] },
    // Set when this customer is promoted to Mod/Admin from the admin
    // panel — points at the matching Admin document so the panel can
    // find/remove it again if they're demoted back to Customer.
    linkedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    // ---- Loyalty stamp card: buy 5 pairs, the 6th is 70% off ----
    // loyaltyStamps counts delivered pairs in the current cycle (0-5).
    // It hits 5, loyaltyRewardReady flips true (the customer's next
    // pair is unlocked at 70% off), and the cycle's counter resets to
    // 0 so the *next* delivered pair after that starts a fresh count
    // toward the following reward.
    loyaltyStamps: { type: Number, default: 0, min: 0, max: 5 },
    loyaltyRewardReady: { type: Boolean, default: false },
    // Human-friendly sequential id (1, 2, 3…) shown everywhere as
    // "#10001" instead of a chunk of the random Mongo _id — assigned
    // once, below, the first time a document is saved without one.
    customerNumber: { type: Number, index: true },
  },
  { timestamps: true },
);

customerSchema.pre("save", async function (next) {
  if (!this.customerNumber) {
    this.customerNumber = await Counter.next("customer");
  }
  next();
});

customerSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
customerSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};
customerSchema.methods.toSafeJSON = function () {
  const {
    _id,
    firstName,
    lastName,
    name,
    email,
    phone,
    role,
    avatar,
    addresses,
    loyaltyStamps,
    loyaltyRewardReady,
    customerNumber,
    hasPassword,
    createdAt,
  } = this;
  return {
    id: _id,
    displayId: customerNumber ? `#${10000 + customerNumber}` : `#${String(_id).slice(-6).toUpperCase()}`,
    firstName,
    lastName,
    name,
    email,
    phone,
    role,
    avatar,
    addresses,
    loyaltyStamps,
    loyaltyRewardReady,
    hasPassword,
    createdAt,
  };
};

module.exports = mongoose.model("Customer", customerSchema);
