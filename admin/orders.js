/* ===================================================
   KI-VIX ADMIN — Orders
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const rowsEl = document.querySelector("[data-order-rows]");
  const emptyEl = document.querySelector("[data-order-empty]");
  const countEl = document.querySelector("[data-order-count]");
  const searchInput = document.querySelector("[data-order-search]");
  const filterSelect = document.querySelector("[data-order-filter]");

  const modalOverlay = document.querySelector("[data-order-modal-overlay]");
  const modalBody = document.querySelector("[data-order-modal-body]");

  let query = "";
  let statusFilter = "";

  const STATUS_LABELS = {
    Pending: "Pending",
    Approved: "Approved",
    Done: "Delivered",
    Cancelled: "Cancelled",
  };

  // Real orders now carry a sequential displayId (from the backend's
  // orderNumber, e.g. "#10004") assigned in creation order — much
  // easier to scan/compare than a chunk of the random Mongo _id.
  // Accepts either a full order object or a bare id string (the id-only
  // call sites below look the order up in the shared ORDERS cache).
  function shortId(idOrOrder) {
    const order =
      idOrOrder && typeof idOrOrder === "object"
        ? idOrOrder
        : ORDERS.find((o) => String(o.id) === String(idOrOrder));
    if (order && order.displayId) return order.displayId.replace(/^#/, "");
    const id = idOrOrder && typeof idOrOrder === "object" ? idOrOrder.id : idOrOrder;
    return String(id).slice(-6).toUpperCase();
  }

  function statusBadge(status) {
    const cls = String(status || "Pending").toLowerCase();
    const label = STATUS_LABELS[status] || status;
    return `<span class="admin-badge ${cls}">${label}</span>`;
  }

  function cancelRequestTag(order) {
    if (!order.cancelRequested || order.status !== "Pending") return "";
    return `<span class="admin-badge cancelled" style="margin-left:6px">Cancel Requested</span>`;
  }

  // Shows *why* an order's total is discounted — a coupon code or the
  // loyalty "buy 5, get the 6th at 70% off" reward — right in the list,
  // so admins don't have to open every order to see if one was used.
  function discountTag(order) {
    if (order.loyaltyRewardApplied && order.loyaltyDiscount) {
      return `<div class="admin-discount-tag loyalty">🎁 Loyalty reward −${formatBDT(order.loyaltyDiscount)}</div>`;
    }
    if (order.discount) {
      return `<div class="admin-discount-tag">🏷️ ${order.couponCode || "Coupon"} −${formatBDT(order.discount)}</div>`;
    }
    return "";
  }

  function actionButtons(order) {
    const btns = [];
    if (order.status === "Pending") {
      btns.push(
        `<button type="button" class="admin-btn-sm approve" data-set-status="${order.id}|Approved">Approve</button>`,
      );
      btns.push(
        `<button type="button" class="admin-btn-sm cancel" data-set-status="${order.id}|Cancelled">Cancel</button>`,
      );
    } else if (order.status === "Approved") {
      btns.push(
        `<button type="button" class="admin-btn-sm done" data-set-status="${order.id}|Done">Mark Delivered</button>`,
      );
      btns.push(
        `<button type="button" class="admin-btn-sm cancel" data-set-status="${order.id}|Cancelled">Cancel</button>`,
      );
    }
    btns.push(
      `<button type="button" class="admin-btn-sm" data-view-order="${order.id}">View</button>`,
    );
    if (admin.role !== "Mod") {
      btns.push(
        `<button type="button" class="admin-btn-sm danger" data-delete-order="${order.id}">Delete</button>`,
      );
    }
    return btns.join("");
  }

  function renderRows() {
    const q = query.trim().toLowerCase();
    const list = ORDERS.filter((o) => {
      const matchesQuery =
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        shortId(o.id).toLowerCase().includes(q);
      const matchesStatus = !statusFilter || o.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    countEl.textContent = ORDERS.length;

    if (!list.length) {
      rowsEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;

    rowsEl.innerHTML = list
      .map(
        (o) => `
      <tr>
        <td data-label="Order" class="cell-name">#${shortId(o.id)}</td>
        <td data-label="Customer">
          <div class="admin-person">
            <span class="admin-person-avatar">${escapeHTML((o.customerName || "?").trim().charAt(0).toUpperCase() || "?")}</span>
            <div class="admin-person-info">
              <span class="admin-person-name">${escapeHTML(o.customerName)}</span>
              <div class="cell-sub">${escapeHTML(o.phone)}</div>
            </div>
          </div>
        </td>
        <td data-label="Items">${o.items.reduce((n, i) => n + i.qty, 0)} item(s)</td>
        <td data-label="Total" class="cell-name">${formatBDT(o.total)}${discountTag(o)}</td>
        <td data-label="Status">${statusBadge(o.status)}${cancelRequestTag(o)}</td>
        <td data-label="Date" class="cell-sub">${new Date(o.date).toLocaleDateString()}</td>
        <td data-label="Actions"><div class="admin-row-actions">${actionButtons(o)}</div></td>
      </tr>`,
      )
      .join("");
  }

  function openOrderModal(order) {
    let discountBanner = "";
    if (order.loyaltyRewardApplied && order.loyaltyDiscount) {
      discountBanner = `
        <div class="admin-order-discount-banner loyalty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>
          This customer's loyalty reward (buy 5, get the 6th at 70% off) was applied — saved ${formatBDT(order.loyaltyDiscount)}.
        </div>`;
    } else if (order.discount) {
      discountBanner = `
        <div class="admin-order-discount-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>
          Coupon <strong>${order.couponCode || "—"}</strong> was applied to this order — saved ${formatBDT(order.discount)}.
        </div>`;
    }

    modalBody.innerHTML = `
      <div class="admin-order-modal-head">
        <div>
          <div class="admin-order-modal-id">#${shortId(order.id)}</div>
          <div class="admin-order-modal-customer">${escapeHTML(order.customerName)} &middot; ${escapeHTML(order.phone)}</div>
          <div class="admin-order-modal-address">${escapeHTML(order.address)}</div>
          ${order.notes ? `<div class="admin-order-modal-note">Note: ${escapeHTML(order.notes)}</div>` : ""}
        </div>
        <div>${statusBadge(order.status)}${cancelRequestTag(order)}</div>
      </div>
      ${discountBanner}
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Item</th><th>Size</th><th>Qty</th><th>Price</th></tr></thead>
          <tbody>
            ${order.items
              .map(
                (i) => `
              <tr>
                <td data-label="Item" class="cell-name">${i.name}</td>
                <td data-label="Size">${i.size}</td>
                <td data-label="Qty">${i.qty}</td>
                <td data-label="Price">${formatBDT(i.price * i.qty)}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="summary-row"><span>Shipping</span><span>${formatBDT(order.shippingFee)}</span></div>
      ${order.discount ? `<div class="summary-row" style="color:var(--red-deep)"><span>Discount (${order.couponCode || "Coupon"})</span><span>-${formatBDT(order.discount)}</span></div>` : ""}
      ${order.loyaltyRewardApplied && order.loyaltyDiscount ? `<div class="summary-row" style="color:var(--red-deep)"><span>Loyalty reward</span><span>-${formatBDT(order.loyaltyDiscount)}</span></div>` : ""}
      <div class="summary-row total"><span>Total</span><span>${formatBDT(order.total)}</span></div>
    `;
    modalOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeOrderModal() {
    modalOverlay.classList.remove("show");
    document.body.style.overflow = "";
  }
  document
    .querySelector("[data-close-order-modal]")
    .addEventListener("click", closeOrderModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeOrderModal();
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
        !(await confirmDialog(`Cancel order #${shortId(id)}? This can't be undone.`))
      ) {
        return;
      }
      try {
        await updateOrderStatus(id, status);
      } catch (err) {
        showToast(err.message || "Couldn't update this order");
        return;
      }
      renderRows();
      showToast(`Order #${shortId(id)} marked ${status}`);
      return;
    }
    const viewBtn = e.target.closest("[data-view-order]");
    if (viewBtn) {
      const order = ORDERS.find(
        (o) => String(o.id) === viewBtn.dataset.viewOrder,
      );
      if (order) openOrderModal(order);
      return;
    }
    const deleteBtn = e.target.closest("[data-delete-order]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteOrder;
      if (
        !(await confirmDialog(`Permanently delete order #${shortId(id)}? This can't be undone.`))
      )
        return;
      try {
        await deleteOrder(id);
      } catch (err) {
        showToast(err.message || "Couldn't delete this order");
        return;
      }
      renderRows();
      showToast(`Order #${shortId(id)} deleted`);
    }
  });

  try {
    await loadOrders();
  } catch (e) {
    showToast("Couldn't load orders");
  }
  renderRows();
})();
