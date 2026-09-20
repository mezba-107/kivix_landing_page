const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["Super Admin", "Admin", "Mod"],
      default: "Mod",
    },
    avatar: { type: String, default: "" },
  },
  { timestamps: true },
);

adminSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
adminSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};
adminSchema.methods.toSafeJSON = function () {
  const { _id, name, email, role, avatar, createdAt } = this;
  return { id: _id, name, email, role, avatar, createdAt };
};

module.exports = mongoose.model("Admin", adminSchema);
