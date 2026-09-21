/* ===================================================
   KI-VIX SNEAKERS — PRODUCTS / COLLECTION PAGE ONLY
   Independent from script.js and Product details.js —
   editing this file will not affect the other two pages.
   Requires: data.js (PRODUCTS, CART, getProductById, formatBDT, ...)
=================================================== */

/* ---------- product card markup ---------- */
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

function renderGrid(targetSelector, list, totalMatching) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  el.innerHTML = list.map((p) => productCardHTML(p)).join("");

  const countEl = document.querySelector("[data-result-count]");
  if (countEl) {
    const total = totalMatching !== undefined ? totalMatching : PRODUCTS.length;
    countEl.textContent = `Showing ${list.length} of ${total} sneakers`;
  }
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

/* ---------- category + price filter, out-of-stock-last sort, pagination ---------- */
const PAGE_SIZE = 9;
let visibleCount = PAGE_SIZE;
let currentCategoryFilter = "all";
let currentPriceSort = "default";

function filterProducts(f) {
  if (f === "all") return PRODUCTS;
  if (f === "offers") return PRODUCTS.filter((p) => p.discount);
  return PRODUCTS.filter((p) => p.brand === f);
}

function sortByPrice(list, mode) {
  if (mode === "low-high") return [...list].sort((a, b) => a.price - b.price);
  if (mode === "high-low") return [...list].sort((a, b) => b.price - a.price);
  return list;
}

// Out-of-stock items always sink to the end of the grid, whatever
// category filter or price sort is active — applied last so it wins
// over (but doesn't undo) the price ordering above, since Array.sort
// is stable in every modern browser.
function sortOutOfStockLast(list) {
  return [...list].sort(
    (a, b) => Number(isProductOutOfStock(a)) - Number(isProductOutOfStock(b)),
  );
}

function getFilteredSortedList() {
  const byCategory = filterProducts(currentCategoryFilter);
  const priceSorted = sortByPrice(byCategory, currentPriceSort);
  return sortOutOfStockLast(priceSorted);
}

// Re-renders the grid from current filter/price/pagination state —
// call this instead of renderGrid directly whenever any of those change.
function renderProductsPage() {
  const fullList = getFilteredSortedList();
  const visible = fullList.slice(0, visibleCount);
  renderGrid("[data-grid]", visible, fullList.length);

  const viewMoreRow = document.querySelector("[data-view-more-row]");
  const viewMoreBtn = document.querySelector("[data-view-more]");
  if (viewMoreRow) viewMoreRow.hidden = fullList.length <= PAGE_SIZE;
  if (viewMoreBtn) {
    viewMoreBtn.textContent =
      visibleCount >= fullList.length ? "View Less" : "View More";
  }
}

function applyFilter(filterValue) {
  const chip = document.querySelector(
    `[data-filters] .filter-chip[data-filter="${filterValue}"]`,
  );
  if (!chip) return;
  document
    .querySelectorAll("[data-filters] .filter-chip")
    .forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentCategoryFilter = filterValue;
  visibleCount = PAGE_SIZE;
  renderProductsPage();
}

function initFilters() {
  document.querySelectorAll("[data-filters] .filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => applyFilter(chip.dataset.filter));
  });

  // Nav / footer "Offers" links point here as /Products/products.html#offers —
  // land straight on the Offers filter (discounted sneakers only) instead of
  // just scrolling to the section.
  if (window.location.hash === "#offers") {
    applyFilter("offers");
  }
}

function initPriceFilter() {
  const select = document.querySelector("[data-price-filter]");
  if (!select) return;
  select.addEventListener("change", () => {
    currentPriceSort = select.value;
    visibleCount = PAGE_SIZE;
    renderProductsPage();
  });
}

function initViewMore() {
  const btn = document.querySelector("[data-view-more]");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const fullList = getFilteredSortedList();
    if (visibleCount >= fullList.length) {
      // everything's already showing — collapse back to the first page
      visibleCount = PAGE_SIZE;
      renderProductsPage();
      document
        .querySelector("[data-grid]")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      visibleCount += PAGE_SIZE;
      renderProductsPage();
    }
  });
}

/* ---------- products page bootstrap ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  initNavToggle();

  renderProductsPage();
  initFilters();
  initPriceFilter();
  initViewMore();
});
