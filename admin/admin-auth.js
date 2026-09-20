/* ===================================================
   KI-VIX ADMIN — shared auth guard + sidebar behaviour
   Loaded on every /admin page EXCEPT login.html.
   Requires /data.js to already be loaded (ADMINS,
   getCurrentAdmin, adminLogout, etc).
=================================================== */

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

/* Confirm dialog (replaces window.confirm) — only defined here if
   cart.js hasn't already defined it on this page.
   Usage: if (!(await confirmDialog("Delete this?"))) return; */
if (typeof confirmDialog === "undefined") {
  window.confirmDialog = function confirmDialog(message, opts = {}) {
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
  };
}

/* Redirects to login if nobody is signed in. Call this at
   the very top of every protected admin page, with await —
   it restores the session from the saved token (confirming
   it's still valid with the server) before the page uses it. */
async function requireAdminAuth() {
  const admin = await bootstrapAdminSession();
  if (!admin) {
    window.location.href = "/admin/login.html";
    return null;
  }
  return admin;
}

/* Mods can see Products & Orders but not the Admins page.
   Call this on admins.html only, after requireAdminAuth(). */
function requireAdminRole(admin) {
  if (!admin || (admin.role !== "Admin" && admin.role !== "Super Admin")) {
    document.querySelector("[data-admin-content]").innerHTML = `
      <div class="admin-panel">
        <div class="admin-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v2"/></svg>
          <p style="font-weight:700;color:var(--text);margin-bottom:6px;">Admins only</p>
          <p>Your account is a <strong>Mod</strong> — ask an Admin to manage staff accounts.</p>
        </div>
      </div>`;
    return false;
  }
  return true;
}

function initAdminShell(admin) {
  // populate sidebar user block
  document.querySelectorAll("[data-admin-name]").forEach((el) => {
    el.textContent = admin.name;
  });
  document.querySelectorAll("[data-admin-role]").forEach((el) => {
    el.textContent = admin.role;
  });
  function renderSidebarAvatar(a) {
    document.querySelectorAll("[data-admin-avatar]").forEach((el) => {
      el.innerHTML = a.avatar
        ? `<img src="${a.avatar}" alt="" />`
        : a.name.trim().charAt(0).toUpperCase() || "A";
    });
  }
  renderSidebarAvatar(admin);

  // Clicking the avatar OR the name/role block opens the admin's own
  // profile (info + change password) — see openAdminProfileModal below.
  // The actual photo picker now lives inside that modal, reusing the
  // same hidden file input.
  document.querySelectorAll("[data-admin-avatar-trigger]").forEach((btn) => {
    btn.addEventListener("click", () => openAdminProfileModal(admin, renderSidebarAvatar));
  });
  document.querySelectorAll(".admin-sidebar-user-info").forEach((el) => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openAdminProfileModal(admin, renderSidebarAvatar));
  });
  document.querySelectorAll("[data-admin-avatar-input]").forEach((input) => {
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        showToast("Please choose an image file");
        return;
      }
      if (file.size > 30 * 1024 * 1024) {
        showToast("Image is too large — please choose one under 30MB");
        return;
      }
      try {
        const url = await uploadImage(file, "avatars");
        const updated = await updateAdminAvatar(url);
        renderSidebarAvatar(updated);
        document.querySelectorAll("[data-profile-modal-avatar] img, [data-profile-modal-avatar]").forEach((el) => {
          el.innerHTML = updated.avatar ? `<img src="${updated.avatar}" alt="" />` : (updated.name.trim().charAt(0).toUpperCase() || "A");
        });
        showToast("Profile photo updated");
      } catch (err) {
        showToast(err.message || "Couldn't upload that photo");
      } finally {
        input.value = "";
      }
    });
  });

  // Orders nav badge — shows how many orders are sitting in "Pending"
  // (i.e. need the admin's attention) so it's obvious from any page,
  // without having to open Orders to check. Refreshes itself every
  // 45s in case a new order comes in while the admin stays put on a
  // page, and again every time they navigate (this function reruns
  // on every admin page load).
  async function refreshOrdersBadge() {
    const badges = document.querySelectorAll("[data-orders-nav-badge]");
    if (!badges.length) return;
    try {
      const stats = await apiAdmin("/stats");
      const count = stats.pendingOrders || 0;
      badges.forEach((el) => {
        el.textContent = count > 99 ? "99+" : String(count);
        el.hidden = count <= 0;
      });
    } catch (e) {
      /* non-fatal — badge just stays as it was */
    }
  }
  refreshOrdersBadge();
  setInterval(refreshOrdersBadge, 45000);

  // Pre-orders nav badge — same idea as the Orders badge above, but for
  // pre-order requests sitting in "Pending" (not yet contacted).
  async function refreshPreOrdersBadge() {
    const badges = document.querySelectorAll("[data-preorders-nav-badge]");
    if (!badges.length) return;
    try {
      const stats = await apiAdmin("/stats");
      const count = stats.pendingPreOrders || 0;
      badges.forEach((el) => {
        el.textContent = count > 99 ? "99+" : String(count);
        el.hidden = count <= 0;
      });
    } catch (e) {
      /* non-fatal — badge just stays as it was */
    }
  }
  refreshPreOrdersBadge();
  setInterval(refreshPreOrdersBadge, 45000);

  // logout
  document.querySelectorAll("[data-admin-logout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      adminLogout();
      window.location.href = "/admin/login.html";
    });
  });

  // mobile sidebar toggle
  const sidebar = document.querySelector("[data-admin-sidebar]");
  const overlay = document.querySelector("[data-admin-sidebar-overlay]");
  document.querySelectorAll("[data-admin-sidebar-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sidebar.classList.add("open");
      overlay.classList.add("show");
    });
  });
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("show");
    });
  }

  // highlight active nav link by matching current path
  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  document.querySelectorAll("[data-admin-nav]").forEach((a) => {
    const href = a.getAttribute("href").toLowerCase();
    const isIndex =
      href === "/admin/index.html" &&
      (path === "/admin" || path === "/admin/index.html");
    a.classList.toggle("active", path === href || isIndex);
  });
}

