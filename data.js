/* ===================================================
   KI-VIX SNEAKERS — API CLIENT
   Talks to the real Node/Express/MongoDB backend in /backend
   instead of localStorage.

   Every store below (PRODUCTS, ORDERS, ADMINS, CUSTOMERS,
   COUPONS, OFFER_BANNERS, OFFER_TIMER, HERO_SLIDES,
   PRODUCT_REVIEWS_STORE) is an in-memory cache: a "load"
   function fetches it from the API, and every add/update/
   delete function calls the API then patches this same array
   in place — so page code that reads these arrays stays
   simple and synchronous, it just needs `await` in front of
   calls that hit the network.

   CART and WISHLIST stay in localStorage on purpose — they're
   this browser's pre-checkout scratch state, not business
   data that needs to be shared across devices.

   IDs: every document from the API has a string `.id` (Mongo
   ObjectId) — never wrap it in Number(), just compare as
   strings/use it directly in URLs.
=================================================== */

/* Change this to your deployed backend's URL when you go live,
   e.g. "https://kivix-api.onrender.com/api" */
const KIVIX_API_BASE = window.KIVIX_API_BASE || "http://localhost:5000/api";

// SECURITY: escapes user-submitted text before it's dropped into an
// innerHTML template — reviews, order/customer names, addresses, notes,
// etc. all ultimately come from a public form (checkout, "Write a
// Review"...), so without this a submitted <script>/onerror= payload
// would run in whoever's browser later views it (a customer viewing
// reviews, or an admin viewing an order). Every page loads data.js, so
// this is available everywhere as a single shared helper.
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str === undefined || str === null ? "" : String(str);
  return div.innerHTML;
}

// Adds a show/hide eye button to every password field inside `root`
// (defaults to the whole page). Safe to call repeatedly / after a
// re-render — already-wrapped inputs are skipped. See .pw-wrap /
// .pw-toggle-btn in each page's CSS for the styling.
const PW_EYE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const PW_EYE_OFF_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c7 0 10.5 7 10.5 7a13.6 13.6 0 0 1-3.1 4.1M6.5 6.6C3.6 8.4 1.5 12 1.5 12s3.5 7 10.5 7c1.4 0 2.7-.26 3.9-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function enablePasswordToggles(root) {
  (root || document)
    .querySelectorAll('input[type="password"]')
    .forEach((input) => {
      if (input.closest(".pw-wrap")) return; // already wrapped, skip
      const wrap = document.createElement("div");
      wrap.className = "pw-wrap";
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pw-toggle-btn";
      btn.setAttribute("aria-label", "Show password");
      btn.tabIndex = -1;
      btn.innerHTML = PW_EYE_ICON;
      wrap.appendChild(btn);
      btn.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.innerHTML = showing ? PW_EYE_ICON : PW_EYE_OFF_ICON;
        btn.setAttribute(
          "aria-label",
          showing ? "Show password" : "Hide password",
        );
      });
    });
}

// Shared list for the Division dropdown on Checkout and Profile → Addresses.
const BD_DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];
function bdDivisionOptionsHTML(selected) {
  return (
    `<option value="">Select division</option>` +
    BD_DIVISIONS.map(
      (d) =>
        `<option value="${d}" ${d === selected ? "selected" : ""}>${d}</option>`,
    ).join("")
  );
}

const LS_ADMIN_TOKEN = "kivix_admin_token";
const LS_CUSTOMER_TOKEN = "kivix_customer_token";

function getAdminToken() {
  return localStorage.getItem(LS_ADMIN_TOKEN);
}
function getCustomerToken() {
  return localStorage.getItem(LS_CUSTOMER_TOKEN);
}

async function apiRequest(
  path,
  { method = "GET", body, token, isFormData } = {},
) {
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  // Show the global loading overlay (see loading.js) while this request
  // is in flight — it no-ops if loading.js isn't loaded on this page.
  if (typeof window !== "undefined" && window.showLoading) window.showLoading();

  try {
    let res;
    try {
      res = await fetch(`${KIVIX_API_BASE}${path}`, {
        method,
        headers,
        body: isFormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
      });
    } catch (err) {
      throw new Error("Couldn't reach the server — check your connection");
    }

    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      /* empty response body — fine for e.g. 204s */
    }
    if (!res.ok) {
      const err = new Error((data && data.message) || "Something went wrong");
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    if (typeof window !== "undefined" && window.hideLoading)
      window.hideLoading();
  }
}
function apiPublic(path, opts) {
  return apiRequest(path, opts);
}
function apiAdmin(path, opts = {}) {
  return apiRequest(path, { ...opts, token: getAdminToken() });
}
function apiCustomer(path, opts = {}) {
  return apiRequest(path, { ...opts, token: getCustomerToken() });
}

