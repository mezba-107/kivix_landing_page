const { verifyToken } = require("../utils/jwt");
const Admin = require("../models/Admin");
const Customer = require("../models/Customer");

function getTokenFromHeader(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

// Requires a valid admin/mod/super-admin login. Attaches req.admin.
async function requireAdmin(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const payload = verifyToken(token);
    if (payload.type !== "admin")
      return res.status(401).json({ message: "Invalid token" });
    const admin = await Admin.findById(payload.id);
    if (!admin) return res.status(401).json({ message: "Account not found" });
    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Only "Admin" or "Super Admin" — blocks Mods from admin-only actions
// (adding/removing staff, etc), same rule the original frontend used.
function requireFullAdmin(req, res, next) {
  if (!req.admin || !["Admin", "Super Admin"].includes(req.admin.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.admin || req.admin.role !== "Super Admin") {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
}

// Requires a logged-in customer. Attaches req.customer.
async function requireCustomer(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const payload = verifyToken(token);
    if (payload.type !== "customer")
      return res.status(401).json({ message: "Invalid token" });
    const customer = await Customer.findById(payload.id);
    if (!customer)
      return res.status(401).json({ message: "Account not found" });
    req.customer = customer;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Doesn't block the request either way — just attaches req.customer if a
// valid customer token was sent, so checkout can work for logged-in AND
// guest shoppers off the same endpoint.
async function optionalCustomer(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return next();
    const payload = verifyToken(token);
    if (payload.type !== "customer") return next();
    const customer = await Customer.findById(payload.id);
    if (customer) req.customer = customer;
    next();
  } catch (err) {
    next();
  }
}

// Accepts either an admin or a customer token — used for endpoints like
// image upload that both sides legitimately need (product photos vs.
// profile avatars), without exposing it to fully anonymous requests.
async function requireAnyAuth(req, res, next) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const payload = verifyToken(token);
    if (payload.type === "admin") {
      const admin = await Admin.findById(payload.id);
      if (!admin) return res.status(401).json({ message: "Account not found" });
      req.admin = admin;
      return next();
    }
    if (payload.type === "customer") {
      const customer = await Customer.findById(payload.id);
      if (!customer) return res.status(401).json({ message: "Account not found" });
      req.customer = customer;
      return next();
    }
    return res.status(401).json({ message: "Invalid token" });
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = {
  requireAdmin,
  requireFullAdmin,
  requireSuperAdmin,
  requireCustomer,
  optionalCustomer,
  requireAnyAuth,
};
