const express = require("express");
const Customer = require("../models/Customer");
const Admin = require("../models/Admin");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin, requireCustomer } = require("../middleware/auth");
const { deleteImage } = require("../config/cloudinary");

const router = express.Router();

/* ---------------- Admin: manage customers ---------------- */

router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const [customers, total] = await Promise.all([
      Customer.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Customer.countDocuments(),
    ]);
    res.json({
      customers: customers.map((c) => c.toSafeJSON()),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  }),
);

// Promote a customer to Mod/Admin (creates a matching Admin login using
// the same password hash) or demote them back to plain Customer (removes
// that Admin login again).
router.patch(
  "/:id/role",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const { role } = req.body;
    if (!["Customer", "Mod", "Admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    if (role === "Customer") {
      if (customer.linkedAdmin) {
        const linked = await Admin.findById(customer.linkedAdmin);
        if (linked && linked.role !== "Super Admin") {
          await linked.deleteOne();
        }
        customer.linkedAdmin = null;
      }
    } else {
      if (customer.linkedAdmin) {
        // Keep the linked Admin login's photo in step with whatever the
        // customer's current avatar is — same person, same picture.
        await Admin.findByIdAndUpdate(customer.linkedAdmin, {
          role,
          avatar: customer.avatar,
        });
      } else {
        const admin = await Admin.create({
          name: customer.name,
          email: customer.email || `${customer.phone}@kivix.local`,
          passwordHash: customer.passwordHash,
          role,
          avatar: customer.avatar,
        });
        customer.linkedAdmin = admin.id;
      }
    }

    customer.role = role;
    await customer.save();
    res.json(customer.toSafeJSON());
  }),
);

/* ---------------- Self-service (logged-in customer) ---------------- */
/* These "/me..." routes must stay ABOVE the admin "/:id" delete route
   below — Express matches routes in definition order, and ":id" is a
   wildcard that would otherwise swallow "/me" first (matching it as if
   "me" were a customer id), sending customer self-delete requests into
   the admin-only route and failing with 401 "Invalid token" instead of
   ever reaching requireCustomer. */

router.put(
  "/me",
  requireCustomer,
  ah(async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
    if (email && email.toLowerCase() !== req.customer.email) {
      const clash = await Customer.findOne({ email: email.toLowerCase() });
      if (clash) return res.status(409).json({ message: "Another account already uses this email" });
    }
    if (phone && phone !== req.customer.phone) {
      const clash = await Customer.findOne({ phone });
      if (clash) return res.status(409).json({ message: "Another account already uses this phone number" });
    }
    const name = `${firstName || ""} ${lastName || ""}`.trim() || req.customer.name;
    Object.assign(req.customer, {
      firstName: firstName ?? req.customer.firstName,
      lastName: lastName ?? req.customer.lastName,
      name,
      email: email ? email.toLowerCase() : req.customer.email,
      phone: phone ?? req.customer.phone,
    });
    await req.customer.save();
    res.json(req.customer.toSafeJSON());
  }),
);

router.put(
  "/me/avatar",
  requireCustomer,
  ah(async (req, res) => {
    const oldAvatar = req.customer.avatar;
    const newAvatar = req.body.avatar || "";
    req.customer.avatar = newAvatar;
    await req.customer.save();
    // If this customer is also an Admin/Mod, keep that login's photo
    // the same — one person, one profile picture, wherever it's shown.
    if (req.customer.linkedAdmin) {
      await Admin.findByIdAndUpdate(req.customer.linkedAdmin, { avatar: newAvatar });
    }
    if (oldAvatar && oldAvatar !== newAvatar) deleteImage(oldAvatar);
    res.json(req.customer.toSafeJSON());
  }),
);

router.put(
  "/me/password",
  requireCustomer,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    // A Google-only account has no real password to check yet — this
    // call is "set my first password", not "change my password".
    if (req.customer.hasPassword) {
      if (!(await req.customer.comparePassword(currentPassword || ""))) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
    }
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: "New password must be at least 4 characters" });
    }
    const passwordHash = await Customer.hashPassword(newPassword);
    req.customer.passwordHash = passwordHash;
    req.customer.hasPassword = true;
    await req.customer.save();
    // Same email, linked Admin/Mod login — keep both passwords in step
    // (see the matching sync in admin.routes.js PUT /me/password).
    if (req.customer.linkedAdmin) {
      await Admin.findByIdAndUpdate(req.customer.linkedAdmin, { passwordHash });
    }
    res.json(req.customer.toSafeJSON());
  }),
);

router.delete(
  "/me",
  requireCustomer,
  ah(async (req, res) => {
    // Same reasoning as above — a Google-only account has no password
    // to confirm with, so skip that check for them; their already-
    // verified login token is confirmation enough.
    if (req.customer.hasPassword) {
      if (!(await req.customer.comparePassword(req.body.password || ""))) {
        return res.status(400).json({ message: "Password is incorrect" });
      }
    }
    deleteImage(req.customer.avatar);
    await req.customer.deleteOne();
    res.json({ success: true });
  }),
);

/* ---------------- Admin: delete a customer ---------------- */
/* Kept below the "/me..." self-service routes above — see the note
   there about why order matters for this ":id" wildcard route. */

router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    if (customer.linkedAdmin) {
      const linked = await Admin.findById(customer.linkedAdmin);
      if (linked && linked.role !== "Super Admin") await linked.deleteOne();
    }
    deleteImage(customer.avatar);
    await customer.deleteOne();
    res.json({ deleted: true });
  }),
);

/* ---------------- Self-service: saved addresses ---------------- */

router.post(
  "/me/addresses",
  requireCustomer,
  ah(async (req, res) => {
    const isFirst = req.customer.addresses.length === 0;
    const newAddress = {
      label: req.body.label || "Home",
      fullName: req.body.fullName || "",
      phone: req.body.phone || "",
      zone: req.body.zone || "inside",
      division: req.body.division || "",
      city: req.body.city || "",
      addressLine: req.body.addressLine || "",
      isDefault: isFirst ? true : !!req.body.isDefault,
    };
    req.customer.addresses.push(newAddress);
    if (newAddress.isDefault) {
      req.customer.addresses.forEach((a) => {
        a.isDefault = a === req.customer.addresses[req.customer.addresses.length - 1];
      });
    }
    await req.customer.save();
    res.status(201).json(req.customer.addresses);
  }),
);

router.put(
  "/me/addresses/:addressId",
  requireCustomer,
  ah(async (req, res) => {
    const address = req.customer.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ message: "Address not found" });
    Object.assign(address, req.body);
    if (req.body.isDefault) {
      req.customer.addresses.forEach((a) => {
        a.isDefault = String(a._id) === String(address._id);
      });
    }
    await req.customer.save();
    res.json(req.customer.addresses);
  }),
);

router.delete(
  "/me/addresses/:addressId",
  requireCustomer,
  ah(async (req, res) => {
    req.customer.addresses = req.customer.addresses.filter(
      (a) => String(a._id) !== req.params.addressId,
    );
    if (req.customer.addresses.length && !req.customer.addresses.some((a) => a.isDefault)) {
      req.customer.addresses[0].isDefault = true;
    }
    await req.customer.save();
    res.json(req.customer.addresses);
  }),
);

module.exports = router;
