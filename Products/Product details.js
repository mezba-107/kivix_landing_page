/* ===================================================
   KI-VIX SNEAKERS — PRODUCT DETAILS PAGE ONLY
   Independent from script.js and products.js —
   editing this file will not affect the other two pages.
   Requires: data.js (PRODUCTS, CART, getProductById, formatBDT,
             addToCart, getCartCount, getCartTotal, updateCartQty,
             removeFromCart)
=================================================== */

/* ---------- product card markup (used for "You may also like") ---------- */
function starRowSVG(count = 5) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>`;
  }
  return out;
}

function productCardHTML(p) {
  const outOfStock = isProductOutOfStock(p);
  const badge = p.discount ? `<span class="badge">-${p.discount}%</span>` : "";
  const old = p.oldPrice
    ? `<span class="old-price">${formatBDT(p.oldPrice)}</span>`
    : "";
  const { avg, count } = getProductRatingStats(p.id);
  const ratingRowHTML = count
    ? `<div class="rating-row">
          <div class="stars">${starRowSVG(5)}</div>
          <span class="rating-value">${avg.toFixed(1)} (${count})</span>
        </div>`
    : `<div class="rating-row">
          <div class="stars no-rating">${starRowSVG(5)}</div>
          <span class="rating-value">New</span>
        </div>`;
  return `
    <a class="product-card${outOfStock ? " out-of-stock" : ""}" href="/Products/Product%20details.html?id=${p.id}" data-id="${p.id}">
      ${badge}
      ${outOfStock ? `<span class="stock-badge">Stock Out</span>` : ""}
      <button type="button" class="wishlist-btn${isInWishlist(p.id) ? " active" : ""}" data-wishlist-toggle="${p.id}" aria-label="Save ${p.name}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      </button>
      <div class="thumb">
        ${productCardThumbHTML(p, "0 0 300 180")}
      </div>
      <div class="card-body">
        <span class="brand-tag">${p.brand || ""}</span>
        <h3>${p.name}</h3>
        ${ratingRowHTML}
        <div class="price-row">
          <span class="price">${formatBDT(p.price)}</span>
          ${old}
        </div>
        <div class="card-actions">
          <button type="button" class="add-to-cart-btn" data-quick-add="${p.id}" aria-label="Add ${p.name} to cart"${outOfStock ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
            ${outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <button type="button" class="buy-now-btn" data-buy-now-card="${p.id}" aria-label="Buy ${p.name} now"${outOfStock ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>
            Buy Now
          </button>
        </div>
      </div>
    </a>`;
}

function renderGrid(targetSelector, list) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  el.innerHTML = list.map((p) => productCardHTML(p)).join("");
}

/* ---------- mobile nav toggle ---------- */
function initNavToggle() {
  const btn = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (!btn || !nav) return;
  btn.addEventListener("click", () => {
    const open = nav.classList.toggle("open-mobile");
    if (open) {
      nav.style.cssText =
        "display:flex;position:absolute;top:64px;left:0;right:0;background:#000;flex-direction:column;padding:16px 24px;gap:16px;border-top:1px solid #222;";
    } else {
      nav.style.cssText = "";
    }
  });
}

/* ===================================================
   Customer reviews (summary card + sortable list)
   Reviews are stored per-product in data.js
   (PRODUCT_REVIEWS_STORE / getReviewsForProduct / addReview)
   so a review written here shows up instantly in the
   admin Reviews page, filed under this exact product.
=================================================== */
function reviewWithDaysAgo(r) {
  const daysAgo = r.createdAt
    ? (Date.now() - new Date(r.createdAt).getTime()) / 86400000
    : 0;
  return { ...r, daysAgo };
}

function computeReviewStats(reviews) {
  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const average = total ? sum / total : 0;
  const counts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length,
  );
  return { total, average: Math.round(average * 10) / 10, counts };
}

function reviewBarsHTML(stats) {
  return [5, 4, 3, 2, 1]
    .map((star, i) => {
      const count = stats.counts[i];
      const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
      return `
        <div class="review-bar-row">
          <span class="review-bar-label">${star} <svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6L12 2z"/></svg></span>
          <div class="review-bar-track"><div class="review-bar-fill" style="width:${pct}%"></div></div>
          <span class="review-bar-count">${count}</span>
        </div>`;
    })
    .join("");
}

function pdpReviewCardHTML(r, index, visibleCount) {
  const verifiedTag = r.verified
    ? `<span class="verified-tag">Verified</span>`
    : "";
  const extraClass = index >= visibleCount ? " is-extra" : "";
  const timeLabel =
    r.daysAgo < 1
      ? "Just now"
      : r.daysAgo < 7
        ? `${r.daysAgo} day${r.daysAgo === 1 ? "" : "s"} ago`
        : r.daysAgo < 30
          ? `${Math.round(r.daysAgo / 7)} week${Math.round(r.daysAgo / 7) === 1 ? "" : "s"} ago`
          : `${Math.round(r.daysAgo / 30)} month${Math.round(r.daysAgo / 30) === 1 ? "" : "s"} ago`;
  return `
    <div class="pdp-review-card${extraClass}">
      <div class="pdp-review-top">
        <div class="pdp-review-avatar">${escapeHTML(r.name.trim().charAt(0).toUpperCase())}</div>
        <div class="pdp-review-who">
          <div class="pdp-review-name-row">
            <h4>${escapeHTML(r.name)}</h4>
            ${verifiedTag}
          </div>
          <div class="review-stars">${starRowSVG(r.rating)}${
            r.rating < 5
              ? `<span class="star-dim">${starRowSVG(5 - r.rating)}</span>`
              : ""
          }</div>
        </div>
        <span class="pdp-review-time">${timeLabel}</span>
      </div>
      <h5 class="pdp-review-title">${escapeHTML(r.title)}</h5>
      <p class="pdp-review-text">${escapeHTML(r.text)}</p>
      ${
        r.image
          ? `<div class="pdp-review-photo"><img src="${escapeHTML(r.image)}" alt="Photo from ${escapeHTML(r.name)}'s review" loading="lazy" data-lightbox-img="${escapeHTML(r.image)}" data-lightbox-alt="Photo from ${escapeHTML(r.name)}'s review" /></div>`
          : ""
      }
    </div>`;
}

const PDP_REVIEWS_VISIBLE_COUNT = 5;

function renderReviewsSection(productId) {
  const summaryWrap = document.querySelector("[data-review-summary]");
  const listWrap = document.querySelector("[data-review-list]");
  const sortSelect = document.querySelector("[data-reviews-sort]");
  const writeBtn = document.querySelector("[data-write-review]");
  const moreWrap = document.querySelector("[data-reviews-more]");
  const moreBtn = document.querySelector("[data-reviews-toggle]");
  const moreLabel = document.querySelector("[data-reviews-toggle-label]");
  if (!summaryWrap || !listWrap) return;

  let expanded = false;

  function currentReviews() {
    return getReviewsForProduct(productId).map(reviewWithDaysAgo);
  }

  function paintSummary() {
    const stats = computeReviewStats(currentReviews());
    summaryWrap.innerHTML = `
      <div class="reviews-score">
        <span class="score-value">${stats.average}</span>
        <div class="review-stars">${starRowSVG(Math.round(stats.average))}</div>
        <span class="score-count">${stats.total} reviews</span>
      </div>
      <div class="reviews-bars">${reviewBarsHTML(stats)}</div>`;
  }

  function paintList(sortMode) {
    const list = currentReviews();
    if (sortMode === "highest") list.sort((a, b) => b.rating - a.rating);
    else if (sortMode === "lowest") list.sort((a, b) => a.rating - b.rating);
    else list.sort((a, b) => a.daysAgo - b.daysAgo);
    listWrap.innerHTML = list
      .map((r, i) => pdpReviewCardHTML(r, i, PDP_REVIEWS_VISIBLE_COUNT))
      .join("");
    enableImageLightbox(listWrap);
    listWrap.querySelectorAll(".pdp-review-card.is-extra").forEach((card) => {
      card.classList.toggle("show", expanded);
    });
    if (moreWrap) {
      moreWrap.style.display =
        list.length > PDP_REVIEWS_VISIBLE_COUNT ? "" : "none";
    }
  }

  paintSummary();
  paintList("newest");

  sortSelect?.addEventListener("change", () => paintList(sortSelect.value));

  moreBtn?.addEventListener("click", () => {
    expanded = !expanded;
    listWrap.querySelectorAll(".pdp-review-card.is-extra").forEach((card) => {
      card.classList.toggle("show", expanded);
    });
    moreBtn.classList.toggle("is-open", expanded);
    if (moreLabel) {
      moreLabel.textContent = expanded ? "Show Less" : "View More Reviews";
    }
  });

  /* ---- Write a Review form ---- */
  const formWrap = document.querySelector("[data-write-review-form]");
  const starPicker = document.querySelector("[data-wr-stars]");
  const nameInput = document.querySelector("[data-wr-name]");
  const titleInput = document.querySelector("[data-wr-title]");
  const textInput = document.querySelector("[data-wr-text]");
  const submitBtn = document.querySelector("[data-wr-submit]");
  const cancelBtn = document.querySelector("[data-wr-cancel]");
  const photoInput = document.querySelector("[data-wr-photo-input]");
  const photoLabel = document.querySelector("[data-wr-photo-label]");
  const photoLabelText = document.querySelector("[data-wr-photo-label-text]");
  const photoPreview = document.querySelector("[data-wr-photo-preview]");
  const photoPreviewImg = document.querySelector("[data-wr-photo-img]");
  const photoRemoveBtn = document.querySelector("[data-wr-photo-remove]");
  let selectedRating = 0;
  let selectedPhotoFile = null;

  function resetPhotoPicker() {
    selectedPhotoFile = null;
    if (photoInput) photoInput.value = "";
    if (photoPreview) photoPreview.hidden = true;
    if (photoPreviewImg) photoPreviewImg.src = "";
    if (photoLabel) photoLabel.hidden = false;
  }

  photoInput?.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file");
      resetPhotoPicker();
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      showToast("Image is too large — please choose one under 30MB");
      resetPhotoPicker();
      return;
    }
    selectedPhotoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      if (photoPreviewImg) photoPreviewImg.src = reader.result;
      if (photoPreview) photoPreview.hidden = false;
      if (photoLabel) photoLabel.hidden = true;
    };
    reader.readAsDataURL(file);
  });

  photoRemoveBtn?.addEventListener("click", () => resetPhotoPicker());

  function paintStars(hoverValue) {
    if (!starPicker) return;
    const value = hoverValue || selectedRating;
    starPicker.querySelectorAll("[data-star-value]").forEach((btn) => {
      btn.classList.toggle("filled", Number(btn.dataset.starValue) <= value);
    });
  }

  starPicker?.querySelectorAll("[data-star-value]").forEach((btn) => {
    btn.addEventListener("mouseenter", () =>
      paintStars(Number(btn.dataset.starValue)),
    );
    btn.addEventListener("mouseleave", () => paintStars());
    btn.addEventListener("click", () => {
      selectedRating = Number(btn.dataset.starValue);
      paintStars();
    });
  });

  writeBtn?.addEventListener("click", () => {
    if (!formWrap) return;
    if (formWrap.hasAttribute("hidden")) {
      formWrap.removeAttribute("hidden");
      formWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      formWrap.setAttribute("hidden", "");
    }
  });

  cancelBtn?.addEventListener("click", () => {
    formWrap?.setAttribute("hidden", "");
    resetPhotoPicker();
  });

  submitBtn?.addEventListener("click", async () => {
    if (!selectedRating) {
      showToast("Please select a star rating");
      return;
    }
    const text = textInput?.value.trim();
    if (!text) {
      showToast("Please write a few words about the product");
      return;
    }
    const name = nameInput?.value.trim() || "Anonymous";
    const title = titleInput?.value.trim() || "Great Product Experience";

    submitBtn.disabled = true;
    try {
      let image = "";
      if (selectedPhotoFile) {
        try {
          image = await uploadReviewImage(selectedPhotoFile);
        } catch (err) {
          showToast(err.message || "Couldn't upload that photo");
          submitBtn.disabled = false;
          return;
        }
      }
      await addReview({
        productId,
        name,
        verified: false,
        rating: selectedRating,
        title,
        text,
        image,
      });
    } catch (err) {
      showToast(err.message || "Couldn't post your review");
      submitBtn.disabled = false;
      return;
    }
    submitBtn.disabled = false;

    paintSummary();
    if (sortSelect) sortSelect.value = "newest";
    paintList("newest");

    formWrap?.setAttribute("hidden", "");
    if (nameInput) nameInput.value = "";
    if (titleInput) titleInput.value = "";
    if (textInput) textInput.value = "";
    selectedRating = 0;
    paintStars();
    resetPhotoPicker();
    showToast("Thanks! Your review has been posted.");
  });
}

/* ===================================================
   Product details rendering
=================================================== */
(async function () {
  await KIVIX_READY;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const product = getProductById(id) || PRODUCTS[0];
  if (!product) {
    const root = document.querySelector("[data-pdp]");
    if (root) root.innerHTML = "<p>Product not found.</p>";
    return;
  }

  const productOutOfStock = isProductOutOfStock(product);
  let qty = 1;
  let selectedSize = isSizeOutOfStock(product, product.defaultSize)
    ? firstAvailableSize(product)
    : product.defaultSize;

  // If the admin uploaded a main image and/or gallery images for this
  // product, show those as the gallery. Otherwise fall back to the
  // built-in tone-based placeholder views.
  const uploadedImages = [product.image, ...(product.gallery || [])].filter(
    Boolean,
  );
  const usingImages = uploadedImages.length > 0;
  const views = usingImages
    ? uploadedImages
    : [product.tone, "#000000", "#555555", "#F6F6F6"];

  function renderThumbs() {
    return `
      <div class="pdp-thumbs" data-thumbs>
        ${views
          .map(
            (view, i) => `
          <button class="pdp-thumb ${i === 0 ? "active" : ""}" data-thumb-index="${i}" aria-label="View ${i + 1}">
            ${
              usingImages
                ? `<img src="${view}" alt="${product.name} photo ${i + 1}" style="width:100%;height:100%;object-fit:cover;" />`
                : sneakerSVG(view, "0 0 120 80")
            }
          </button>
        `,
          )
          .join("")}
      </div>`;
  }

  function renderMain(index = 0) {
    const inner = usingImages
      ? `<img src="${views[index]}" alt="${product.name}" />`
      : sneakerSVG(views[index], "0 0 320 200");
    return `<div class="pdp-main" data-main>${inner}</div>`;
  }

  function renderInfo() {
    const badge = product.discount
      ? `<span class="badge">-${product.discount}%</span>`
      : "";
    const old = product.oldPrice
      ? `<span class="old-price">${formatBDT(product.oldPrice)}</span>`
      : "";
    const outOfStockBadge = productOutOfStock
      ? `<span class="badge" style="background:var(--ink)">Stock Out</span>`
      : "";
    return `
      <div class="pdp-info">
        <p class="eyebrow" style="color:var(--red)">${product.tag || product.brand}</p>
        <h1>${product.name}</h1>
        <div class="pdp-price">${formatBDT(product.price)}${old}${badge}${outOfStockBadge}</div>
        <p class="pdp-desc">${product.description}</p>

        <ul class="pdp-features">
          ${product.features
            .map(
              (f) => `
            <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${f}</li>
          `,
            )
            .join("")}
        </ul>

        <div class="pdp-block">
          <span class="label">Size</span>
          <div class="size-row" data-sizes>
            ${product.sizes
              .map((s) => {
                const soldOut = isSizeOutOfStock(product, s);
                // Once the whole product is out of stock, size buttons stay
                // selectable (just visually marked) so the customer can still
                // choose which size to pre-order.
                const shouldDisable = soldOut && !productOutOfStock;
                return `<button class="size-btn ${s === selectedSize ? "active" : ""}${soldOut ? " out-of-stock" : ""}" data-size="${s}"${shouldDisable ? " disabled" : ""} title="${soldOut ? "Stock Out" : ""}">${s}</button>`;
              })
              .join("")}
          </div>
        </div>

        <div class="pdp-block">
          <span class="label">Quantity</span>
          <div class="qty-row" data-qty>
            <button data-qty-minus aria-label="Decrease quantity">−</button>
            <span class="qty-value" data-qty-value>1</span>
            <button data-qty-plus aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div class="pdp-actions">
          ${
            productOutOfStock
              ? `<button class="btn btn-primary" data-preorder style="width:100%">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            Pre-order this item
          </button>`
              : `<button class="btn btn-primary" data-add-cart>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
            Add to Cart
          </button>
          <button class="btn btn-secondary" data-buy-now>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>
            Buy Now
          </button>`
          }
        </div>

        ${
          productOutOfStock
            ? `<p class="small" style="color:var(--text-2);margin-top:-10px">This item is currently out of stock. Place a pre-order and we'll contact you as soon as it's back.</p>`
            : ""
        }

        <div class="pdp-trust">
          <div class="trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg><span class="small">Cash on Delivery<br>Pay when you receive</span></div>
          <div class="trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="6" width="14" height="11"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg><span class="small">All over Bangladesh<br>Delivery</span></div>
          <div class="trust-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M9 13.5 7 22l5-3 5 3-2-8.5"/></svg><span class="small">100% Premium<br>Quality Product</span></div>
          <!-- 24/7 Customer Support -->
<div class="trust-item">
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M3 13a9 9 0 0 1 18 0" />
    <path d="M21 13v5a2 2 0 0 1-2 2h-1" />
    <rect x="3" y="13" width="4" height="6" rx="1" />
    <rect x="17" y="13" width="4" height="6" rx="1" />
  </svg>
  <span class="small">24/7 Customer<br />Support</span>
</div>
<!-- Secure Checkout -->
<div class="trust-item">
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
  <span class="small">Secure<br />Checkout</span>
</div>

        </div>
      </div>`;
  }

  function mount() {
    document.title = `${product.name} — KI-VIX Sneakers`;
    document.querySelector("[data-crumb-name]").textContent = product.name;

    const root = document.querySelector("[data-pdp]");
    root.innerHTML = renderThumbs() + renderMain(0) + renderInfo();
    bindEvents();
  }

  function bindEvents() {
    document.querySelectorAll("[data-thumb-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll("[data-thumb-index]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelector("[data-main]").outerHTML = renderMain(
          Number(btn.dataset.thumbIndex),
        );
      });
    });

    document.querySelectorAll("[data-size]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        selectedSize = Number(btn.dataset.size);
        document
          .querySelectorAll("[data-size]")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        qty = 1;
        document.querySelector("[data-qty-value]").textContent = qty;
      });
    });

    function remainingStock() {
      // Once the product is fully out of stock, quantity is just how
      // many the customer wants to pre-order — not gated by (zero) stock.
      if (productOutOfStock) return Infinity;
      const s = getSizeStock(product, selectedSize);
      return s === null ? Infinity : s;
    }

    const qtyValue = document.querySelector("[data-qty-value]");
    document.querySelector("[data-qty-minus]").addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyValue.textContent = qty;
    });
    document.querySelector("[data-qty-plus]").addEventListener("click", () => {
      qty = Math.min(10, remainingStock(), qty + 1);
      qtyValue.textContent = qty;
    });

    const addCartBtn = document.querySelector("[data-add-cart]");
    if (addCartBtn) {
      addCartBtn.addEventListener("click", () => {
        if (isSizeOutOfStock(product, selectedSize)) {
          showToast(`Size ${selectedSize} is out of stock`);
          return;
        }
        const cappedQty = Math.min(qty, remainingStock());
        addToCart(product, selectedSize, cappedQty);
        showToast(`Added ${product.name} (size ${selectedSize}) to cart`);
        openCartDrawer();
      });
    }

    const buyNowBtn = document.querySelector("[data-buy-now]");
    if (buyNowBtn) {
      buyNowBtn.addEventListener("click", () => {
        if (isSizeOutOfStock(product, selectedSize)) {
          showToast(`Size ${selectedSize} is out of stock`);
          return;
        }
        const cappedQty = Math.min(qty, remainingStock());
        addToCart(product, selectedSize, cappedQty);
        window.location.href = "/Checkout/checkout.html";
      });
    }

    const preorderBtn = document.querySelector("[data-preorder]");
    if (preorderBtn) {
      preorderBtn.addEventListener("click", () => {
        openPreOrderModal(product, selectedSize, qty);
      });
    }
  }

  /* ---------- Pre-order modal (shown when the product is stock-out) ---------- */
  function openPreOrderModal(product, size, qty) {
    const customer = getCurrentCustomer ? getCurrentCustomer() : null;
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-modal preorder-modal" role="dialog" aria-modal="true" aria-label="Pre-order ${escapeHTML(product.name)}">
        <h3>Pre-order this item</h3>
        <p>${escapeHTML(product.name)}${size ? ` &middot; Size ${escapeHTML(String(size))}` : ""} &middot; Qty ${qty}<br>We'll contact you as soon as it's back in stock.</p>
        <form data-preorder-form>
          <label class="field field-full">
            <span>Full Name *</span>
            <input type="text" name="customerName" required placeholder="Enter your full name" value="${escapeHTML(customer?.firstName ? `${customer.firstName} ${customer.lastName || ""}`.trim() : customer?.name || "")}">
          </label>
          <label class="field field-full">
            <span>Phone Number *</span>
            <input type="tel" name="phone" required placeholder="e.g. 01712345678" value="${escapeHTML(customer?.phone || "")}">
          </label>
          <label class="field field-full">
            <span>Email (optional)</span>
            <input type="email" name="email" placeholder="your.email@example.com" value="${escapeHTML(customer?.email || "")}">
          </label>
          <label class="field field-full">
            <span>Address (optional)</span>
            <input type="text" name="address" placeholder="Delivery address">
          </label>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn confirm-cancel" data-preorder-cancel>Cancel</button>
            <button type="submit" class="confirm-btn confirm-ok" data-preorder-submit>Request Pre-order</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    function close() {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 250);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay
      .querySelector("[data-preorder-cancel]")
      .addEventListener("click", close);

    overlay
      .querySelector("[data-preorder-form]")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector("[data-preorder-submit]");
        const fd = new FormData(form);
        const payload = {
          productId: product.id,
          size,
          qty,
          customerName: (fd.get("customerName") || "").trim(),
          phone: (fd.get("phone") || "").trim(),
          email: (fd.get("email") || "").trim(),
          address: (fd.get("address") || "").trim(),
        };
        if (!payload.customerName || !payload.phone) {
          showToast("Please fill in your name and phone number");
          return;
        }
        submitBtn.disabled = true;
        try {
          await addPreOrder(payload);
          showToast(
            "Pre-order requested — we'll contact you when it's back in stock",
          );
          close();
        } catch (err) {
          showToast(
            err.message || "Couldn't submit your pre-order — please try again",
          );
          submitBtn.disabled = false;
        }
      });
  }

  function mountRelated() {
    const related = shuffleArray(
      PRODUCTS.filter((p) => p.id !== product.id),
    ).slice(0, 3);
    renderGrid("[data-related]", related);
  }

  await loadReviews(product.id);

  function run() {
    initNavToggle();
    mount();
    mountRelated();
    renderReviewsSection(product.id);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
