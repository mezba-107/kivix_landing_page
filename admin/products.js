/* ===================================================
   KI-VIX ADMIN — Products
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const rowsEl = document.querySelector("[data-product-rows]");
  const emptyEl = document.querySelector("[data-product-empty]");
  const countEl = document.querySelector("[data-product-count]");
  const searchInput = document.querySelector("[data-product-search]");

  const overlay = document.querySelector("[data-product-modal-overlay]");
  const form = document.querySelector("[data-product-form]");
  const modalTitle = document.querySelector("[data-product-modal-title]");

  const mainImageInput = document.querySelector("[data-main-image-input]");
  const mainImagePreview = document.querySelector("[data-main-image-preview]");
  const mainImageValue = document.querySelector("[data-main-image-value]");
  const removeMainImageBtn = document.querySelector("[data-remove-main-image]");
  const galleryInput = document.querySelector("[data-gallery-input]");
  const galleryGrid = document.querySelector("[data-gallery-grid]");
  const galleryValue = document.querySelector("[data-gallery-value]");

  const stockToggle = document.querySelector("[data-stock-track-toggle]");
  const stockGrid = document.querySelector("[data-stock-grid]");
  const stockValue = document.querySelector("[data-stock-value]");

  let query = "";
  let mainImage = "";
  let gallery = [];
  let stockMap = {}; // { "40": 5, "41": 0, ... } — only meaningful while tracking is on

  function renderMainImagePreview() {
    mainImageValue.value = mainImage;
    if (mainImage) {
      mainImagePreview.innerHTML = `<img src="${mainImage}" alt="Main product image" />`;
      removeMainImageBtn.hidden = false;
    } else {
      mainImagePreview.innerHTML = `<span class="admin-image-empty">No image</span>`;
      removeMainImageBtn.hidden = true;
    }
  }

  function renderGalleryPreview() {
    galleryValue.value = JSON.stringify(gallery);
    galleryGrid.innerHTML = gallery
      .map(
        (src, i) => `
      <div class="admin-gallery-thumb">
        <img src="${src}" alt="Gallery image ${i + 1}" />
        <button type="button" class="admin-gallery-remove" data-remove-gallery="${i}" aria-label="Remove image">&times;</button>
      </div>`,
      )
      .join("");
  }

  mainImageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    mainImageInput.value = "";
    if (!file) return;
    try {
      mainImage = await uploadImage(file, "products");
      renderMainImagePreview();
    } catch (err) {
      showToast(err.message || "Couldn't upload that image");
    }
  });
  removeMainImageBtn.addEventListener("click", () => {
    mainImage = "";
    renderMainImagePreview();
  });

  galleryInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    galleryInput.value = "";
    if (!files.length) return;
    const room = 8 - gallery.length;
    if (room <= 0) {
      showToast("You can add up to 8 gallery images");
      return;
    }
    const toAdd = files.slice(0, room);
    if (files.length > toAdd.length) {
      showToast(`Only added ${toAdd.length} image(s) — 8 max`);
    }
    for (const file of toAdd) {
      try {
        gallery.push(await uploadImage(file, "products"));
      } catch (err) {
        showToast(err.message || "Couldn't upload one of those images");
      }
    }
    renderGalleryPreview();
  });
  galleryGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove-gallery]");
    if (!btn) return;
    gallery.splice(Number(btn.dataset.removeGallery), 1);
    renderGalleryPreview();
  });

  /* ---------- stock per size ---------- */
  function parseSizesFromField() {
    return (form.sizes.value || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function renderStockGrid() {
    const sizes = parseSizesFromField();
    const tracking = stockToggle.checked;
    stockGrid.hidden = !tracking;
    if (!tracking || !sizes.length) {
      stockGrid.innerHTML = "";
      return;
    }
    stockGrid.innerHTML = sizes
      .map((size) => {
        const qty = stockMap[size] ?? "";
        return `
        <div class="admin-stock-item${Number(qty) === 0 ? " is-empty" : ""}" data-stock-item="${size}">
          <label>Size ${size}</label>
          <input type="number" min="0" step="1" inputmode="numeric" placeholder="0" value="${qty}" data-stock-input="${size}" />
        </div>`;
      })
      .join("");
  }

  function collectStock() {
    if (!stockToggle.checked) return null; // untracked = always available
    const sizes = parseSizesFromField();
    const stock = {};
    sizes.forEach((size) => {
      const input = stockGrid.querySelector(`[data-stock-input="${size}"]`);
      const n = input ? Number(input.value) : 0;
      stock[size] = Number.isFinite(n) && n > 0 ? n : 0;
    });
    return stock;
  }

  stockToggle.addEventListener("change", renderStockGrid);
  form.sizes.addEventListener("input", renderStockGrid);
  form.sizes.addEventListener("blur", renderStockGrid);
  stockGrid.addEventListener("input", (e) => {
    const input = e.target.closest("[data-stock-input]");
    if (!input) return;
    const size = input.dataset.stockInput;
    stockMap[size] = input.value;
    const item = input.closest("[data-stock-item]");
    if (item) item.classList.toggle("is-empty", Number(input.value) === 0);
  });

  function recalcDiscount() {
    const price = Number(form.price.value);
    const oldPrice = Number(form.oldPrice.value);
    if (oldPrice && price && oldPrice > price) {
      form.discount.value = Math.round(((oldPrice - price) / oldPrice) * 100);
    } else if (!form.oldPrice.value) {
      form.discount.value = "";
    }
  }
  form.price.addEventListener("input", recalcDiscount);
  form.oldPrice.addEventListener("input", recalcDiscount);

  function sizesWithStockHTML(p) {
    const chips = (p.sizes || []).map((s) => {
      if (!p.stock) return `<span class="admin-size-chip">${s}</span>`;
      return isSizeOutOfStock(p, s)
        ? `<span class="admin-size-chip is-out" title="Out of stock">${s}</span>`
        : `<span class="admin-size-chip">${s}<small>${getSizeStock(p, s)}</small></span>`;
    });
    return `<div class="admin-size-list">${chips.join("")}</div>`;
  }

  function renderRows() {
    const q = query.trim().toLowerCase();
    const list = PRODUCTS.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q),
    );

    countEl.textContent = PRODUCTS.length;

    if (!list.length) {
      rowsEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    rowsEl.innerHTML = list
      .map(
        (p) => `
      <tr>
        <td data-label="Product">
          <div class="admin-cell-with-thumb">
            <span class="admin-thumb">${productThumbHTML(p)}</span>
            <div>
              <div class="cell-name">${p.name}</div>
              <div class="cell-sub">ID #${String(p.id).slice(-6).toUpperCase()}</div>
            </div>
          </div>
        </td>
        <td data-label="Brand">${p.brand || ""}</td>
        <td data-label="Price" class="cell-name"><div class="admin-price-stack"><span>${formatBDT(p.price)}</span>${
          p.oldPrice
            ? `<div class="cell-sub" style="text-decoration:line-through">${formatBDT(p.oldPrice)}</div>`
            : ""
        }${p.discount ? `<div class="cell-sub" style="color:var(--red-deep);font-weight:700">-${p.discount}%</div>` : ""}</div></td>
        <td data-label="Tag"><div class="admin-tag-stack">${p.tag ? `<span class="admin-badge approved">${p.tag}</span>` : "—"}${isProductOutOfStock(p) ? `<span class="admin-badge cancelled">Stock Out</span>` : ""}</div></td>
        <td data-label="Sizes">${sizesWithStockHTML(p)}</td>
        <td data-label="Actions">
          <div class="admin-row-actions">
            <button type="button" class="admin-btn-sm" data-edit-product="${p.id}">Edit</button>
            ${admin.role !== "Mod" ? `<button type="button" class="admin-btn-sm danger" data-delete-product="${p.id}">Delete</button>` : ""}
          </div>
        </td>
      </tr>`,
      )
      .join("");
  }

  function openModal(product) {
    form.reset();
    if (product) {
      modalTitle.textContent = "Edit Product";
      form.id.value = product.id;
      form.name.value = product.name;
      form.brand.value = product.brand || "";
      form.tag.value = product.tag || "";
      form.price.value = product.price;
      form.oldPrice.value = product.oldPrice || "";
      form.discount.value = product.discount || "";
      form.tone.value = product.tone || "#1a1a1a";
      form.toneColor.value = product.tone || "#1a1a1a";
      form.description.value = product.description || "";
      form.features.value = (product.features || []).join("\n");
      form.sizes.value = (product.sizes || []).join(", ");
      form.defaultSize.value = product.defaultSize || "";
      mainImage = product.image || "";
      gallery = (product.gallery || []).slice(0, 8);
      stockToggle.checked = !!product.stock;
      stockMap = { ...(product.stock || {}) };
    } else {
      modalTitle.textContent = "Add Product";
      form.id.value = "";
      form.tone.value = "#1a1a1a";
      form.toneColor.value = "#1a1a1a";
      mainImage = "";
      gallery = [];
      stockToggle.checked = false;
      stockMap = {};
    }
    renderMainImagePreview();
    renderGalleryPreview();
    renderStockGrid();
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  document
    .querySelector("[data-open-add-product]")
    .addEventListener("click", () => openModal(null));
  document
    .querySelectorAll("[data-close-product-modal]")
    .forEach((btn) => btn.addEventListener("click", closeModal));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  form.toneColor.addEventListener("input", () => {
    form.tone.value = form.toneColor.value;
  });
  form.tone.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(form.tone.value)) {
      form.toneColor.value = form.tone.value;
    }
  });

  searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    renderRows();
  });

  rowsEl.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-product]");
    if (editBtn) {
      const product = getProductById(editBtn.dataset.editProduct);
      if (product) openModal(product);
      return;
    }
    const delBtn = e.target.closest("[data-delete-product]");
    if (delBtn) {
      const product = getProductById(delBtn.dataset.deleteProduct);
      if (!product) return;
      if (
        !(await confirmDialog(
          `Delete "${product.name}"? This can't be undone.`,
        ))
      )
        return;
      try {
        await deleteProduct(product.id);
      } catch (err) {
        showToast(err.message || "Couldn't delete that product");
        return;
      }
      renderRows();
      showToast("Product deleted");
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get("id");
    const price = Number(fd.get("price"));
    const oldPrice = fd.get("oldPrice") ? Number(fd.get("oldPrice")) : null;
    const discount = fd.get("discount")
      ? Number(fd.get("discount"))
      : oldPrice && oldPrice > price
        ? Math.round(((oldPrice - price) / oldPrice) * 100)
        : 0;
    const sizes = fd
      .get("sizes")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
    const features = fd
      .get("features")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: fd.get("name").trim(),
      brand: fd.get("brand").trim(),
      tag: fd.get("tag").trim(),
      price,
      oldPrice,
      discount,
      tone: fd.get("tone").trim() || "#1a1a1a",
      image: mainImage || "",
      gallery: gallery.slice(),
      description: fd.get("description").trim(),
      features,
      sizes,
      defaultSize: Number(fd.get("defaultSize")),
      stock: collectStock(),
    };

    try {
      if (id) {
        await updateProduct(id, payload);
        showToast("Product updated");
      } else {
        await addProduct(payload);
        showToast("Product added");
      }
    } catch (err) {
      showToast(err.message || "Couldn't save that product");
      return;
    }
    closeModal();
    renderRows();
  });

  try {
    await loadProducts();
  } catch (e) {
    showToast("Couldn't load products");
  }
  renderRows();
})();
