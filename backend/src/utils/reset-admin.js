/* ===================================================
   Reset the Super Admin's login to whatever is currently in
   .env (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD).

   seed.js only ever CREATES a Super Admin when the admins
   collection is empty — so editing .env after that first run
   does nothing to the admin that already exists in MongoDB.
   This script is for exactly that situation: it finds the
   existing Super Admin and updates their email + password
   (properly bcrypt-hashed, via Admin.hashPassword) to match
   .env. Safe to run as many times as you like.

   Usage:  npm run reset-admin   (from the backend/ folder)
=================================================== */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

async function resetAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  if (!email || !password) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env first",
    );
  }

  // Prefer the existing Super Admin; fall back to the very first admin
  // document if a Super Admin somehow doesn't exist yet.
  let admin = await Admin.findOne({ role: "Super Admin" });
  if (!admin) admin = await Admin.findOne().sort({ createdAt: 1 });

  if (!admin) {
    admin = await Admin.create({
      name: "Super Admin",
      email,
      passwordHash: await Admin.hashPassword(password),
      role: "Super Admin",
    });
    console.log(`No admin existed — created one: ${email} / ${password}`);
    return;
  }

  const oldEmail = admin.email;
  admin.email = email;
  admin.passwordHash = await Admin.hashPassword(password);
  await admin.save();
  console.log(`Updated admin "${oldEmail}" -> ${email} / ${password}`);
}

connectDB()
  .then(resetAdmin)
  .then(() => {
    console.log("Done.");
    return mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
