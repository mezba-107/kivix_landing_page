const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill it in with your MongoDB Atlas connection string.",
    );
    process.exit(1);
  }
  try {
    // maxPoolSize: reuse up to 10 connections instead of opening a new one
    // per request. serverSelectionTimeoutMS: fail fast (5s) instead of a
    // request hanging for 30s+ if the DB is unreachable.
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected:", mongoose.connection.host);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
