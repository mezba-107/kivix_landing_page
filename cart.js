/* ===================================================
   KI-VIX SNEAKERS — SHARED CART + WISHLIST MODULE
   Used by every page (home, collection, product details,
   checkout). This is the ONLY place the cart drawer,
   wishlist drawer, toast, quick-add and buy-now logic
   lives — when the real backend is wired up, this is the
   only file that needs to change.

   Requires: data.js (CART, WISHLIST, PRODUCTS,
   getProductById, formatBDT, addToCart, updateCartQty,
   removeFromCart, getCartCount, getCartTotal,
   isInWishlist, toggleWishlist, removeFromWishlist,
   getWishlistCount)

   Optional hook: if a page defines a global
   `onCartChange()` function (e.g. checkout.js does, to
   re-render the order summary), it's called after every
   cart mutation made from these drawers.
=================================================== */

/* ---------- generic sneaker illustration (placeholder art) ---------- */
let __shoeGradId = 0;
function sneakerSVG(tone = "#1a1a1a", viewBox = "0 0 300 180") {
  const light = "#F6F6F6";
  const gid = `shoeGrad${__shoeGradId++}`;
  const gid2 = `shoeSole${__shoeGradId++}`;
  const gid3 = `shoeSheen${__shoeGradId++}`;
  return `
  <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sneaker illustration">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0.15" y2="1">
        <stop offset="0%" stop-color="${tone}" stop-opacity=".92"/>
        <stop offset="55%" stop-color="${tone}"/>
        <stop offset="100%" stop-color="${tone}" stop-opacity=".72"/>
      </linearGradient>
      <linearGradient id="${gid2}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${tone}" stop-opacity=".95"/>
        <stop offset="100%" stop-color="#000" stop-opacity=".28"/>
      </linearGradient>
      <linearGradient id="${gid3}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <ellipse cx="150" cy="166" rx="122" ry="9" fill="rgba(0,0,0,.16)"/>

    <!-- upper body -->
    <path d="M28 138c-6-10-4-24 10-30 18-8 34-20 46-34 8-9 18-15 30-16 20-2 32 10 46 18 16 9 34 12 52 14 14 1.5 24 10 24 24 0 12-9 22-22 24-46 8-124 10-160 10-10 0-19-2-26-10Z" fill="url(#${gid})"/>
    <path d="M28 138c-6-10-4-24 10-30 18-8 34-20 46-34 8-9 18-15 30-16 20-2 32 10 46 18 16 9 34 12 52 14 14 1.5 24 10 24 24" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="2"/>
    <path d="M42 106c14-9 27-19 37-31" fill="none" stroke="url(#${gid3})" stroke-width="10" stroke-linecap="round" opacity=".5"/>

    <!-- toe box / vamp panel -->
    <path d="M92 60c10 14 26 22 44 26 20 4 42 6 60 12 8 2.5 12 8 12 14H84c0-18 2-36 8-52Z" fill="${light}" opacity=".97"/>
    <path d="M92 60c10 14 26 22 44 26 20 4 42 6 60 12 8 2.5 12 8 12 14" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1.5"/>

    <!-- swoosh accent -->
    <path d="M99 69c14 12 33 18 57 22" stroke="#E30613" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M96 66c8 10 20 16 34 20" stroke="${tone}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".45"/>

    <!-- lace eyelets -->
    <circle cx="122" cy="72" r="2.6" fill="${tone}" opacity=".55"/>
    <circle cx="134" cy="78" r="2.6" fill="${tone}" opacity=".55"/>
    <circle cx="146" cy="83" r="2.6" fill="${tone}" opacity=".55"/>
    <circle cx="158" cy="87" r="2.6" fill="${tone}" opacity=".55"/>

    <!-- heel tab highlight -->
    <path d="M232 82c9 3 15 8 17 16" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none" stroke-linecap="round"/>

    <!-- midsole -->
    <rect x="28" y="138" width="244" height="12" rx="6" fill="url(#${gid2})"/>
    <rect x="28" y="138" width="244" height="4" rx="2" fill="rgba(255,255,255,.32)"/>
    <!-- tread -->
    <g stroke="rgba(0,0,0,.22)" stroke-width="2" stroke-linecap="round">
      <path d="M46 150v6"/><path d="M70 150v6"/><path d="M94 150v6"/><path d="M118 150v6"/>
      <path d="M142 150v6"/><path d="M166 150v6"/><path d="M190 150v6"/><path d="M214 150v6"/><path d="M238 150v6"/>
    </g>
  </svg>`;
}