/* ===================================================
   Admin's own profile modal — opened by clicking the
   avatar or name/role in the sidebar (see initAdminShell
   above). Shows read-only info + a change-password form.
   If this login is linked to a Customer account with the
   same email (linkedAdmin, see backend), a password change
   here also updates that Customer's password — and vice
   versa on the Account page's Settings tab.
=================================================== */
function openAdminProfileModal(admin, renderSidebarAvatar) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = `
    <div class="confirm-modal admin-profile-modal" role="dialog" aria-modal="true" aria-label="My profile">
      <button type="button" class="admin-profile-modal-close" data-close-profile-modal aria-label="Close">&times;</button>
      <div class="admin-profile-modal-head">
        <button type="button" class="admin-sidebar-avatar admin-profile-modal-avatar" data-profile-modal-avatar-trigger title="Change profile photo">
          ${admin.avatar ? `<img src="${escapeHTML(admin.avatar)}" alt="" />` : escapeHTML(admin.name.trim().charAt(0).toUpperCase() || "A")}
        </button>
        <div>
          <h3 style="margin-bottom:2px">${escapeHTML(admin.name)}</h3>
          <div class="cell-sub">${escapeHTML(admin.email)}</div>
          <span class="admin-badge ${{ "Super Admin": "role-superadmin", Admin: "role-admin", Mod: "role-mod" }[admin.role] || "role-mod"}" style="margin-top:6px;display:inline-block">${escapeHTML(admin.role)}</span>
        </div>
      </div>
      <form data-admin-name-form class="admin-profile-name-form" style="margin-top:22px">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" value="${escapeHTML(admin.name)}" required maxlength="60" />
        </div>
        <button type="submit" class="btn btn-secondary btn-block">Save Name</button>
      </form>
      <form data-admin-password-form style="margin-top:22px">
        <h4 style="margin:0 0 4px">Change Password</h4>
        <p class="card-sub" style="margin:0 0 16px">Changing this also updates the password on your linked storefront account, if you have one with the same email.</p>
        <div class="field"><label>Current Password *</label><input type="password" name="currentPassword" required /></div>
        <div class="field"><label>New Password *</label><input type="password" name="newPassword" required minlength="4" /></div>
        <div class="field"><label>Confirm New Password *</label><input type="password" name="confirmPassword" required minlength="4" /></div>
        <button type="submit" class="btn btn-primary btn-block">Change Password</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  enablePasswordToggles(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));

  function close() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => overlay.remove(), 250);
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("[data-close-profile-modal]").addEventListener("click", close);

  overlay.querySelector("[data-profile-modal-avatar-trigger]").addEventListener("click", () => {
    document.querySelector("[data-admin-avatar-input]")?.click();
  });

  overlay.querySelector("[data-admin-name-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = (fd.get("name") || "").trim();
    if (!name) {
      showToast("Please enter a name");
      return;
    }
    try {
      const updated = await updateAdminProfile(name);
      overlay.querySelector(".admin-profile-modal-head h3").textContent = updated.name;
      document.querySelectorAll("[data-admin-name]").forEach((el) => {
        el.textContent = updated.name;
      });
      renderSidebarAvatar(updated);
      showToast("Name updated");
    } catch (err) {
      showToast(err.message || "Couldn't update your name");
    }
  });

  overlay.querySelector("[data-admin-password-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const currentPassword = fd.get("currentPassword");
    const newPassword = fd.get("newPassword");
    const confirmPassword = fd.get("confirmPassword");
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match");
      return;
    }
    const result = await changeAdminPassword(currentPassword, newPassword);
    if (result.error) {
      showToast(result.error);
      return;
    }
    showToast("Password changed successfully");
    e.target.reset();
  });
}
