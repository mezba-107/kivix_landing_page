/* ===================================================
   KI-VIX ADMIN — Coupons
   Stored in COUPONS (data.js, backed by the API). Customers
   redeem a coupon code at checkout via validateCoupon() to
   knock a flat or percentage discount off their order subtotal.
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const rowsEl = document.querySelector("[data-coupon-rows]");
  const countEl = document.querySelector("[data-coupon-count]");
  const emptyEl = document.querySelector("[data-coupon-empty]");

  const overlay = document.querySelector("[data-coupon-modal-overlay]");
  const form = document.querySelector("[data-coupon-form]");
  const modalTitle = document.querySelector("[data-coupon-modal-title]");
  const submitBtn = document.querySelector("[data-coupon-submit]");
  const valueLabel = document.querySelector("[data-coupon-value-label]");
  const typeSelect = form.querySelector('[name="type"]');

  function money(n) {
    return `৳${Number(n || 0).toLocaleString()}`;
  }

  function couponStatus(c) {
    if (c.active === false) return { label: "Inactive", cls: "cancelled" };
    if (c.expiresAt && new Date(c.expiresAt) < new Date())
      return { label: "Expired", cls: "cancelled" };
    if (c.usageLimit && (c.usedCount || 0) >= c.usageLimit)
      return { label: "Limit reached", cls: "pending" };
    return { label: "Active", cls: "done" };
  }

  function discountLabel(c) {
    return c.type === "percent" ? `${c.value}% OFF` : `${money(c.value)} OFF`;
  }

  function conditionsLabel(c) {
    const parts = [];
    if (c.minOrder) parts.push(`Min order ${money(c.minOrder)}`);
    if (c.expiresAt)
      parts.push(`Expires ${new Date(c.expiresAt).toLocaleDateString()}`);
    if (c.usageLimit) parts.push(`Limit ${c.usageLimit} use(s)`);
    return parts.length
      ? parts.join(" · ")
      : '<span class="cell-sub">No conditions</span>';
  }

  function rowHTML(c) {
    const status = couponStatus(c);
    return `
      <tr>
        <td data-label="Code" class="cell-name">${c.code}</td>
        <td data-label="Discount"><strong>${discountLabel(c)}</strong></td>
        <td data-label="Conditions" class="cell-sub">${conditionsLabel(c)}</td>
        <td data-label="Used">${c.usedCount || 0}${c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
        <td data-label="Status"><span class="admin-badge ${status.cls}">${status.label}</span></td>
        <td data-label="Actions">
          <div class="admin-row-actions">
            <button type="button" class="admin-btn-sm" data-edit-coupon="${c.id}">Edit</button>
            ${admin.role !== "Mod" ? `<button type="button" class="admin-btn-sm danger" data-delete-coupon="${c.id}">Delete</button>` : ""}
          </div>
        </td>
      </tr>`;
  }

  function render() {
    countEl.textContent = COUPONS.length;
    if (!COUPONS.length) {
      rowsEl.innerHTML = "";
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    // COUPONS is already newest-first (backend sorts, and addCoupon()
    // unshifts new ones onto the front of the cache).
    rowsEl.innerHTML = COUPONS.map(rowHTML).join("");
  }

  function updateValueLabel() {
    valueLabel.textContent =
      typeSelect.value === "percent"
        ? "Discount Value (%) *"
        : "Discount Value (BDT) *";
  }
  typeSelect.addEventListener("change", updateValueLabel);

  function openModal(coupon) {
    form.reset();
    form.querySelector('[name="id"]').value = coupon ? coupon.id : "";
    form.querySelector('[name="active"]').checked = coupon
      ? coupon.active !== false
      : true;
    if (coupon) {
      modalTitle.textContent = "Edit Coupon";
      submitBtn.textContent = "Save Changes";
      form.querySelector('[name="code"]').value = coupon.code;
      form.querySelector('[name="type"]').value = coupon.type;
      form.querySelector('[name="value"]').value = coupon.value;
      form.querySelector('[name="minOrder"]').value = coupon.minOrder || "";
      form.querySelector('[name="usageLimit"]').value =
        coupon.usageLimit || "";
      form.querySelector('[name="expiresAt"]').value = coupon.expiresAt
        ? String(coupon.expiresAt).slice(0, 10)
        : "";
    } else {
      modalTitle.textContent = "Create Coupon";
      submitBtn.textContent = "Create";
    }
    updateValueLabel();
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  document
    .querySelector("[data-open-coupon-modal]")
    .addEventListener("click", () => openModal(null));
  document
    .querySelector("[data-close-coupon-modal]")
    .addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const id = fd.get("id");
    const code = String(fd.get("code") || "").trim().toUpperCase();
    if (!code) return;

    const existing = findCouponByCode(code);
    if (existing && String(existing.id) !== String(id)) {
      showToast(`Coupon code "${code}" already exists`);
      return;
    }

    const payload = {
      code,
      type: fd.get("type"),
      value: Number(fd.get("value")) || 0,
      minOrder: fd.get("minOrder") ? Number(fd.get("minOrder")) : null,
      usageLimit: fd.get("usageLimit") ? Number(fd.get("usageLimit")) : null,
      expiresAt: fd.get("expiresAt") || null,
      active: fd.get("active") === "on",
    };

    try {
      if (id) {
        await updateCoupon(id, payload);
        showToast(`Coupon "${code}" updated`);
      } else {
        await addCoupon(payload);
        showToast(`Coupon "${code}" created`);
      }
    } catch (err) {
      showToast(err.message || "Couldn't save that coupon");
      return;
    }
    closeModal();
    render();
  });

  rowsEl.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit-coupon]");
    if (editBtn) {
      const c = COUPONS.find((c) => String(c.id) === editBtn.dataset.editCoupon);
      if (c) openModal(c);
      return;
    }
    const deleteBtn = e.target.closest("[data-delete-coupon]");
    if (deleteBtn) {
      const id = deleteBtn.dataset.deleteCoupon;
      const c = COUPONS.find((c) => String(c.id) === id);
      if (!c) return;
      if (!(await confirmDialog(`Delete coupon "${c.code}"? This can't be undone.`))) return;
      try {
        await deleteCoupon(id);
      } catch (err) {
        showToast(err.message || "Couldn't delete that coupon");
        return;
      }
      // Unlink it from the offer countdown bar if it was selected there.
      if (OFFER_TIMER.coupon && String(OFFER_TIMER.coupon.id) === id) {
        try {
          await saveOfferTimer({ ...OFFER_TIMER, couponId: null });
        } catch (e2) {
          /* non-fatal */
        }
      }
      render();
      showToast("Coupon deleted");
    }
  });

  try {
    await loadCoupons();
  } catch (e) {
    showToast("Couldn't load coupons");
  }
  render();
})();