/* Uploads a single image file to Cloudinary via the backend and returns
   its URL. folder = "products" | "hero-slides" | "offer-banners" |
   "avatars". Works with either an admin or a logged-in customer token
   (avatars), whichever is present. */
/* Shrinks big photos in the browser BEFORE upload (max 1600px wide, WebP),
   so a 5-10MB image becomes ~100-300KB. This is what makes uploads fast.
   Falls back to the original file if anything goes wrong. */
async function compressImage(file, maxWidth = 1600, quality = 0.85) {
  try {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    if (file.size < 200 * 1024) return file; // already small
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bmp.width);
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise((res) =>
      canvas.toBlob(res, "image/webp", quality),
    );
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size)
      return file;
    const name = (file.name || "image").replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch (e) {
    return file;
  }
}

async function uploadImage(file, folder) {
  file = await compressImage(file);
  const fd = new FormData();
  fd.append("image", file);
  const token = getAdminToken() || getCustomerToken();
  const result = await apiRequest(`/uploads/${folder}`, {
    method: "POST",
    body: fd,
    token,
    isFormData: true,
  });
  return result.url;
}

function formatBDT(amount) {
  return "BDT " + Number(amount || 0).toLocaleString("en-US");
}

/* ===================================================
   PRODUCTS
=================================================== */
let PRODUCTS = [];

async function loadProducts(params = "") {
  const result = await apiPublic(`/products${params}`);
  PRODUCTS = result.products;
  return PRODUCTS;
}
function getProductById(id) {
  return PRODUCTS.find((p) => String(p.id) === String(id));
}
async function addProduct(product) {
  const created = await apiAdmin("/products", {
    method: "POST",
    body: product,
  });
  PRODUCTS.unshift(created);
  return created;
}
async function updateProduct(id, changes) {
  const updated = await apiAdmin(`/products/${id}`, {
    method: "PUT",
    body: changes,
  });
  const idx = PRODUCTS.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) PRODUCTS[idx] = updated;
  else PRODUCTS.unshift(updated);
  return updated;
}
async function deleteProduct(id) {
  await apiAdmin(`/products/${id}`, { method: "DELETE" });
  PRODUCTS = PRODUCTS.filter((p) => String(p.id) !== String(id));
}

/* ---------- per-size stock (pure helpers — unchanged shape) ---------- */
function getSizeStock(product, size) {
  if (!product || !product.stock) return null;
  const v = product.stock[size];
  return v === undefined || v === null ? 0 : Number(v);
}
function isSizeOutOfStock(product, size) {
  const s = getSizeStock(product, size);
  return s !== null && s <= 0;
}
function isProductOutOfStock(product) {
  if (!product || !product.stock) return false;
  const sizes = product.sizes || [];
  if (!sizes.length) return false;
  return sizes.every((s) => isSizeOutOfStock(product, s));
}
function firstAvailableSize(product) {
  if (!product) return null;
  if (!product.stock) return product.defaultSize;
  const sizes = product.sizes || [];
  const available = sizes.find((s) => !isSizeOutOfStock(product, s));
  return available !== undefined ? available : product.defaultSize;
}
/* Stock is only ever adjusted server-side now (when an order is
   Approved/Cancelled/deleted) — reload the product/list to see fresh
   numbers after an order status change. */