/* ---------- product thumbnail: real uploaded image if present,
   otherwise falls back to the generated placeholder art ---------- */
function productThumbHTML(p, viewBox = "0 0 300 180", fit = "cover") {
  if (p && p.image) {
    const alt = String(p.name || "Product photo").replace(/"/g, "&quot;");
    return `<img src="${p.image}" alt="${alt}" style="width:100%;height:100%;object-fit:${fit};display:block;" />`;
  }
  return sneakerSVG(p ? p.tone : undefined, viewBox);
}

/* ---------- product-card thumbnail (grid/promo cards only) ----------
   Real product photos aren't always cropped to a clean square — some
   are tall marketing posters with their own background baked in — so
   a plain object-fit:contain leaves a mismatched-colour gap around
   the photo that reads like an ugly border. To fix that without ever
   cropping the real photo, this renders a softly blurred, scaled-up
   copy of the same image as a full-bleed backdrop behind it — the
   "blurred letterbox" treatment used by Spotify/Apple Music album
   art — so the padding around the photo always matches the photo
   itself. Requires the CSS .thumb-bg / .thumb-fg rules (style.css,
   Products/products.css, Products/Product details.css). Cart,
   checkout, admin and header thumbs stay on the simpler
   productThumbHTML above on purpose — they're small and don't need it. */
function productCardThumbHTML(p, viewBox = "0 0 300 180") {
  if (p && p.image) {
    const alt = String(p.name || "Product photo").replace(/"/g, "&quot;");
    const safeUrl = String(p.image).replace(/"/g, "&quot;");
    return `
      <div class="thumb-bg" style="background-image:url(&quot;${safeUrl}&quot;);" aria-hidden="true"></div>
      <img class="thumb-fg" src="${p.image}" alt="${alt}" />`;
  }
  return sneakerSVG(p ? p.tone : undefined, viewBox);
}

/* ---------- toast ---------- */
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector("span").textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ---------- confirm dialog (replaces window.confirm) ----------
   Usage: if (!(await confirmDialog("Delete this?"))) return;
   Resolves true on OK/Enter, false on Cancel/overlay click/Esc. */
function confirmDialog(message, opts = {}) {
  const { title = "Are you sure?", confirmText = "Yes, continue", cancelText = "Cancel", danger = true } = opts;
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal" role="alertdialog" aria-modal="true" aria-label="${title}">
        <h3>${title}</h3>
        <p>${message}</p>
        <div class="confirm-actions">
          <button type="button" class="confirm-btn confirm-cancel" data-confirm-cancel>${cancelText}</button>
          <button type="button" class="confirm-btn ${danger ? "confirm-danger" : "confirm-ok"}" data-confirm-ok>${confirmText}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    function settle(result) {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") settle(false);
      if (e.key === "Enter") settle(true);
    }
    overlay.querySelector("[data-confirm-ok]").addEventListener("click", () => settle(true));
    overlay.querySelector("[data-confirm-cancel]").addEventListener("click", () => settle(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) settle(false);
    });
    document.addEventListener("keydown", onKey);

    requestAnimationFrame(() => overlay.classList.add("show"));
    overlay.querySelector("[data-confirm-ok]").focus();
  });
}

function fireCartChange() {
  if (typeof onCartChange === "function") onCartChange();
}

