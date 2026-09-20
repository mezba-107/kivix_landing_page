/* ===================================================
   KI-VIX ADMIN — Reviews
   Every review written on a product's "Write a Review"
   form is saved (per product) via the API. This page lists
   them all so the admin can see what's being said and remove
   anything inappropriate.
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const rowsEl = document.querySelector("[data-review-rows]");
  const emptyEl = document.querySelector("[data-review-empty]");
  const countEl = document.querySelector("[data-review-count]");
  const searchInput = document.querySelector("[data-review-search]");
  const productFilter = document.querySelector(
    "[data-review-product-filter]",
  );

  let query = "";
  let productId = "";

  // populate the product filter dropdown
  productFilter.innerHTML =
    `<option value="">All products</option>` +
    PRODUCTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join(
      "",
    );

  function starsLabel(rating) {
    const full = "★".repeat(rating);
    const empty = "☆".repeat(5 - rating);
    return `<span style="color:var(--red-deep);letter-spacing:1px">${full}<span style="color:var(--line)">${empty}</span></span>`;
  }

  function reviewRowHTML(r) {
    const product = getProductById(r.product);
    const date = r.createdAt
      ? new Date(r.createdAt).toLocaleDateString()
      : "—";
    return `
      <tr>
        <td data-label="Product" class="cell-name">${product ? product.name : "Deleted product"}<div class="cell-sub">ID #${String(r.product).slice(-6).toUpperCase()}</div></td>
        <td data-label="Customer">${escapeHTML(r.name)}${r.verified ? '<div class="cell-sub">Verified buyer</div>' : ""}</td>
        <td data-label="Rating">${starsLabel(r.rating)}</td>
        <td data-label="Review" style="max-width:340px">
          <div class="cell-name">${escapeHTML(r.title || "")}</div>
          <div class="cell-sub">${escapeHTML((r.text || "").slice(0, 140))}${(r.text || "").length > 140 ? "…" : ""}</div>
          ${r.image ? `<img src="${escapeHTML(r.image)}" alt="Review photo" style="width:44px;height:44px;object-fit:cover;border-radius:6px;margin-top:6px;border:1px solid var(--line);cursor:zoom-in" data-lightbox-img="${escapeHTML(r.image)}" data-lightbox-alt="Review photo" />` : ""}
        </td>
        <td data-label="Date" class="cell-sub">${date}</td>
        <td data-label="Actions">
          ${admin.role !== "Mod" ? `<button type="button" class="admin-btn-sm danger" data-remove-review="${r.id}">Delete</button>` : ""}
        </td>
      </tr>`;
  }

  function renderRows() {
    const q = query.trim().toLowerCase();
    const list = PRODUCT_REVIEWS_STORE.filter((r) => {
      if (productId && String(r.product) !== productId) return false;
      if (!q) return true;
      return (
        (r.name || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.text || "").toLowerCase().includes(q)
      );
    }).sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );

    countEl.textContent = PRODUCT_REVIEWS_STORE.length;

    if (!list.length) {
      rowsEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    rowsEl.innerHTML = list.map(reviewRowHTML).join("");
    enableImageLightbox(rowsEl);
  }

  searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    renderRows();
  });
  productFilter.addEventListener("change", (e) => {
    productId = e.target.value;
    renderRows();
  });

  rowsEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-remove-review]");
    if (!btn) return;
    if (!(await confirmDialog("Delete this review?"))) return;
    try {
      await deleteReview(btn.dataset.removeReview);
    } catch (err) {
      showToast(err.message || "Couldn't delete that review");
      return;
    }
    renderRows();
    showToast("Review deleted");
  });

  try {
    await loadReviews();
  } catch (e) {
    showToast("Couldn't load reviews");
  }
  renderRows();
})();
