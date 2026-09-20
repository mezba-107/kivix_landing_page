// Catches anything thrown/rejected inside async route handlers (wrapped
// with the `ah` helper below) plus Mongoose validation/cast errors, and
// turns them into a consistent { message } JSON response instead of an
// HTML stack trace or a hung request.
function errorHandler(err, req, res, next) {
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({ message: `That ${field} is already in use` });
  }
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({ message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }
  if (err.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large (max 30MB)"
        : err.message;
    return res.status(400).json({ message });
  }
  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({
    message: err.message || "Something went wrong on our end",
  });
}

// Wrap an async route handler so thrown errors/rejected promises reach
// errorHandler instead of crashing the process.
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

module.exports = { errorHandler, ah };