/* ===================================================
   CART DRAWER
=================================================== */
function buildCartDrawer() {
  if (document.querySelector("[data-cart-overlay]")) return;

  const overlay = document.createElement("div");
  overlay.className = "cart-overlay";
  overlay.setAttribute("data-cart-overlay", "");
  overlay.innerHTML = `
    <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div class="cart-drawer-head">
        <h3>Your Cart<span class="cart-count-label" data-cart-count-label></span></h3>
        <button class="cart-close" type="button" data-cart-close aria-label="Close cart">&times;</button>
      </div>
      <div class="cart-items" data-cart-items></div>
      <div class="cart-drawer-foot" data-cart-foot></div>
    </aside>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCartDrawer();
  });
  overlay
    .querySelector("[data-cart-close]")
    .addEventListener("click", closeCartDrawer);

  document.querySelectorAll("[data-cart-toggle]").forEach((btn) => {
    btn.addEventListener("click", openCartDrawer);
  });
}

function renderCartDrawer() {
  const itemsWrap = document.querySelector("[data-cart-items]");
  const footWrap = document.querySelector("[data-cart-foot]");
  const countLabel = document.querySelector("[data-cart-count-label]");
  if (!itemsWrap) return;

  countLabel.textContent = CART.length ? `(${getCartCount()})` : "";

  if (!CART.length) {
    itemsWrap.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
        <p>Your cart is empty</p>
      </div>`;
    footWrap.innerHTML = `<button class="btn btn-secondary btn-block" type="button" data-cart-continue>Continue Shopping</button>`;
    footWrap
      .querySelector("[data-cart-continue]")
      .addEventListener("click", closeCartDrawer);
    return;
  }

  itemsWrap.innerHTML = CART.map(
    (item, i) => `
    <div class="cart-item">
      <div class="cart-item-thumb">${productThumbHTML(item)}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="cart-item-meta">Size ${item.size}</div>
        <div class="cart-item-qty">
          <button type="button" data-cart-qty-minus="${i}" aria-label="Decrease quantity">−</button>
          <span>${item.qty}</span>
          <button type="button" data-cart-qty-plus="${i}" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="cart-item-side">
        <button class="cart-item-remove" type="button" data-cart-remove="${i}" aria-label="Remove item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"/></svg>
        </button>
        <span class="cart-item-price">${formatBDT(item.price * item.qty)}</span>
      </div>
    </div>
  `,
  ).join("");

  footWrap.innerHTML = `
    <div class="cart-subtotal-row"><span>Subtotal</span><span>${formatBDT(getCartTotal())}</span></div>
    <a href="/Checkout/checkout.html" class="btn btn-primary btn-block">Checkout</a>`;

  itemsWrap.querySelectorAll("[data-cart-qty-minus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.cartQtyMinus);
      updateCartQty(i, CART[i].qty - 1);
      renderCartDrawer();
      fireCartChange();
    });
  });
  itemsWrap.querySelectorAll("[data-cart-qty-plus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.cartQtyPlus);
      updateCartQty(i, CART[i].qty + 1);
      renderCartDrawer();
      fireCartChange();
    });
  });
  itemsWrap.querySelectorAll("[data-cart-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.cartRemove));
      renderCartDrawer();
      fireCartChange();
    });
  });
}

function openCartDrawer() {
  buildCartDrawer();
  renderCartDrawer();
  document.querySelector("[data-cart-overlay]").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeCartDrawer() {
  const overlay = document.querySelector("[data-cart-overlay]");
  if (!overlay) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
}
function initCartDrawer() {
  buildCartDrawer();
}

/* ---------- quick add-to-cart (product & promo cards) ---------- */
function initQuickAdd() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-quick-add]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const product = getProductById(btn.dataset.quickAdd);
    if (!product) return;
    if (isProductOutOfStock(product)) {
      showToast(`${product.name} is out of stock`);
      return;
    }
    addToCart(product, firstAvailableSize(product), 1);
    showToast(`Added ${product.name} to cart`);
    openCartDrawer();
    fireCartChange();
  });
}

/* ---------- buy now (product & promo cards) ---------- */
function initBuyNow() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy-now-card]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const product = getProductById(btn.dataset.buyNowCard);
    if (!product) return;
    if (isProductOutOfStock(product)) {
      showToast(`${product.name} is out of stock`);
      return;
    }
    addToCart(product, firstAvailableSize(product), 1);
    window.location.href = "/Checkout/checkout.html";
  });
}

