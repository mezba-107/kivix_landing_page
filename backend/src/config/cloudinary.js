const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

// Uploads a buffer (from multer memory storage) straight to Cloudinary —
// no temp file ever touches disk, and nothing but the resulting URL ever
// touches MongoDB. Images are auto-optimised (format + quality) and
// capped at 1600px wide so product photos don't slow the storefront down.
function uploadBuffer(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `kivix/${folder}`,
        resource_type: "image",
        transformation: [
          { width: 1600, crop: "limit" },
          { fetch_format: "auto", quality: "auto" },
        ],
      },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    stream.end(buffer);
  });
}

// Every image URL we hand out looks like:
//   https://res.cloudinary.com/<cloud>/image/upload/v169.../kivix/products/abc123.jpg
// To delete it later we only have that URL stored on the document (not a
// separate public_id column), so we recover the public_id — everything
// between "/upload/<version>/" and the file extension — from the URL
// itself. Returns null for anything that isn't one of our Cloudinary URLs
// (e.g. empty string, or a leftover local/demo image path), so callers
// can safely skip those instead of erroring out.
function extractPublicId(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^?#]+)\.[a-zA-Z0-9]+(?:[?#].*)?$/);
  return match ? match[1] : null;
}

// Best-effort delete — logs and swallows errors instead of throwing, so a
// Cloudinary hiccup (or an already-deleted/foreign image) never blocks the
// actual product/order/account operation the user asked for.
async function deleteImage(url) {
  const publicId = extractPublicId(url);
  if (!publicId || !isCloudinaryConfigured()) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  } catch (err) {
    console.error(`Cloudinary: couldn't delete ${publicId}:`, err.message);
  }
}

// Convenience for deleting several URLs at once (e.g. a product's main
// image + its whole gallery) without one failure stopping the rest.
async function deleteImages(urls) {
  await Promise.all((urls || []).filter(Boolean).map(deleteImage));
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBuffer,
  extractPublicId,
  deleteImage,
  deleteImages,
};
