require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

const connectDB = require("./src/config/db");
const ensureSeed = require("./src/utils/seed");
const backfillSequentialIds = require("./src/utils/backfillSequentialIds");
const { errorHandler } = require("./src/middleware/errorHandler");

const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const orderRoutes = require("./src/routes/order.routes");
const preOrderRoutes = require("./src/routes/preorder.routes");
const adminRoutes = require("./src/routes/admin.routes");
const customerRoutes = require("./src/routes/customer.routes");
const reviewRoutes = require("./src/routes/review.routes");
const heroRoutes = require("./src/routes/hero.routes");
const offerBannerRoutes = require("./src/routes/offerBanner.routes");
const couponRoutes = require("./src/routes/coupon.routes");
const offerTimerRoutes = require("./src/routes/offerTimer.routes");
const statsRoutes = require("./src/routes/stats.routes");
const uploadRoutes = require("./src/routes/upload.routes");

const app = express();

// Performance/security basics — cheap to add, meaningful for a live store:
// gzip every response, set sane security headers, and disable Express's
// "X-Powered-By" fingerprint.
app.disable("x-powered-by");
app.use(
  helmet({
    // This API only ever returns JSON (no HTML), and is meant to be
    // called cross-origin from the storefront/admin — helmet's HTML-page
    // defaults (CSP, COEP/CORP) would just add unnecessary restrictions.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

// Images now go straight to Cloudinary via multipart upload (see
// upload.routes.js), so request bodies are just text/numbers — a small
// JSON limit is plenty and keeps the server from being tied up parsing
// huge payloads.
app.use(express.json({ limit: "300kb" }));
app.use(
  cors({
    origin: (process.env.CORS_ORIGIN || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }),
);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/preorders", preOrderRoutes);
app.use("/api/admins", adminRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/hero-slides", heroRoutes);
app.use("/api/offer-banners", offerBannerRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/offer-timer", offerTimerRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/uploads", uploadRoutes);

app.use((req, res) => res.status(404).json({ message: "Not found" }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(ensureSeed)
  .then(backfillSequentialIds)
  .then(() => {
    app.listen(PORT, () => console.log(`KI-VIX API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
