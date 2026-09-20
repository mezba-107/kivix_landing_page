/* ===================================================
   KI-VIX ADMIN — Admins & Mods (Admin role required)
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);
  if (!requireAdminRole(admin)) return;

  const rowsEl = document.querySelector("[data-admin-rows]");
  const superAdminRowsEl = document.querySelector("[data-superadmin-rows]");
  const modRowsEl = document.querySelector("[data-mod-rows]");
  const countEl = document.querySelector("[data-admin-count]");
  const superAdminCountEl = document.querySelector("[data-superadmin-count]");
  const adminOnlyCountEl = document.querySelector("[data-admin-only-count]");
  const modCountEl = document.querySelector("[data-mod-count]");
  const adminEmptyEl = document.querySelector("[data-admin-empty]");
  const modEmptyEl = document.querySelector("[data-mod-empty]");
  const overlay = document.querySelector("[data-admin-modal-overlay]");
  const form = document.querySelector("[data-admin-form]");

  function adminCount() {
    return ADMINS.filter((a) => a.role === "Admin").length;
  }

  const ROLE_BADGE_CLASS = {
    "Super Admin": "role-superadmin",
    Admin: "role-admin",
    Mod: "role-mod",
  };

  // Small round avatar used next to a name in every list/modal on this
  // page: shows the person's actual photo when they have one (customers
  // can set an avatar in their profile), otherwise falls back to the
  // first letter of their name on a colored circle.
  function avatarHTML(person, roleCls) {
    const initial = (person.name || "?").trim().charAt(0).toUpperCase() || "?";
    if (person.avatar) {
      return `<span class="admin-person-avatar"><img src="${escapeHTML(person.avatar)}" alt="" /></span>`;
    }
    return `<span class="admin-person-avatar ${roleCls || ""}">${escapeHTML(initial)}</span>`;
  }

  function rowHTML(a) {
    const isSelf = a.id === admin.id;
    const isSuperAdmin = a.role === "Super Admin";
    const isLastAdmin = a.role === "Admin" && adminCount() <= 1;
    const isLastSuperAdmin =
      isSuperAdmin && ADMINS.filter((x) => x.role === "Super Admin").length <= 1;
    const iAmSuperAdmin = admin.role === "Super Admin";
    const roleCls = ROLE_BADGE_CLASS[a.role] || "role-mod";
    const toggleLabel = a.role === "Admin" ? "Make Mod" : "Make Admin";

    let actionButtons = "";
    if (isSuperAdmin) {
      // Only another Super Admin can promote-away-from or remove a Super
      // Admin, and only once a second Super Admin exists to take over.
      if (iAmSuperAdmin && !isSelf) {
        if (!isLastSuperAdmin) {
          actionButtons += `<button type="button" class="admin-btn-sm" data-toggle-role="${a.id}" data-demote-super="1">Make Admin</button>`;
        }
        if (!isLastSuperAdmin) {
          actionButtons += `<button type="button" class="admin-btn-sm danger" data-delete-admin="${a.id}">Remove</button>`;
        }
      }
    } else {
      const toggleBtn =
        isLastAdmin && a.role === "Admin"
          ? ""
          : `<button type="button" class="admin-btn-sm" data-toggle-role="${a.id}">${toggleLabel}</button>`;
      const promoteBtn =
        iAmSuperAdmin && a.role === "Admin"
          ? `<button type="button" class="admin-btn-sm" data-promote-super="${a.id}">Make Super Admin</button>`
          : "";
      const deleteBtn =
        isSelf || isLastAdmin
          ? ""
          : `<button type="button" class="admin-btn-sm danger" data-delete-admin="${a.id}">Remove</button>`;
      actionButtons = `${toggleBtn}${promoteBtn}${deleteBtn}`;
    }

    return `
      <tr>
        <td data-label="Name">
          <div class="admin-person">
            ${avatarHTML(a, roleCls)}
            <div class="admin-person-info">
              <span class="admin-person-name">${escapeHTML(a.name)}${isSelf ? ' <span class="cell-sub">(you)</span>' : ""}</span>
            </div>
          </div>
        </td>
        <td data-label="Email">${escapeHTML(a.email)}</td>
        <td data-label="Role"><span class="admin-badge ${roleCls}">${escapeHTML(a.role)}</span></td>
        <td data-label="Actions"><div class="admin-row-actions">${actionButtons}</div></td>
      </tr>`;
  }

  function renderRows() {
    const superAdmins = ADMINS.filter((a) => a.role === "Super Admin");
    const admins = ADMINS.filter((a) => a.role === "Admin");
    const mods = ADMINS.filter((a) => a.role === "Mod");

    countEl.textContent = ADMINS.length;
    superAdminCountEl.textContent = superAdmins.length;
    adminOnlyCountEl.textContent = admins.length;
    modCountEl.textContent = mods.length;

    superAdminRowsEl.innerHTML = superAdmins.map(rowHTML).join("");
    rowsEl.innerHTML = admins.map(rowHTML).join("");
    modRowsEl.innerHTML = mods.map(rowHTML).join("");

    if (adminEmptyEl) adminEmptyEl.hidden = admins.length > 0;
    if (modEmptyEl) modEmptyEl.hidden = mods.length > 0;
  }

  function openModal() {
    form.reset();
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  }
  document
    .querySelector("[data-open-add-admin]")
    .addEventListener("click", openModal);
  document
    .querySelector("[data-close-admin-modal]")
    .addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await addAdmin({
        name: fd.get("name").trim(),
        email: fd.get("email").trim(),
        password: fd.get("password"),
        role: fd.get("role"),
      });
    } catch (err) {
      showToast(err.message || "Couldn't add that account");
      return;
    }
    closeModal();
    renderRows();
    showToast("Account added");
  });

  document
    .querySelector("[data-admin-content]")
    .addEventListener("click", async (e) => {
      const promoteBtn = e.target.closest("[data-promote-super]");
      if (promoteBtn) {
        const target = ADMINS.find(
          (a) => String(a.id) === promoteBtn.dataset.promoteSuper,
        );
        if (!target) return;
        if (
          !(await confirmDialog(
            `Make ${target.name} a Super Admin? They'll have full, unrestricted control of the store.`,
            { danger: false, confirmText: "Yes, promote" },
          ))
        )
          return;
        try {
          await updateAdminRole(target.id, "Super Admin");
        } catch (err) {
          showToast(err.message || "Couldn't promote that account");
          return;
        }
        renderRows();
        showToast(`${target.name} is now Super Admin`);
        return;
      }
      const toggleBtn = e.target.closest("[data-toggle-role]");
      if (toggleBtn) {
        const target = ADMINS.find(
          (a) => String(a.id) === toggleBtn.dataset.toggleRole,
        );
        if (!target) return;
        const isDemoteSuper = toggleBtn.dataset.demoteSuper === "1";
        const newRole = isDemoteSuper
          ? "Admin"
          : target.role === "Admin"
            ? "Mod"
            : "Admin";
        if (
          isDemoteSuper &&
          !(await confirmDialog(`Remove ${target.name}'s Super Admin status? They'll become a regular Admin.`))
        )
          return;
        try {
          await updateAdminRole(target.id, newRole);
        } catch (err) {
          showToast(err.message || "Couldn't update that account");
          return;
        }
        renderRows();
        showToast(`${target.name} is now ${newRole}`);
        return;
      }
      const deleteBtn = e.target.closest("[data-delete-admin]");
      if (deleteBtn) {
        const target = ADMINS.find(
          (a) => String(a.id) === deleteBtn.dataset.deleteAdmin,
        );
        if (!target) return;
        if (!(await confirmDialog(`Remove ${target.name} from the admin team?`))) return;
        try {
          await deleteAdmin(target.id);
        } catch (err) {
          showToast(err.message || "Couldn't remove that account");
          return;
        }
        renderRows();
        showToast("Account removed");
      }
    });

  /* ===================================================
     Customers — everyone who created an account on the
     storefront. Admins can search them and promote/demote
     their role right from this table. Promoting to Mod/Admin
     (and demoting back) is handled entirely server-side — it
     creates/updates/removes the matching admin login for you.
  =================================================== */
  const customerRowsEl = document.querySelector("[data-customer-rows]");
  const customerCountEl = document.querySelector("[data-customer-count]");
  const customerEmptyEl = document.querySelector("[data-customer-empty]");
  const customerSearchInput = document.querySelector("[data-customer-search]");

  let customerQuery = "";

  function customerRoleOptions(role) {
    return ["Customer", "Mod", "Admin"]
      .map(
        (r) =>
          `<option value="${r}" ${r === role ? "selected" : ""}>${r}</option>`,
      )
      .join("");
  }

  function customerRowHTML(c) {
    const role = c.role || "Customer";
    const roleCls = ROLE_BADGE_CLASS[role] || "role-mod";
    const joined = c.createdAt
      ? new Date(c.createdAt).toLocaleDateString()
      : "—";
    return `
      <tr>
        <td data-label="Customer">
          <div class="admin-person">
            ${avatarHTML(c)}
            <div class="admin-person-info">
              <span class="admin-person-name">${escapeHTML(c.name || "Customer")}${
                role !== "Customer"
                  ? ` <span class="admin-badge ${roleCls}" style="margin-left:6px;font-size:10px;padding:2px 8px" title="Also has admin panel access">${escapeHTML(role)}</span>`
                  : ""
              }</span>
              <div class="cell-sub">ID ${escapeHTML(c.displayId || `#${String(c.id).slice(-6).toUpperCase()}`)}</div>
            </div>
          </div>
        </td>
        <td data-label="Contact">
          ${c.email ? `<div>${escapeHTML(c.email)}</div>` : ""}
          ${c.phone ? `<div class="cell-sub">${escapeHTML(c.phone)}</div>` : ""}
          ${!c.email && !c.phone ? "—" : ""}
        </td>
        <td data-label="Joined" class="cell-sub">${joined}</td>
        <td data-label="Role">
          <select class="admin-role-select-sm" data-customer-role="${c.id}">
            ${customerRoleOptions(role)}
          </select>
        </td>
        <td data-label="Actions">
          <div class="admin-row-actions">
            <button type="button" class="admin-btn-sm" data-view-customer="${c.id}">View</button>
            <button type="button" class="admin-btn-sm danger" data-remove-customer="${c.id}">Remove</button>
          </div>
        </td>
      </tr>`;
  }

  function renderCustomerRows() {
    const q = customerQuery.trim().toLowerCase();
    const list = CUSTOMERS.filter((c) => {
      if (!q) return true;
      return (
        String(c.id).toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q)
      );
    });

    customerCountEl.textContent = CUSTOMERS.length;

    if (!list.length) {
      customerRowsEl.innerHTML = "";
      customerEmptyEl.hidden = false;
      return;
    }
    customerEmptyEl.hidden = true;
    customerRowsEl.innerHTML = list.map(customerRowHTML).join("");
  }

  customerSearchInput.addEventListener("input", (e) => {
    customerQuery = e.target.value;
    renderCustomerRows();
  });

  customerRowsEl.addEventListener("change", async (e) => {
    const select = e.target.closest("[data-customer-role]");
    if (!select) return;
    const id = select.dataset.customerRole;
    const customer = CUSTOMERS.find((c) => String(c.id) === id);
    if (!customer) return;
    const oldRole = customer.role || "Customer";
    const newRole = select.value;
    if (newRole === oldRole) return;

    if (newRole === "Admin" || newRole === "Mod") {
      if (
        !(await confirmDialog(`Give ${customer.name} ${newRole} access to the admin panel?`, { danger: false, confirmText: "Yes, give access" }))
      ) {
        select.value = oldRole;
        return;
      }
    }

    try {
      await updateCustomerRole(customer.id, newRole);
    } catch (err) {
      showToast(err.message || "Couldn't update that customer's role");
      select.value = oldRole;
      return;
    }
    try {
      await loadAdmins();
    } catch (e2) {
      /* non-fatal — the Admins tables just won't refresh this time */
    }
    renderCustomerRows();
    renderRows();
    showToast(`${customer.name} is now ${newRole}`);
  });

  /* ---- customer detail modal: name, id, contact, addresses, orders ---- */
  const STATUS_LABELS = { Pending: "Pending", Approved: "Processing", Done: "Delivered", Cancelled: "Cancelled" };

  async function showCustomerModal(c) {
    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    const roleCls = ROLE_BADGE_CLASS[c.role || "Customer"] || "role-mod";
    const initial = (c.name || "?").trim().charAt(0).toUpperCase() || "?";
    const avatarBlock = c.avatar
      ? `<span class="admin-customer-modal-avatar"><img src="${escapeHTML(c.avatar)}" alt="" /></span>`
      : `<span class="admin-customer-modal-avatar">${escapeHTML(initial)}</span>`;

    overlay.innerHTML = `
      <div class="admin-modal admin-customer-modal" role="dialog" aria-modal="true" aria-label="Customer details">
        <div class="admin-customer-modal-head">
          ${avatarBlock}
          <div>
            <div class="admin-customer-modal-headline">
              <h3 style="margin-bottom:0">${escapeHTML(c.name || "Customer")}</h3>
              <span class="admin-badge ${roleCls}">${escapeHTML(c.role || "Customer")}</span>
            </div>
            <div class="admin-customer-modal-id">Customer ID ${escapeHTML(c.displayId || `#${String(c.id).slice(-6).toUpperCase()}`)}</div>
          </div>
        </div>

        <div class="admin-customer-detail-meta">
          <div class="admin-customer-detail-meta-item"><span>Email</span><strong>${escapeHTML(c.email || "—")}</strong></div>
          <div class="admin-customer-detail-meta-item"><span>Phone</span><strong>${escapeHTML(c.phone || "—")}</strong></div>
          <div class="admin-customer-detail-meta-item"><span>Joined</span><strong>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}</strong></div>
          <div class="admin-customer-detail-meta-item"><span>Loyalty stamps</span><strong>${c.loyaltyRewardReady ? "Reward ready 🎉" : `${c.loyaltyStamps || 0} / 5`}</strong></div>
        </div>

        ${
          c.role && c.role !== "Customer"
            ? `<div class="admin-customer-detail-meta" style="margin-top:0">
                <div class="admin-customer-detail-meta-item"><span>Admin Panel Access</span><strong>${escapeHTML(c.role)}</strong></div>
                <div class="admin-customer-detail-meta-item"><span>Panel Login Email</span><strong>${escapeHTML(c.email || "—")}</strong></div>
              </div>
              <p class="cell-sub" style="margin:-8px 0 4px">This person also has an admin panel login with the same email — see <a href="/admin/admins.html">Admins &amp; Mods</a>. Changing the password on either side keeps both in sync.</p>`
            : ""
        }

        <h4 class="admin-customer-detail-subhead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          Saved Addresses
        </h4>
        <div class="admin-customer-detail-addresses">
          ${
            (c.addresses || []).length
              ? c.addresses
                  .map(
                    (a) => `
              <div class="admin-customer-detail-address">
                <strong>${escapeHTML(a.label || "Address")}${a.isDefault ? " (Default)" : ""}</strong>
                <div>${escapeHTML(a.fullName || "")} &middot; ${escapeHTML(a.phone || "")}</div>
                <div>${escapeHTML(a.addressLine || "")}${a.city ? `, ${escapeHTML(a.city)}` : ""}${a.division ? `, ${escapeHTML(a.division)}` : ""}</div>
              </div>`,
                  )
                  .join("")
              : `<p class="cell-sub">No saved addresses.</p>`
          }
        </div>

        <h4 class="admin-customer-detail-subhead">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z"/><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/></svg>
          Order History <span data-customer-order-count></span>
        </h4>
        <div class="admin-customer-detail-orders" data-customer-order-list>
          <p class="cell-sub">Loading orders…</p>
        </div>

        <div class="admin-modal-actions">
          <button type="button" class="btn btn-secondary" data-close-customer-modal>Close</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    function close() {
      overlay.classList.remove("show");
      document.body.style.overflow = "";
      setTimeout(() => overlay.remove(), 250);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector("[data-close-customer-modal]").addEventListener("click", close);
    requestAnimationFrame(() => overlay.classList.add("show"));

    try {
      const orders = await getOrdersForCustomer(c.id);
      const listEl = overlay.querySelector("[data-customer-order-list]");
      const countEl = overlay.querySelector("[data-customer-order-count]");
      countEl.textContent = `(${orders.length})`;
      listEl.innerHTML = orders.length
        ? orders
            .map((o) => {
              let discountTag = "";
              if (o.loyaltyRewardApplied && o.loyaltyDiscount) {
                discountTag = `<span class="admin-discount-tag loyalty">🎁 Loyalty −${formatBDT(o.loyaltyDiscount)}</span>`;
              } else if (o.discount) {
                discountTag = `<span class="admin-discount-tag">🏷️ ${o.couponCode || "Coupon"} −${formatBDT(o.discount)}</span>`;
              }
              return `
          <div class="admin-customer-detail-order">
            <div>
              <strong>${o.displayId || `#${String(o.id).slice(-6).toUpperCase()}`}</strong>
              <span class="cell-sub">${new Date(o.date).toLocaleDateString()}</span>
              ${discountTag ? `<div>${discountTag}</div>` : ""}
            </div>
            <span class="admin-badge ${String(o.status || "Pending").toLowerCase()}">${STATUS_LABELS[o.status] || o.status}</span>
            <strong>${formatBDT(o.total)}</strong>
          </div>`;
            })
            .join("")
        : `<p class="cell-sub">This customer hasn't placed any orders yet.</p>`;
    } catch (err) {
      overlay.querySelector("[data-customer-order-list]").innerHTML =
        `<p class="cell-sub">Couldn't load order history.</p>`;
    }
  }

  customerRowsEl.addEventListener("click", async (e) => {
    const viewBtn = e.target.closest("[data-view-customer]");
    if (viewBtn) {
      const customer = CUSTOMERS.find(
        (c) => String(c.id) === viewBtn.dataset.viewCustomer,
      );
      if (customer) showCustomerModal(customer);
      return;
    }
    const btn = e.target.closest("[data-remove-customer]");
    if (!btn) return;
    const customer = CUSTOMERS.find(
      (c) => String(c.id) === btn.dataset.removeCustomer,
    );
    if (!customer) return;
    if (!(await confirmDialog(`Remove ${customer.name}'s customer account?`))) return;
    try {
      await deleteCustomer(customer.id);
    } catch (err) {
      showToast(err.message || "Couldn't remove that customer");
      return;
    }
    renderCustomerRows();
    showToast("Customer removed");
  });

  try {
    await Promise.all([loadAdmins(), loadCustomers()]);
  } catch (e) {
    showToast("Couldn't load the team");
  }
  renderRows();
  renderCustomerRows();
  enablePasswordToggles(document);
})();
