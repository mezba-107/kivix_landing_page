/* ===================================================
   KI-VIX ADMIN — Pre-orders
   Requests placed from a stock-out product's details page
   (see the "Pre-order this item" button in
   Products/Product details.js). Kept as a fully separate
   list from Orders — see PREORDERS / loadPreOrders in data.js.
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const rowsEl = document.querySelector("[data-preorder-rows]");
  const emptyEl = document.querySelector("[data-preorder-empty]");
  const countEl = document.querySelector("[data-preorder-count]");
  const searchInput = document.querySelector("[data-preorder-search]");
  const filterSelect = document.querySelector("[data-preorder-filter]");

  const modalOverlay = document.querySelector("[data-preorder-modal-overlay]");
  const modalBody = document.querySelector("[data-preorder-modal-body]");

  let query = "";
  let statusFilter = "";

  const STATUS_LABELS = {
    Pending: "Pending",
    Contacted: "Contacted",
    Fulfilled: "Fulfilled",
    Cancelled: "Cancelled",
  };
  // Reuses the same badge colour classes as Orders (admin.css keys off
  // these exact status words) — "Fulfilled" borrows the "done" colour.
  const STATUS_BADGE_CLASS = {
    Pending: "pending",
    Contacted: "approved",
    Fulfilled: "done",
    Cancelled: "cancelled",
  };

  function shortId(idOrPreOrder) {
    const p =
      idOrPreOrder && typeof idOrPreOrder === "object"
        ? idOrPreOrder
        : PREORDERS.find((x) => String(x.id) === String(idOrPreOrder));
    if (p && p.displayId) return p.displayId.replace(/^#/, "");
    const id = idOrPreOrder && typeof idOrPreOrder === "object" ? idOrPreOrder.id : idOrPreOrder;
    return String(id).slice(-6).toUpperCase();
  }

  function statusBadge(status) {
    const cls = STATUS_BADGE_CLASS[status] || "pending";
    const label = STATUS_LABELS[status] || status;
    return `<span class="admin-badge ${cls}">${label}</span>`;
  }

  function actionButtons(p) {
    const btns = [];
    if (p.status === "Pending") {
      btns.push(
        `<button type="button" class="admin-btn-sm approve" data-set-status="${p.id}|Contacted">Mark Contacted</button>`,
      );
      btns.push(
        `<button type="button" class="admin-btn-sm cancel" data-set-status="${p.id}|Cancelled">Cancel</button>`,
      );
    } else if (p.status === "Contacted") {
      btns.push(
        `<button type="button" class="admin-btn-sm done" data-set-status="${p.id}|Fulfilled">Mark Fulfilled</button>`,
      );
      btns.push(
        `<button type="button" class="admin-btn-sm cancel" data-set-status="${p.id}|Cancelled">Cancel</button>`,
      );
    }
    btns.push(
      `<button type="button" class="admin-btn-sm" data-view-preorder="${p.id}">View</button>`,
    );
    if (admin.role !== "Mod") {
      btns.push(
        `<button type="button" class="admin-btn-sm danger" data-delete-preorder="${p.id}">Delete</button>`,
      );
    }
    return btns.join("");
  }

  function renderRows() {
    const q = query.trim().toLowerCase();
    const list = PREORDERS.filter((p) => {
      const matchesQuery =
        !q ||
        p.customerName.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.productName || "").toLowerCase().includes(q) ||
        shortId(p.id).toLowerCase().includes(q);
      const matchesStatus = !statusFilter || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    countEl.textContent = PREORDERS.length;

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
        <td data-label="Pre-order" class="cell-name">#${shortId(p.id)}</td>
        <td data-label="Customer">
          <div class="admin-person">
            <span class="admin-person-avatar">${escapeHTML((p.customerName || "?").trim().charAt(0).toUpperCase() || "?")}</span>
            <div class="admin-person-info">
              <span class="admin-person-name">${escapeHTML(p.customerName)}</span>
              <div class="cell-sub">${escapeHTML(p.phone)}</div>
            </div>
          </div>
        </td>
        <td data-label="Product">
          <div class="cell-name">${escapeHTML(p.productName)}</div>
          <div class="cell-sub">${p.size ? `Size ${escapeHTML(String(p.size))} &middot; ` : ""}Qty ${p.qty}</div>
        </td>
        <td data-label="Price" class="cell-name">${formatBDT(p.price * p.qty)}</td>
        <td data-label="Status">${statusBadge(p.status)}</td>
        <td data-label="Date" class="cell-sub">${new Date(p.date).toLocaleDateString()}</td>
        <td data-label="Actions"><div class="admin-row-actions">${actionButtons(p)}</div></td>
      </tr>`,
      )
      .join("");
  }

  function openPreOrderModal(p) {
    modalBody.innerHTML = `
      <div class="admin-order-modal-head">
        <div>
          <div class="admin-order-modal-id">#${shortId(p.id)}</div>
          <div class="admin-order-modal-customer">${escapeHTML(p.customerName)} &middot; ${escapeHTML(p.phone)}</div>
          ${p.address ? `<div class="admin-order-modal-address">${escapeHTML(p.address)}</div>` : ""}
          ${p.email ? `<div class="admin-order-modal-note">Email: ${escapeHTML(p.email)}</div>` : ""}
        </div>
        <div>${statusBadge(p.status)}</div>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>
            <tr>
              <td data-label="Item" class="cell-name">${escapeHTML(p.productName)}</td>
              <td data-label="Size">${p.size || "—"}</td>
              <td data-label="Qty">${p.qty}</td>
              <td data-label="Price">${formatBDT(p.price * p.qty)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="summary-row total"><span>Total (est.)</span><span>${formatBDT(p.price * p.qty)}</span></div>
    `;
    modalOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closePreOrderModal() {
    modalOverlay.classList.remove("show");
    document.body.style.overflow = "";
  }
  document
    .querySelector("[data-close-preorder-modal]")
    .addEventListener("click", closePreOrderModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closePreOrderModal();
  });

  searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    renderRows();
  });
  filterSelect.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    renderRows();
  });

  rowsEl.addEventListener("click", async (e) => {
    const statusBtn = e.target.closest("[data-set-status]");
    if (statusBtn) {
      const [id, status] = statusBtn.dataset.setStatus.split("|");
      if (
        status === "Cancelled" &&
        !(await confirmDialog(`Cancel pre-order #${shortId(id)}? This can't be undone.`))
      ) {
        return;
      }
      try {
        await updatePreOrderStatus(id, status);
      } catch (err) {
        showToast(err.message || "Couldn't update this pre-order");
        return;
      }
      renderRows();
      showToast(`Pre-order #${shortId(id)} marked ${status}`);
      return;
    }
    const viewBtn = e.target.closest("[data-view-preorder]");
    if (viewBtn) {
      const p = PREORDERS.find(
        (x) => String(x.id) === viewBtn.dataset.viewPreorder,
      );
      if (p) openPreOrderModal(p);
      return;
    }
    const deleteBtn = e.target.closest("[data-delete-preorder]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.deletePreorder;
      if (
        !(await confirmDialog(`Permanently delete pre-order #${shortId(id)}? This can't be undone.`))
      )
        return;
      try {
        await deletePreOrder(id);
      } catch (err) {
        showToast(err.message || "Couldn't delete this pre-order");
        return;
      }
      renderRows();
      showToast(`Pre-order #${shortId(id)} deleted`);
    }
  });

  try {
    await loadPreOrders();
  } catch (e) {
    showToast("Couldn't load pre-orders");
  }
  renderRows();
})();
