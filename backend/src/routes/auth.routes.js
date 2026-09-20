const express = require("express");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const Customer = require("../models/Customer");
const { signToken } = require("../utils/jwt");
const { ah } = require("../middleware/errorHandler");
const { requireCustomer, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Basic brute-force protection — deliberately only wired onto the
// login/signup routes below, NOT onto /admin/me or /customer/me. Those
// two "who am I" endpoints run on every single page load (every admin
// page calls /admin/me to confirm a saved token is still good), so
// rate-limiting them made ordinary fast navigation between pages look
// like it was randomly logging admins out once the count crossed 30.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts — please try again in a few minutes" },
});

/* ---------------- Admin auth ---------------- */

router.post(
  "/admin/login",
  authLimiter,
  ah(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const admin = await Admin.findOne({ email: String(email).toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = signToken({ id: admin.id, type: "admin" });
    res.json({ token, admin: admin.toSafeJSON() });
  }),
);

router.get(
  "/admin/me",
  requireAdmin,
  ah(async (req, res) => {
    res.json({ admin: req.admin.toSafeJSON() });
  }),
);

/* ---------------- Customer auth ---------------- */

router.post(
  "/customer/signup",
  authLimiter,
  ah(async (req, res) => {
    const { firstName, lastName, email, phone, password, method } = req.body;
    if (!password || password.length < 4) {
      return res
        .status(400)
        .json({ message: "Password must be at least 4 characters" });
    }
    if (method === "email") {
      if (!email) return res.status(400).json({ message: "Email is required" });
      const clash = await Customer.findOne({ email: email.toLowerCase() });
      if (clash)
        return res
          .status(409)
          .json({ message: "An account with this email already exists" });
    } else if (method === "phone") {
      if (!phone) return res.status(400).json({ message: "Phone is required" });
      const clash = await Customer.findOne({ phone });
      if (clash)
        return res
          .status(409)
          .json({ message: "An account with this phone number already exists" });
    } else {
      return res.status(400).json({ message: "method must be 'email' or 'phone'" });
    }

    const name = `${firstName || ""} ${lastName || ""}`.trim() || "Customer";
    const passwordHash = await Customer.hashPassword(password);
    const customer = await Customer.create({
      firstName: firstName || "",
      lastName: lastName || "",
      name,
      email: method === "email" ? email.toLowerCase() : null,
      phone: method === "phone" ? phone : null,
      passwordHash,
      method,
    });

    // If this same email already belongs to an Admin/Mod login, link
    // the two — from now on a password change on either side keeps
    // both in sync (see PUT /admins/me/password and
    // PUT /customers/me/password). Matches the existing linkedAdmin
    // mechanism already used for the promote-a-customer flow below.
    if (method === "email") {
      const matchingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (matchingAdmin) {
        customer.linkedAdmin = matchingAdmin.id;
        // Mirror their staff role here too so the admin's Customers list
        // (see customer.routes.js GET /) shows them as staff, not a
        // plain shopper — same display the promote-flow already sets.
        customer.role = matchingAdmin.role === "Super Admin" ? "Admin" : matchingAdmin.role;
        await customer.save();
      }
    }

    const token = signToken({ id: customer.id, type: "customer" });
    res.status(201).json({ token, customer: customer.toSafeJSON() });
  }),
);

router.post(
  "/customer/login",
  authLimiter,
  ah(async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res
        .status(400)
        .json({ message: "Email/phone and password are required" });

    const needle = String(identifier).trim();
    const customer = await Customer.findOne({
      $or: [{ email: needle.toLowerCase() }, { phone: needle }],
    });
    if (!customer || !(await customer.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = signToken({ id: customer.id, type: "customer" });
    res.json({ token, customer: customer.toSafeJSON() });
  }),
);

// "Continue with Google". The frontend gets an OAuth access token from
// Google Identity Services (a real user gesture — clicking the button —
// opens Google's own account-chooser popup) and sends only that token
// here. We never trust profile data the client could have made up: we
// take the token BACK to Google ourselves (the same call a real access
// token can only succeed against) and read the verified email/name/
// picture from Google's response. If there's no Customer with that
// email yet, one is created on the spot — a random, never-shown
// password is set so the account still satisfies the normal
// email+password login path too if they ever want it.
router.post(
  "/customer/google",
  authLimiter,
  ah(async (req, res) => {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ message: "Missing Google access token" });
    }

    let profile;
    try {
      const gRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!gRes.ok) throw new Error("bad token");
      profile = await gRes.json();
    } catch (err) {
      return res.status(401).json({ message: "Couldn't verify that Google sign-in" });
    }

    if (!profile.email || profile.email_verified !== true) {
      return res
        .status(400)
        .json({ message: "That Google account has no verified email" });
    }
    const email = profile.email.toLowerCase();

    let customer = await Customer.findOne({ email });
    if (!customer) {
      const passwordHash = await Customer.hashPassword(
        crypto.randomBytes(24).toString("hex"),
      );
      customer = await Customer.create({
        firstName: profile.given_name || "",
        lastName: profile.family_name || "",
        name: profile.name || email.split("@")[0],
        email,
        passwordHash,
        hasPassword: false,
        method: "google",
        googleId: profile.sub,
        avatar: profile.picture || "",
      });
      // Same linking as the regular signup route above — if this email
      // already belongs to an Admin/Mod login, treat them as staff.
      const matchingAdmin = await Admin.findOne({ email });
      if (matchingAdmin) {
        customer.linkedAdmin = matchingAdmin.id;
        customer.role = matchingAdmin.role === "Super Admin" ? "Admin" : matchingAdmin.role;
        await customer.save();
      }
    } else if (!customer.googleId) {
      // An existing email/phone account signing in with Google for the
      // first time — link it rather than erroring on the duplicate
      // email, and fill in an avatar if they don't already have one.
      customer.googleId = profile.sub;
      if (!customer.avatar && profile.picture) customer.avatar = profile.picture;
      await customer.save();
    }

    const token = signToken({ id: customer.id, type: "customer" });
    res.json({ token, customer: customer.toSafeJSON() });
  }),
);

router.get(
  "/customer/me",
  requireCustomer,
  ah(async (req, res) => {
    res.json({ customer: req.customer.toSafeJSON() });
  }),
);

module.exports = router;