/* ===================================================
   CART STORE (local — pre-checkout scratch state)
=================================================== */
const LS_CART = "kivix_cart";
function loadCartFromStorage() {
  try {
    const raw = localStorage.getItem(LS_CART);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return [];
}
function saveCart(items) {
  localStorage.setItem(LS_CART, JSON.stringify(items));
  CART = items;
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = getCartCount();
  });
}
function addToCart(product, size, qty = 1) {
  const existing = CART.find(
    (i) => String(i.productId) === String(product.id) && i.size === size,
  );
  if (existing) {
    existing.qty += qty;
  } else {
    CART.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      tone: product.tone,
      image: product.image || "",
      size: size,
      qty: qty,
    });
  }
  saveCart(CART);
}
function updateCartQty(index, qty) {
  if (!CART[index]) return;
  if (qty <= 0) CART.splice(index, 1);
  else CART[index].qty = qty;
  saveCart(CART);
}
function removeFromCart(index) {
  CART.splice(index, 1);
  saveCart(CART);
}
function clearCart() {
  saveCart([]);
}
function getCartCount() {
  return CART.reduce((sum, i) => sum + i.qty, 0);
}
function getCartTotal() {
  return CART.reduce((sum, i) => sum + i.price * i.qty, 0);
}
let CART = loadCartFromStorage();

/* ===================================================
   WISHLIST STORE (local)
=================================================== */
const LS_WISHLIST = "kivix_wishlist";
function loadWishlistFromStorage() {
  try {
    const raw = localStorage.getItem(LS_WISHLIST);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    /* ignore */
  }
  return [];
}
function saveWishlist(items) {
  localStorage.setItem(LS_WISHLIST, JSON.stringify(items));
  WISHLIST = items;
  document.querySelectorAll("[data-wishlist-count]").forEach((el) => {
    el.textContent = getWishlistCount();
  });
}
function isInWishlist(productId) {
  return WISHLIST.some((w) => String(w.productId) === String(productId));
}
function toggleWishlist(product) {
  const idx = WISHLIST.findIndex(
    (w) => String(w.productId) === String(product.id),
  );
  let added;
  if (idx > -1) {
    WISHLIST.splice(idx, 1);
    added = false;
  } else {
    WISHLIST.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      tone: product.tone,
      image: product.image || "",
    });
    added = true;
  }
  saveWishlist(WISHLIST);
  return added;
}
function removeFromWishlist(productId) {
  WISHLIST = WISHLIST.filter((w) => String(w.productId) !== String(productId));
  saveWishlist(WISHLIST);
}
function getWishlistCount() {
  return WISHLIST.length;
}
let WISHLIST = loadWishlistFromStorage();