/* ===================================================
   WISHLIST DRAWER
=================================================== */
function buildWishlistDrawer() {
  if (document.querySelector("[data-wishlist-overlay]")) return;

  const overlay = document.createElement("div");
  overlay.className = "cart-overlay";
  overlay.setAttribute("data-wishlist-overlay", "");
  overlay.innerHTML = `
    <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Wishlist">
      <div class="cart-drawer-head">
        <h3>Wishlist<span class="cart-count-label" data-wishlist-count-label></span></h3>
        <button class="cart-close" type="button" data-wishlist-close aria-label="Close wishlist">&times;</button>
      </div>
      <div class="cart-items" data-wishlist-items></div>
      <div class="cart-drawer-foot" data-wishlist-foot></div>
    </aside>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeWishlistDrawer();
  });
  overlay
    .querySelector("[data-wishlist-close]")
    .addEventListener("click", closeWishlistDrawer);

  document.querySelectorAll("[data-wishlist-toggle-drawer]").forEach((btn) => {
    btn.addEventListener("click", openWishlistDrawer);
  });
}

function renderWishlistDrawer() {
  const itemsWrap = document.querySelector("[data-wishlist-items]");
  const footWrap = document.querySelector("[data-wishlist-foot]");
  const countLabel = document.querySelector("[data-wishlist-count-label]");
  if (!itemsWrap) return;

  countLabel.textContent = WISHLIST.length ? `(${getWishlistCount()})` : "";

  if (!WISHLIST.length) {
    itemsWrap.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
        <p>Your wishlist is empty</p>
      </div>`;
    footWrap.innerHTML = `<button class="btn btn-secondary btn-block" type="button" data-wishlist-continue>Continue Shopping</button>`;
    footWrap
      .querySelector("[data-wishlist-continue]")
      .addEventListener("click", closeWishlistDrawer);
    return;
  }

  itemsWrap.innerHTML = WISHLIST.map(
    (item) => `
    <div class="cart-item">
      <div class="cart-item-thumb">${productThumbHTML(item)}</div>
      <div class="cart-item-info">
        <h4>${item.name}</h4>
        <div class="cart-item-meta">${formatBDT(item.price)}</div>
        <button type="button" class="wishlist-add-btn" data-wishlist-add="${item.productId}">Add to Cart</button>
      </div>
      <div class="cart-item-side">
        <button class="cart-item-remove" type="button" data-wishlist-remove="${item.productId}" aria-label="Remove item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7"/></svg>
        </button>
      </div>
    </div>
  `,
  ).join("");

  footWrap.innerHTML = "";

  itemsWrap.querySelectorAll("[data-wishlist-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromWishlist(btn.dataset.wishlistRemove);
      syncWishlistButtons();
      renderWishlistDrawer();
    });
  });
  itemsWrap.querySelectorAll("[data-wishlist-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = getProductById(btn.dataset.wishlistAdd);
      if (!p) return;
      addToCart(p, p.defaultSize, 1);
      showToast(`Added ${p.name} to cart`);
      fireCartChange();
    });
  });
}

function openWishlistDrawer() {
  buildWishlistDrawer();
  renderWishlistDrawer();
  document.querySelector("[data-wishlist-overlay]").classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeWishlistDrawer() {
  const overlay = document.querySelector("[data-wishlist-overlay]");
  if (!overlay) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
}
function initWishlistDrawer() {
  buildWishlistDrawer();
}

function syncWishlistButtons() {
  document.querySelectorAll("[data-wishlist-toggle]").forEach((btn) => {
    btn.classList.toggle("active", isInWishlist(btn.dataset.wishlistToggle));
  });
}

function initWishlistToggle() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-wishlist-toggle]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const product = getProductById(btn.dataset.wishlistToggle);
    if (!product) return;
    const added = toggleWishlist(product);
    btn.classList.toggle("active", added);
    showToast(
      added
        ? `Added ${product.name} to wishlist`
        : `Removed ${product.name} from wishlist`,
    );
    renderWishlistDrawer();
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = getCartCount();
  });
  document.querySelectorAll("[data-wishlist-count]").forEach((el) => {
    el.textContent = getWishlistCount();
  });
  initCartDrawer();
  initWishlistDrawer();
  initQuickAdd();
  initBuyNow();
  initWishlistToggle();
});
