const express = require("express");
const Admin = require("../models/Admin");
const Customer = require("../models/Customer");
const { ah } = require("../middleware/errorHandler");
const { requireAdmin, requireFullAdmin } = require("../middleware/auth");
const { deleteImage } = require("../config/cloudinary");

const router = express.Router();

router.get(
  "/",
  requireAdmin,
  ah(async (req, res) => {
    const admins = await Admin.find().sort({ createdAt: 1 });
    res.json(admins.map((a) => a.toSafeJSON()));
  }),
);

// Any logged-in admin/mod can update their own display name — no
// special role required, this only ever touches the caller's own
// record. Mirrors the password/avatar sync above: if this login is
// linked to a Customer account with the same email, keep that name in
// step too.
router.put(
  "/me",
  requireAdmin,
  ah(async (req, res) => {
    const name = (req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    req.admin.name = name;
    await req.admin.save();
    await Customer.findOneAndUpdate({ linkedAdmin: req.admin.id }, { name });
    res.json(req.admin.toSafeJSON());
  }),
);

// Any logged-in admin/mod can change their own password — no special
// role required, this only ever touches the caller's own record.
router.put(
  "/me/password",
  requireAdmin,
  ah(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!(await req.admin.comparePassword(currentPassword || ""))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ message: "New password must be at least 4 characters" });
    }
    const passwordHash = await Admin.hashPassword(newPassword);
    req.admin.passwordHash = passwordHash;
    await req.admin.save();
    // If this login started out as (or is linked to) a Customer account
    // with the same email, keep that password in step too — same
    // person, same password, wherever they change it. Mirrors the sync
    // in customer.routes.js PUT /me/password.
    await Customer.findOneAndUpdate({ linkedAdmin: req.admin.id }, { passwordHash });
    res.json(req.admin.toSafeJSON());
  }),
);

// Any logged-in admin/mod can set their own profile photo — no special
// role required, this only ever touches the caller's own record.
router.put(
  "/me/avatar",
  requireAdmin,
  ah(async (req, res) => {
    const oldAvatar = req.admin.avatar;
    const newAvatar = req.body.avatar || "";
    req.admin.avatar = newAvatar;
    await req.admin.save();
    // If this Admin/Mod login started out as a customer account, keep
    // that customer record's photo the same too — one person, one
    // profile picture, wherever it's shown.
    await Customer.findOneAndUpdate({ linkedAdmin: req.admin.id }, { avatar: newAvatar });
    if (oldAvatar && oldAvatar !== newAvatar) deleteImage(oldAvatar);
    res.json(req.admin.toSafeJSON());
  }),
);

// Only Admin/Super Admin can add new staff — Mods can't.
router.post(
  "/",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (!["Admin", "Mod"].includes(role)) {
      return res.status(400).json({ message: "role must be 'Admin' or 'Mod'" });
    }
    const passwordHash = await Admin.hashPassword(password);
    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    });
    res.status(201).json(admin.toSafeJSON());
  }),
);

// Change an admin's role. Admin/Mod toggles can be done by any Admin or
// Super Admin. Anything that touches "Super Admin" status (promoting
// someone to it, or demoting a Super Admin away from it) can only be
// done by an existing Super Admin — a plain Admin has full power over
// staff otherwise, but not over the Super Admin seat.
router.patch(
  "/:id/role",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const target = await Admin.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Admin not found" });

    const { role } = req.body;
    if (!["Admin", "Mod", "Super Admin"].includes(role)) {
      return res.status(400).json({ message: "role must be 'Admin', 'Mod' or 'Super Admin'" });
    }

    const touchesSuperAdmin = target.role === "Super Admin" || role === "Super Admin";
    if (touchesSuperAdmin && req.admin.role !== "Super Admin") {
      return res
        .status(403)
        .json({ message: "Only a Super Admin can grant or change Super Admin status" });
    }

    if (target.role === "Super Admin" && role !== "Super Admin") {
      const superCount = await Admin.countDocuments({ role: "Super Admin" });
      if (superCount <= 1) {
        return res
          .status(400)
          .json({ message: "There must be at least one Super Admin" });
      }
    }

    if (target.role === "Admin" && role === "Mod") {
      const adminCount = await Admin.countDocuments({ role: "Admin" });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ message: "There must be at least one Admin" });
      }
    }
    target.role = role;
    await target.save();
    res.json(target.toSafeJSON());
  }),
);

// Removing a Super Admin is only allowed for another Super Admin (a plain
// Admin can't remove the Super Admin seat), and only once a replacement
// Super Admin already exists — so promote someone first via the role
// route above, then the original default account can be deleted.
router.delete(
  "/:id",
  requireAdmin,
  requireFullAdmin,
  ah(async (req, res) => {
    const target = await Admin.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Admin not found" });
    if (String(target.id) === String(req.admin.id)) {
      return res.status(400).json({ message: "You can't remove your own account" });
    }
    if (target.role === "Super Admin") {
      if (req.admin.role !== "Super Admin") {
        return res
          .status(403)
          .json({ message: "Only a Super Admin can remove a Super Admin" });
      }
      const superCount = await Admin.countDocuments({ role: "Super Admin" });
      if (superCount <= 1) {
        return res
          .status(400)
          .json({ message: "There must be at least one Super Admin" });
      }
    }
    if (target.role === "Admin") {
      const adminCount = await Admin.countDocuments({ role: "Admin" });
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ message: "There must be at least one Admin" });
      }
    }
    await target.deleteOne();
    res.json({ deleted: true });
  }),
);

module.exports = router;