/* ===================================================
   ORDERS (admin side — all orders)
=================================================== */
let ORDERS = [];
async function loadOrders(params = "") {
  const result = await apiAdmin(`/orders${params}`);
  ORDERS = result.orders;
  return ORDERS;
}
async function addOrder(order) {
  // checkout — works for a guest or a logged-in customer (token optional)
  const token = getCustomerToken();
  const created = await apiRequest("/orders", {
    method: "POST",
    body: order,
    token,
  });
  ORDERS.unshift(created);
  return created;
}
async function updateOrderStatus(id, status) {
  const updated = await apiAdmin(`/orders/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  const idx = ORDERS.findIndex((o) => String(o.id) === String(id));
  if (idx !== -1) ORDERS[idx] = updated;
  return updated;
}
async function deleteOrder(id) {
  await apiAdmin(`/orders/${id}`, { method: "DELETE" });
  ORDERS = ORDERS.filter((o) => String(o.id) !== String(id));
}
// Used by the customer detail modal in Admins & Mods — fetched on demand,
// kept separate from ORDERS so it doesn't clobber the Orders page's list.
async function getOrdersForCustomer(customerId) {
  const result = await apiAdmin(`/orders?customer=${customerId}&limit=100`);
  return result.orders;
}

/* ===================================================
   PRE-ORDERS — for stock-out items. Kept as a fully
   separate list/collection from ORDERS (see the "Pre-order"
   button on the product page and admin/preorders.html).
=================================================== */
let PREORDERS = [];
async function loadPreOrders(params = "") {
  const result = await apiAdmin(`/preorders${params}`);
  PREORDERS = result.preOrders;
  return PREORDERS;
}
async function addPreOrder(preOrder) {
  // works for a guest or a logged-in customer (token optional), same as addOrder
  const token = getCustomerToken();
  const created = await apiRequest("/preorders", {
    method: "POST",
    body: preOrder,
    token,
  });
  return created;
}
async function updatePreOrderStatus(id, status) {
  const updated = await apiAdmin(`/preorders/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
  const idx = PREORDERS.findIndex((p) => String(p.id) === String(id));
  if (idx !== -1) PREORDERS[idx] = updated;
  return updated;
}
async function deletePreOrder(id) {
  await apiAdmin(`/preorders/${id}`, { method: "DELETE" });
  PREORDERS = PREORDERS.filter((p) => String(p.id) !== String(id));
}

/* ===================================================
   ADMIN SESSION + ACCOUNTS
=================================================== */
let CURRENT_ADMIN = null;
let ADMINS = [];

async function adminLogin(email, password) {
  const { token, admin } = await apiPublic("/auth/admin/login", {
    method: "POST",
    body: { email, password },
  });
  localStorage.setItem(LS_ADMIN_TOKEN, token);
  CURRENT_ADMIN = admin;
  return admin;
}
function adminLogout() {
  localStorage.removeItem(LS_ADMIN_TOKEN);
  CURRENT_ADMIN = null;
}
function getCurrentAdmin() {
  return CURRENT_ADMIN;
}
// Restores the session from a saved token (if any) and confirms it's
// still valid server-side. Call once at the top of every /admin page.
async function bootstrapAdminSession() {
  const token = getAdminToken();
  if (!token) return null;
  try {
    const { admin } = await apiAdmin("/auth/admin/me");
    CURRENT_ADMIN = admin;
    return admin;
  } catch (e) {
    // A real "this token is bad" response — log out for real.
    if (e.status === 401) {
      localStorage.removeItem(LS_ADMIN_TOKEN);
      return null;
    }
    // Anything else (network hiccup, CORS blip, backend still waking up)
    // has no .status — give it one short retry before giving up, and
    // keep the token either way so the next refresh can still succeed.
    await new Promise((r) => setTimeout(r, 700));
    try {
      const { admin } = await apiAdmin("/auth/admin/me");
      CURRENT_ADMIN = admin;
      return admin;
    } catch (e2) {
      if (e2.status === 401) localStorage.removeItem(LS_ADMIN_TOKEN);
      return null;
    }
  }
}

async function loadAdmins() {
  ADMINS = await apiAdmin("/admins");
  return ADMINS;
}
async function addAdmin(admin) {
  const created = await apiAdmin("/admins", { method: "POST", body: admin });
  ADMINS.push(created);
  return created;
}
async function updateAdminRole(id, role) {
  const updated = await apiAdmin(`/admins/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
  const idx = ADMINS.findIndex((a) => String(a.id) === String(id));
  if (idx !== -1) ADMINS[idx] = updated;
  return updated;
}
async function deleteAdmin(id) {
  await apiAdmin(`/admins/${id}`, { method: "DELETE" });
  ADMINS = ADMINS.filter((a) => String(a.id) !== String(id));
}
async function updateAdminProfile(name) {
  const updated = await apiAdmin("/admins/me", {
    method: "PUT",
    body: { name },
  });
  CURRENT_ADMIN = updated;
  const idx = ADMINS.findIndex((a) => String(a.id) === String(updated.id));
  if (idx !== -1) ADMINS[idx] = updated;
  return updated;
}
async function updateAdminAvatar(urlOrEmpty) {
  const updated = await apiAdmin("/admins/me/avatar", {
    method: "PUT",
    body: { avatar: urlOrEmpty },
  });
  CURRENT_ADMIN = updated;
  const idx = ADMINS.findIndex((a) => String(a.id) === String(updated.id));
  if (idx !== -1) ADMINS[idx] = updated;
  return updated;
}
async function changeAdminPassword(currentPassword, newPassword) {
  try {
    const updated = await apiAdmin("/admins/me/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    });
    CURRENT_ADMIN = updated;
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/* ===================================================
   CUSTOMER SESSION + ACCOUNT
=================================================== */
let CURRENT_CUSTOMER = null;
let CUSTOMER_ORDERS = [];
let CUSTOMERS = []; // admin's customer list

async function customerSignup({
  firstName,
  lastName,
  email,
  phone,
  password,
  method,
}) {
  try {
    const { token, customer } = await apiPublic("/auth/customer/signup", {
      method: "POST",
      body: { firstName, lastName, email, phone, password, method },
    });
    localStorage.setItem(LS_CUSTOMER_TOKEN, token);
    CURRENT_CUSTOMER = customer;
    return { customer };
  } catch (err) {
    return { error: err.message };
  }
}
async function customerLogin(identifier, password) {
  try {
    const { token, customer } = await apiPublic("/auth/customer/login", {
      method: "POST",
      body: { identifier, password },
    });
    localStorage.setItem(LS_CUSTOMER_TOKEN, token);
    CURRENT_CUSTOMER = customer;
    return customer;
  } catch (err) {
    return null;
  }
}
// "Continue with Google" — takes the access token Google Identity
// Services handed back after the popup sign-in (see auth.js) and trades
// it for our own session, same shape as customerLogin/customerSignup
// above (find-or-create happens server-side).
async function customerGoogleLogin(accessToken) {
  try {
    const { token, customer } = await apiPublic("/auth/customer/google", {
      method: "POST",
      body: { accessToken },
    });
    localStorage.setItem(LS_CUSTOMER_TOKEN, token);
    CURRENT_CUSTOMER = customer;
    return { customer };
  } catch (err) {
    return { error: err.message };
  }
}
function customerLogout() {
  localStorage.removeItem(LS_CUSTOMER_TOKEN);
  CURRENT_CUSTOMER = null;
  CUSTOMER_ORDERS = [];
}
function getCurrentCustomer() {
  return CURRENT_CUSTOMER;
}
// Restores the session from a saved token, same idea as
// bootstrapAdminSession(). Called once per storefront page load (see
// KIVIX_READY below).
async function bootstrapCustomerSession() {
  const token = getCustomerToken();
  if (!token) return null;
  try {
    const { customer } = await apiCustomer("/auth/customer/me");
    CURRENT_CUSTOMER = customer;
    return customer;
  } catch (e) {
    localStorage.removeItem(LS_CUSTOMER_TOKEN);
    return null;
  }
}

async function updateCustomerProfile(
  id,
  { firstName, lastName, email, phone },
) {
  try {
    const updated = await apiCustomer("/customers/me", {
      method: "PUT",
      body: { firstName, lastName, email, phone },
    });
    CURRENT_CUSTOMER = updated;
    return { customer: updated };
  } catch (err) {
    return { error: err.message };
  }
}
async function updateCustomerAvatar(id, urlOrEmpty) {
  const updated = await apiCustomer("/customers/me/avatar", {
    method: "PUT",
    body: { avatar: urlOrEmpty },
  });
  CURRENT_CUSTOMER = updated;
  return updated;
}
async function changeCustomerPassword(id, currentPassword, newPassword) {
  try {
    const updated = await apiCustomer("/customers/me/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
    });
    CURRENT_CUSTOMER = updated;
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}
async function deleteCustomerAccount(id, password) {
  try {
    await apiCustomer("/customers/me", {
      method: "DELETE",
      body: { password },
    });
    customerLogout();
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
}

/* ---- saved addresses (kept on CURRENT_CUSTOMER.addresses) ---- */
function getCustomerAddresses(customerId) {
  return CURRENT_CUSTOMER ? CURRENT_CUSTOMER.addresses || [] : [];
}
async function addCustomerAddress(customerId, address) {
  const addresses = await apiCustomer("/customers/me/addresses", {
    method: "POST",
    body: address,
  });
  if (CURRENT_CUSTOMER) CURRENT_CUSTOMER.addresses = addresses;
  return { address: addresses[addresses.length - 1] };
}
async function updateCustomerAddress(customerId, addressId, changes) {
  const addresses = await apiCustomer(`/customers/me/addresses/${addressId}`, {
    method: "PUT",
    body: changes,
  });
  if (CURRENT_CUSTOMER) CURRENT_CUSTOMER.addresses = addresses;
  return { addresses };
}
async function deleteCustomerAddress(customerId, addressId) {
  const addresses = await apiCustomer(`/customers/me/addresses/${addressId}`, {
    method: "DELETE",
  });
  if (CURRENT_CUSTOMER) CURRENT_CUSTOMER.addresses = addresses;
  return { addresses };
}
async function setDefaultCustomerAddress(customerId, addressId) {
  return updateCustomerAddress(customerId, addressId, { isDefault: true });
}

/* ---- order history + cancellation ---- */
async function refreshCustomerOrders() {
  if (!getCustomerToken()) {
    CUSTOMER_ORDERS = [];
    return CUSTOMER_ORDERS;
  }
  CUSTOMER_ORDERS = await apiCustomer("/orders/mine");
  return CUSTOMER_ORDERS;
}
function getCustomerOrders(customerId) {
  return CUSTOMER_ORDERS;
}

// Same pattern as CUSTOMER_ORDERS above, for the logged-in customer's
// own pre-order requests (see the Pre-order History card on the account
// page's Orders tab).
let CUSTOMER_PREORDERS = [];
async function refreshCustomerPreOrders() {
  if (!getCustomerToken()) {
    CUSTOMER_PREORDERS = [];
    return CUSTOMER_PREORDERS;
  }
  CUSTOMER_PREORDERS = await apiCustomer("/preorders/mine");
  return CUSTOMER_PREORDERS;
}
function getCustomerPreOrders(customerId) {
  return CUSTOMER_PREORDERS;
}
async function requestOrderCancellation(orderId, customerId) {
  try {
    const order = await apiCustomer(`/orders/${orderId}/cancel-request`, {
      method: "POST",
    });
    const idx = CUSTOMER_ORDERS.findIndex(
      (o) => String(o.id) === String(orderId),
    );
    if (idx !== -1) CUSTOMER_ORDERS[idx] = order;
    return { order };
  } catch (err) {
    return { error: err.message };
  }
}

/* ---- admin: customers list + promote/demote/remove ---- */
async function loadCustomers() {
  const result = await apiAdmin("/customers");
  CUSTOMERS = result.customers;
  return CUSTOMERS;
}
async function updateCustomerRole(id, role) {
  const updated = await apiAdmin(`/customers/${id}/role`, {
    method: "PATCH",
    body: { role },
  });
  const idx = CUSTOMERS.findIndex((c) => String(c.id) === String(id));
  if (idx !== -1) CUSTOMERS[idx] = updated;
  return updated;
}
async function deleteCustomer(id) {
  await apiAdmin(`/customers/${id}`, { method: "DELETE" });
  CUSTOMERS = CUSTOMERS.filter((c) => String(c.id) !== String(id));
}

/* ===================================================
   PRODUCT REVIEWS
=================================================== */
let PRODUCT_REVIEWS_STORE = [];
async function loadReviews(productId) {
  const path = productId ? `/reviews?productId=${productId}` : "/reviews";
  PRODUCT_REVIEWS_STORE = await apiPublic(path);
  return PRODUCT_REVIEWS_STORE;
}
function getReviewsForProduct(productId) {
  return PRODUCT_REVIEWS_STORE.filter(
    (r) => String(r.product) === String(productId),
  );
}
/* Real average rating + review count for a product, computed from
   actual reviews in PRODUCT_REVIEWS_STORE — never a hardcoded
   placeholder. Returns { avg: 0, count: 0 } for a product with no
   reviews yet; callers should show a "New" state rather than a
   fabricated score. */
function getProductRatingStats(productId) {
  const list = getReviewsForProduct(productId);
  if (!list.length) return { avg: 0, count: 0 };
  const sum = list.reduce((acc, r) => acc + r.rating, 0);
  return { avg: Math.round((sum / list.length) * 10) / 10, count: list.length };
}
async function addReview(review) {
  const created = await apiPublic("/reviews", {
    method: "POST",
    body: {
      product: review.productId,
      name: review.name,
      rating: review.rating,
      title: review.title,
      text: review.text,
      image: review.image || "",
    },
  });
  PRODUCT_REVIEWS_STORE.unshift(created);
  return created;
}
// Uploads a "Write a Review" photo straight to Cloudinary (folder
// "reviews") and returns its URL, same shape as uploadImage() above —
// but public/no-token, since a reviewer isn't logged in.
async function uploadReviewImage(file) {
  const fd = new FormData();
  fd.append("image", file);
  const result = await apiPublic("/reviews/upload-image", {
    method: "POST",
    body: fd,
    isFormData: true,
  });
  return result.url;
}
async function deleteReview(id) {
  await apiAdmin(`/reviews/${id}`, { method: "DELETE" });
  PRODUCT_REVIEWS_STORE = PRODUCT_REVIEWS_STORE.filter(
    (r) => String(r.id) !== String(id),
  );
}

/* ===================================================
   HERO SLIDES
=================================================== */
let HERO_SLIDES = [];
async function loadHeroSlides() {
  HERO_SLIDES = await apiPublic("/hero-slides");
  return HERO_SLIDES;
}
async function addHeroSlide(slide) {
  const created = await apiAdmin("/hero-slides", {
    method: "POST",
    body: slide,
  });
  HERO_SLIDES.push(created);
  return created;
}
async function updateHeroSlide(id, patch) {
  const updated = await apiAdmin(`/hero-slides/${id}`, {
    method: "PUT",
    body: patch,
  });
  HERO_SLIDES = HERO_SLIDES.map((s) =>
    String(s.id) === String(id) ? updated : s,
  );
  return updated;
}
async function deleteHeroSlide(id) {
  await apiAdmin(`/hero-slides/${id}`, { method: "DELETE" });
  HERO_SLIDES = HERO_SLIDES.filter((s) => String(s.id) !== String(id));
}

/* ===================================================
   OFFER POPUP BANNERS
=================================================== */
let OFFER_BANNERS = [];
async function loadOfferBanners(all = false) {
  OFFER_BANNERS = await apiPublic(`/offer-banners${all ? "?all=1" : ""}`);
  return OFFER_BANNERS;
}
async function addOfferBanner(banner) {
  const created = await apiAdmin("/offer-banners", {
    method: "POST",
    body: banner,
  });
  OFFER_BANNERS.push(created);
  return created;
}
async function updateOfferBanner(id, changes) {
  const updated = await apiAdmin(`/offer-banners/${id}`, {
    method: "PUT",
    body: changes,
  });
  const idx = OFFER_BANNERS.findIndex((b) => String(b.id) === String(id));
  if (idx !== -1) OFFER_BANNERS[idx] = updated;
  return updated;
}
async function deleteOfferBanner(id) {
  await apiAdmin(`/offer-banners/${id}`, { method: "DELETE" });
  OFFER_BANNERS = OFFER_BANNERS.filter((b) => String(b.id) !== String(id));
}

/* ===================================================
   COUPONS
=================================================== */
let COUPONS = [];
async function loadCoupons() {
  COUPONS = await apiAdmin("/coupons");
  return COUPONS;
}
async function addCoupon(coupon) {
  const created = await apiAdmin("/coupons", { method: "POST", body: coupon });
  COUPONS.unshift(created);
  return created;
}
async function updateCoupon(id, changes) {
  const updated = await apiAdmin(`/coupons/${id}`, {
    method: "PUT",
    body: changes,
  });
  const idx = COUPONS.findIndex((c) => String(c.id) === String(id));
  if (idx !== -1) COUPONS[idx] = updated;
  return updated;
}
async function deleteCoupon(id) {
  await apiAdmin(`/coupons/${id}`, { method: "DELETE" });
  COUPONS = COUPONS.filter((c) => String(c.id) !== String(id));
}
function findCouponByCode(code) {
  const needle = String(code || "")
    .trim()
    .toLowerCase();
  return COUPONS.find((c) => c.code.toLowerCase() === needle) || null;
}
// Public — checkout calls this to check/apply a code. Hits the backend
// directly, so it works even without the admin-only /coupons list loaded.
async function validateCoupon(code, subtotal) {
  try {
    const { coupon, discount } = await apiPublic("/coupons/validate", {
      method: "POST",
      body: { code, subtotal },
    });
    return { ok: true, coupon, discount };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/* ===================================================
   OFFER COUNTDOWN BAR
=================================================== */
let OFFER_TIMER = {
  active: false,
  title: "",
  subtitle: "",
  endsAt: "",
  coupon: null,
};
async function loadOfferTimer() {
  OFFER_TIMER = await apiPublic("/offer-timer");
  return OFFER_TIMER;
}
async function saveOfferTimer(timer) {
  OFFER_TIMER = await apiAdmin("/offer-timer", {
    method: "PUT",
    body: {
      active: timer.active,
      title: timer.title,
      subtitle: timer.subtitle,
      endsAt: timer.endsAt,
      coupon: timer.couponId || timer.coupon || null,
    },
  });
  return OFFER_TIMER;
}

/* ===================================================
   VISIT COUNTER (real, server-side)
=================================================== */
const SS_VISITED_THIS_SESSION = "kivix_visited_session";
let VISIT_COUNT = 0;
function paintVisitCount() {
  document.querySelectorAll("[data-visit-count]").forEach((el) => {
    el.textContent = VISIT_COUNT.toLocaleString("en-US");
  });
}
async function trackVisit() {
  try {
    let result;
    if (sessionStorage.getItem(SS_VISITED_THIS_SESSION)) {
      result = await apiPublic("/stats/visits");
    } else {
      sessionStorage.setItem(SS_VISITED_THIS_SESSION, "1");
      result = await apiPublic("/stats/visits", { method: "POST" });
    }
    VISIT_COUNT = result.count;
    paintVisitCount();
  } catch (e) {
    /* non-critical — leave the counter at its last known value */
  }
  return VISIT_COUNT;
}
function getVisitCount() {
  return VISIT_COUNT;
}

/* ===================================================
   PAGE BOOTSTRAP
   Every storefront page needs the logged-in customer's
   session (for the header's account icon) and the product
   catalog (for search + the wishlist drawer's "Add to Cart",
   both of which can be triggered from any page) ready before
   it renders anything. Every other script on the page
   (cart.js, header.js, auth.js, offer-popup.js,
   offer-timer-bar.js, and each page's own script) awaits this
   same promise at the top of its DOMContentLoaded handler.
=================================================== */
const KIVIX_READY = (async () => {
  await Promise.all([
    bootstrapCustomerSession(),
    // If the API is unreachable (backend down, CORS misconfigured, no
    // internet) this used to reject the whole Promise.all — which meant
    // every page's `await KIVIX_READY` threw, and NOTHING after it ever
    // ran: no nav toggle, no hero slideshow, no product grid. Catching
    // it here means the page still renders (with an empty catalog and
    // the hero's built-in fallback slides) instead of going blank.
    loadProducts().catch(() => []),
    // Every review, across all products — needed up front so product
    // cards can show a real average rating instead of a placeholder.
    loadReviews().catch(() => []),
  ]);
  trackVisit(); // fire-and-forget — paints itself in when it resolves
})();

/* ===================================================
   IMAGE LIGHTBOX
   One shared full-screen viewer for any thumbnail across
   the site (review photos on the home page and on a
   product's details page). Built + styled here in data.js,
   which every page already loads, so no page needs its own
   copy or its own <div>/CSS for it.
   Usage: give a thumbnail data-lightbox-img="<url>" (plus an
   optional data-lightbox-alt) and call
   enableImageLightbox(containerEl) once on the container it
   lives in — a single delegated click listener handles every
   thumbnail inside, present now or added later by a re-render.
=================================================== */
let _lightboxEl = null;
function _ensureLightbox() {
  if (_lightboxEl) return _lightboxEl;
  const overlay = document.createElement("div");
  overlay.className = "kivix-lightbox-overlay";
  overlay.innerHTML = `
    <button type="button" class="kivix-lightbox-close" aria-label="Close">&times;</button>
    <img class="kivix-lightbox-img" alt="" />`;
  document.body.appendChild(overlay);
  const closeIt = () => overlay.classList.remove("show");
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.closest(".kivix-lightbox-close")) {
      closeIt();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeIt();
  });
  _lightboxEl = overlay;
  return overlay;
}
function openImageLightbox(url, alt) {
  if (!url) return;
  const overlay = _ensureLightbox();
  const img = overlay.querySelector(".kivix-lightbox-img");
  img.src = url;
  img.alt = alt || "";
  overlay.classList.add("show");
}
function enableImageLightbox(container) {
  if (!container || container._lightboxBound) return;
  container._lightboxBound = true;
  container.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-lightbox-img]");
    if (!trigger) return;
    openImageLightbox(
      trigger.dataset.lightboxImg,
      trigger.dataset.lightboxAlt || "",
    );
  });
}
// Inject the lightbox's CSS once, straight from JS, so pages don't each
// need their own stylesheet rule for it.
(function injectLightboxStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .kivix-lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 15, 15, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease;
    }
    .kivix-lightbox-overlay.show {
      opacity: 1;
      visibility: visible;
    }
    .kivix-lightbox-img {
      max-width: 90vw;
      max-height: 90vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    }
    .kivix-lightbox-close {
      position: absolute;
      top: 20px;
      right: 28px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
    }
    .kivix-lightbox-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;
  document.head.appendChild(style);
})();
