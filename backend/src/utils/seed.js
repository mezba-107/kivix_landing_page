require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");
const Product = require("../models/Product");

const PRODUCTS_SEED = [
  {
    name: "Nike Dunk Low",
    brand: "Nike",
    price: 4200,
    oldPrice: 5600,
    discount: 25,
    tone: "#1a1a1a",
    tag: "Best Seller",
    description: "Classic look with premium comfort. Perfect for everyday wear.",
    features: [
      "Premium quality leather",
      "Soft & comfortable inside",
      "Durable rubber outsole",
      "Stylish & trendy design",
    ],
    sizes: [40, 41, 42, 43, 44],
    defaultSize: 42,
    stock: { 40: 6, 41: 8, 42: 5, 43: 3, 44: 0 },
  },
  {
    name: "Air Jordan 1 Mid",
    brand: "Jordan",
    price: 4900,
    oldPrice: 6100,
    discount: 20,
    tone: "#8a1010",
    tag: "New Arrival",
    description:
      "Iconic high-top silhouette rebuilt for daily comfort and standout style.",
    features: [
      "Genuine leather upper",
      "Encapsulated Air-Sole cushioning",
      "Rubber cupsole for grip",
      "Reinforced ankle collar",
    ],
    sizes: [40, 41, 42, 43, 44],
    defaultSize: 41,
    stock: { 40: 4, 41: 7, 42: 6, 43: 5, 44: 2 },
  },
  {
    name: "New Balance 550",
    brand: "New Balance",
    price: 4300,
    oldPrice: 5000,
    discount: 15,
    tone: "#e7e7e2",
    tag: "Trending",
    description: "Retro basketball-inspired build with a clean, minimal off-court look.",
    features: [
      "Premium leather panels",
      "Cushioned foam midsole",
      "Padded collar for support",
      "Classic low-top profile",
    ],
    sizes: [39, 40, 41, 42, 43],
    defaultSize: 42,
  },
  {
    name: "Adidas Ozweego",
    brand: "Adidas",
    price: 4000,
    oldPrice: 5000,
    discount: 20,
    tone: "#2b2b2b",
    tag: "Limited Offer",
    description: "Chunky retro-futuristic runner built for all-day comfort.",
    features: [
      "Breathable mesh upper",
      "Adiprene cushioning",
      "Layered midsole design",
      "Durable rubber outsole",
    ],
    sizes: [40, 41, 42, 43, 44],
    defaultSize: 43,
  },
  {
    name: "Air Force 1 '07",
    brand: "Nike",
    price: 3800,
    oldPrice: null,
    discount: 0,
    tone: "#f4f4f4",
    tag: "Everyday Classic",
    description: "The timeless court classic — clean, crisp and endlessly versatile.",
    features: [
      "Full-grain leather upper",
      "Encapsulated Air cushioning",
      "Perforations for breathability",
      "Pivot points for traction",
    ],
    sizes: [39, 40, 41, 42, 43, 44],
    defaultSize: 42,
  },
  {
    name: "Puma RS-X",
    brand: "Puma",
    price: 3900,
    oldPrice: null,
    discount: 0,
    tone: "#173a7a",
    tag: "Bold Pick",
    description: "Bold chunky sneaker with retro running DNA and modern comfort.",
    features: [
      "Mixed material upper",
      "RS foam cushioning",
      "Padded tongue & collar",
      "Eye-catching colour blocks",
    ],
    sizes: [40, 41, 42, 43, 44],
    defaultSize: 42,
  },
];

async function ensureSeed() {
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    const email = (process.env.SEED_ADMIN_EMAIL || "admin@kivix.com").toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
    const passwordHash = await Admin.hashPassword(password);
    await Admin.create({
      name: "Super Admin",
      email,
      passwordHash,
      role: "Super Admin",
    });
    console.log(`Seeded Super Admin login: ${email} / ${password}`);
  }

  const productCount = await Product.countDocuments();
  if (productCount === 0) {
    await Product.insertMany(PRODUCTS_SEED);
    console.log(`Seeded ${PRODUCTS_SEED.length} starter products`);
  }
}

module.exports = ensureSeed;

// Allows `npm run seed` to run this file directly, outside of server.js.
if (require.main === module) {
  connectDB()
    .then(ensureSeed)
    .then(() => {
      console.log("Seeding complete");
      return mongoose.disconnect();
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
