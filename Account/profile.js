/* ===================================================
   KI-VIX SNEAKERS — MY ACCOUNT PAGE
   /Account/profile.html only.
   Requires: data.js (getCurrentCustomer, updateCustomerProfile,
   updateCustomerAvatar, changeCustomerPassword, deleteCustomerAccount,
   getCustomerAddresses, addCustomerAddress, updateCustomerAddress,
   deleteCustomerAddress, setDefaultCustomerAddress, getCustomerOrders,
   requestOrderCancellation, customerLogout, formatBDT), cart.js
   (showToast), auth.js (openAuthModal, refreshAccountUI,
   customerAvatarHTML).
=================================================== */

/* ---------- mobile nav toggle (same pattern as every other page) ---------- */
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

const ZONE_LABELS = { inside: "Inside Dhaka", outside: "Outside Dhaka" };
const STATUS_LABELS = {
  Pending: "Pending",
  Approved: "Processing",
  Done: "Delivered",
  Cancelled: "Cancelled",
};

let activeTab = "info";
let addressFormMode = null; // null | "add" | <address id string> (editing that address)
let deleteAccountOpen = false;

function isEditingAddress() {
  return typeof addressFormMode === "string" && addressFormMode !== "add";
}

function initials(customer) {
  const name = (customer.firstName || customer.name || "?").trim();
  return (name.charAt(0) || "?").toUpperCase();
}
function avatarLgHTML(customer) {
  if (customer.avatar) {
    return `<img src="${customer.avatar}" alt="Profile photo" />`;
  }
  return initials(customer);
}
function avatarSmHTML(customer) {
  if (customer.avatar) {
    return `<img src="${customer.avatar}" alt="Profile photo" />`;
  }
  return initials(customer);
}

/* ===================================================
   TOP-LEVEL RENDER
=================================================== */
function renderAccountPage() {
  const root = document.querySelector("[data-account-root]");
  if (!root) return;
  const customer = getCurrentCustomer();

  if (!customer) {
    root.innerHTML = `
      <div class="account-guest">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
        <h2>You're not logged in</h2>
        <p>Login or create an account to view your profile, saved addresses and order history.</p>
        <button type="button" class="btn btn-primary" data-guest-login>Login</button>
        <button type="button" class="btn btn-secondary" data-guest-signup>Create Account</button>
      </div>`;
    root.querySelector("[data-guest-login]").addEventListener("click", () => openAuthModal("login"));
    root.querySelector("[data-guest-signup]").addEventListener("click", () => openAuthModal("signup"));
    return;
  }

  root.innerHTML = `
    <div class="account-grid">
      <aside class="account-sidebar">
        <div class="account-sidebar-user">
          <div class="account-sidebar-avatar">${avatarSmHTML(customer)}</div>
          <div style="min-width:0">
            <div class="account-sidebar-name">${customer.firstName || customer.name || "Customer"} ${customer.lastName || ""}</div>
            <div class="account-sidebar-email">${customer.email || customer.phone || ""}</div>
          </div>
        </div>
        <nav class="account-nav">
          <button type="button" data-account-tab="info" class="${activeTab === "info" ? "active" : ""}">
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg></span>
            <span class="account-nav-label">Profile</span>
          </button>
          <button type="button" data-account-tab="addresses" class="${activeTab === "addresses" ? "active" : ""}">
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 10.4c0 6.4-8.8 11.6-8.8 11.6S3.2 16.8 3.2 10.4a8.8 8.8 0 0 1 17.6 0Z"/><circle cx="12" cy="10.4" r="3"/></svg></span>
            <span class="account-nav-label">Addresses</span>
          </button>
          <button type="button" data-account-tab="settings" class="${activeTab === "settings" ? "active" : ""}">
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg></span>
            <span class="account-nav-label">Settings</span>
          </button>
          <button type="button" data-account-tab="orders" class="${activeTab === "orders" ? "active" : ""}">
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1.5 12.5a1 1 0 0 1-1 .9H6.5a1 1 0 0 1-1-.9L4 7Z"/><path d="M8 7V5a4 4 0 0 1 8 0v2"/></svg></span>
            <span class="account-nav-label">My Orders</span>
          </button>
          <button type="button" data-account-tab="loyalty" class="${activeTab === "loyalty" ? "active" : ""}">
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.9 6.3L21.5 9l-4.8 4.6L18 20l-6-3.4L6 20l1.3-6.4L2.5 9l6.6-.7L12 2Z"/></svg></span>
            <span class="account-nav-label">Loyalty</span>
            ${customer.loyaltyRewardReady ? `<span class="account-nav-badge">1</span>` : ""}
          </button>
        </nav>
        <div class="account-nav-logout">
          <button type="button" data-account-logout>
            <span class="account-nav-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg></span>
            <span class="account-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      <div>
        <div class="account-panel ${activeTab === "info" ? "active" : ""}" data-account-panel="info">
          ${infoPanelHTML(customer)}
        </div>
        <div class="account-panel ${activeTab === "addresses" ? "active" : ""}" data-account-panel="addresses">
          ${addressesPanelHTML(customer)}
        </div>
        <div class="account-panel ${activeTab === "settings" ? "active" : ""}" data-account-panel="settings">
          ${settingsPanelHTML(customer)}
        </div>
        <div class="account-panel ${activeTab === "orders" ? "active" : ""}" data-account-panel="orders">
          ${ordersPanelHTML(customer)}
        </div>
        <div class="account-panel ${activeTab === "loyalty" ? "active" : ""}" data-account-panel="loyalty">
          ${loyaltyPanelHTML(customer)}
        </div>
      </div>
    </div>`;
  enablePasswordToggles(root);
}

/* ===================================================
   PANEL 1 — PROFILE INFO
=================================================== */
function infoPanelHTML(customer) {
  const joined = customer.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  return `
    <div class="account-card">
      <h3>Profile Photo</h3>
      <p class="card-sub">Shown on the account icon in the site navigation.</p>
      <div class="account-avatar-row">
        <div class="account-avatar-lg">${avatarLgHTML(customer)}</div>
        <div class="account-avatar-actions">
          <input type="file" accept="image/*" data-avatar-input hidden />
          <button type="button" class="btn btn-secondary" data-avatar-upload-trigger>Upload Photo</button>
          ${customer.avatar ? `<button type="button" class="btn btn-secondary" data-avatar-remove>Remove Photo</button>` : ""}
        </div>
      </div>
    </div>
    <div class="account-card">
      <h3>Profile Information</h3>
      <p class="card-sub">Your account details on file.</p>
      <div class="info-list">
        <div class="info-row"><span class="label">Full Name</span><span class="value">${customer.firstName || ""} ${customer.lastName || ""}</span></div>
        <div class="info-row"><span class="label">Email</span><span class="value">${customer.email || "—"}</span></div>
        <div class="info-row"><span class="label">Phone</span><span class="value">${customer.phone || "—"}</span></div>
        <div class="info-row"><span class="label">Member Since</span><span class="value">${joined}</span></div>
      </div>
    </div>`;
}

/* ===================================================
   PANEL 2 — ADDRESSES
=================================================== */
function addressCardHTML(a) {
  return `
    <div class="address-card ${a.isDefault ? "is-default" : ""}">
      <div class="address-card-head">
        <span class="address-label-tag">${a.label}</span>
        ${a.isDefault ? `<span class="address-default-tag">Default</span>` : ""}
      </div>
      <div class="name-line">${a.fullName}</div>
      <div class="phone-line">${a.phone}</div>
      <div class="addr-line">${a.addressLine}${a.city ? `, ${a.city}` : ""} &middot; ${ZONE_LABELS[a.zone] || a.zone}</div>
      <div class="address-card-actions">
        ${!a.isDefault ? `<button type="button" data-default-address="${a.id}">Set as Default</button>` : ""}
        <button type="button" data-edit-address="${a.id}">Edit</button>
        <button type="button" class="danger" data-delete-address="${a.id}">Delete</button>
      </div>
    </div>`;
}

function addressFormHTML(customer) {
  const editing = isEditingAddress()
    ? getCustomerAddresses(customer.id).find(
        (a) => String(a.id) === addressFormMode,
      )
    : null;
  return `
    <form class="address-form ${addressFormMode !== null ? "show" : ""}" data-address-form>
      <div class="field-grid">
        <label class="field">
          <span>Label</span>
          <select name="label" style="font-family:inherit;font-size:14px;padding:13px 15px;border:1.5px solid var(--line);border-radius:var(--radius-sm);">
            <option value="Home" ${editing?.label === "Home" ? "selected" : ""}>Home</option>
            <option value="Office" ${editing?.label === "Office" ? "selected" : ""}>Office</option>
            <option value="Other" ${editing?.label === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label class="field">
          <span>Full Name *</span>
          <input type="text" name="fullName" required value="${editing?.fullName || ""}" placeholder="Recipient's name" />
        </label>
        <label class="field">
          <span>Phone Number *</span>
          <input type="tel" name="phone" required value="${editing?.phone || ""}" placeholder="01XXXXXXXXX" />
        </label>
        <label class="field">
          <span>Delivery Zone *</span>
          <select name="zone" style="font-family:inherit;font-size:14px;padding:13px 15px;border:1.5px solid var(--line);border-radius:var(--radius-sm);">
            <option value="inside" ${editing?.zone === "inside" || !editing ? "selected" : ""}>Inside Dhaka</option>
            <option value="outside" ${editing?.zone === "outside" ? "selected" : ""}>Outside Dhaka</option>
          </select>
        </label>
        <label class="field">
          <span>City / District *</span>
          <input type="text" name="city" required value="${editing?.city || ""}" placeholder="e.g. Dhanmondi, Dhaka" />
        </label>
        <label class="field field-full">
          <span>Full Address *</span>
          <textarea name="addressLine" rows="3" required placeholder="House, road, area">${editing?.addressLine || ""}</textarea>
        </label>
      </div>
      <label class="checkbox-field">
        <input type="checkbox" name="isDefault" ${editing?.isDefault ? "checked" : ""} />
        Set as default address
      </label>
      <div class="address-form-actions">
        <button type="submit" class="btn btn-primary">${isEditingAddress() ? "Save Changes" : "Save Address"}</button>
        <button type="button" class="btn btn-secondary" data-address-cancel>Cancel</button>
      </div>
    </form>`;
}

function addressesPanelHTML(customer) {
  const addresses = getCustomerAddresses(customer.id);
  return `
    <div class="account-card">
      <h3>Delivery Addresses</h3>
      <p class="card-sub">Save addresses here so you can pick one at checkout instead of typing it every time.</p>
      ${
        addresses.length
          ? `<div class="address-list">${addresses.map(addressCardHTML).join("")}</div>`
          : `<div class="address-empty">You haven't saved any delivery address yet.</div>`
      }
      ${addressFormMode === null ? `<button type="button" class="btn btn-secondary" data-address-add-toggle>+ Add New Address</button>` : ""}
      ${addressFormHTML(customer)}
    </div>`;
}

/* ===================================================
   PANEL 3 — SETTINGS
=================================================== */
function settingsPanelHTML(customer) {
  return `
    <div class="account-card">
      <h3>Edit Profile</h3>
      <p class="card-sub">Update your name, email and phone number.</p>
      <form data-profile-form>
        <div class="field-grid">
          <label class="field"><span>First Name</span><input type="text" name="firstName" value="${customer.firstName || ""}" /></label>
          <label class="field"><span>Last Name</span><input type="text" name="lastName" value="${customer.lastName || ""}" /></label>
          <label class="field"><span>Email</span><input type="email" name="email" value="${customer.email || ""}" /></label>
          <label class="field"><span>Phone</span><input type="tel" name="phone" value="${customer.phone || ""}" /></label>
        </div>
        <button type="submit" class="btn btn-primary">Update Profile</button>
      </form>
    </div>

    <div class="account-card">
      <h3>${customer.hasPassword ? "Change Password" : "Set a Password"}</h3>
      <p class="card-sub">${
        customer.hasPassword
          ? "Choose a new password for your account."
          : "You signed in with Google, so you don't have a password yet. Set one to also be able to log in with your email, and to manage your account below."
      }</p>
      <form data-password-form>
        ${customer.hasPassword ? '<label class="field"><span>Current Password *</span><input type="password" name="currentPassword" required /></label>' : ""}
        <label class="field"><span>New Password *</span><input type="password" name="newPassword" required minlength="4" /></label>
        <label class="field"><span>Confirm New Password *</span><input type="password" name="confirmPassword" required minlength="4" /></label>
        <button type="submit" class="btn btn-primary">${customer.hasPassword ? "Change Password" : "Set Password"}</button>
      </form>
    </div>

    <div class="account-card danger-zone">
      <h3>Delete Account</h3>
      <p class="card-sub">This permanently deletes your account. This can't be undone.</p>
      ${
        deleteAccountOpen
          ? `<form data-delete-account-form>
              ${
                customer.hasPassword
                  ? '<label class="field"><span>Enter your password to confirm *</span><input type="password" name="password" required /></label>'
                  : '<p class="card-sub">You signed in with Google and haven\'t set a password, so we\'ll just ask you to confirm below.</p>'
              }
              <div class="address-form-actions">
                <button type="submit" class="btn btn-primary" style="background:var(--red);box-shadow:none;">Permanently Delete</button>
                <button type="button" class="btn btn-secondary" data-delete-cancel>Cancel</button>
              </div>
            </form>`
          : `<button type="button" class="btn btn-secondary" data-delete-account-toggle>Delete My Account</button>`
      }
    </div>`;
}

/* ===================================================
   PANEL 4 — ORDERS
=================================================== */
function orderStatusBadgeHTML(order) {
  const cls = String(order.status || "Pending").toLowerCase();
  const label = STATUS_LABELS[order.status] || order.status;
  return `<span class="order-status-badge ${cls}">${label}</span>`;
}

function orderCardHTML(order) {
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);
  const itemsLine = order.items
    .map((i) => `${i.name} (Size ${i.size} &times; ${i.qty})`)
    .join(", ");
  const canRequestCancel = order.status === "Pending" && !order.cancelRequested;
  const cancelBtn =
    order.status === "Pending"
      ? `<button type="button" class="account-order-cancel-btn" data-cancel-order="${order.id}" ${order.cancelRequested ? "disabled" : ""}>
          ${order.cancelRequested ? "Cancellation Requested" : "Request Cancellation"}
        </button>`
      : "";
  return `
    <div class="account-order-card">
      <div class="account-order-head">
        <div>
          <div class="account-order-id">Order ${order.displayId || `#${String(order.id).slice(-6).toUpperCase()}`}</div>
          <div class="account-order-date">${new Date(order.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
        </div>
        <div>${orderStatusBadgeHTML(order)}${order.cancelRequested && order.status === "Pending" ? `<span class="cancel-requested-tag">Cancellation pending</span>` : ""}</div>
      </div>
      <div class="account-order-meta">${itemCount} item(s) &middot; Delivering to: ${order.address}</div>
      <div class="account-order-items">${itemsLine}</div>
      <div class="account-order-foot">
        <span class="account-order-total">${formatBDT(order.total)}</span>
        ${cancelBtn}
      </div>
    </div>`;
}

const PREORDER_STATUS_LABELS = {
  Pending: "Pending",
  Contacted: "Contacted",
  Fulfilled: "Fulfilled",
  Cancelled: "Cancelled",
};
// Reuses the existing pending/approved/done/cancelled badge colours
// (order-status-badge classes) rather than adding new ones.
const PREORDER_STATUS_BADGE_CLASS = {
  Pending: "pending",
  Contacted: "approved",
  Fulfilled: "done",
  Cancelled: "cancelled",
};
function preOrderStatusBadgeHTML(preOrder) {
  const cls = PREORDER_STATUS_BADGE_CLASS[preOrder.status] || "pending";
  const label = PREORDER_STATUS_LABELS[preOrder.status] || preOrder.status;
  return `<span class="order-status-badge ${cls}">${label}</span>`;
}
function preOrderCardHTML(p) {
  return `
    <div class="account-order-card">
      <div class="account-order-head">
        <div>
          <div class="account-order-id">Pre-order ${p.displayId || `#${String(p.id).slice(-6).toUpperCase()}`}</div>
          <div class="account-order-date">${new Date(p.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
        </div>
        <div>${preOrderStatusBadgeHTML(p)}</div>
      </div>
      <div class="account-order-meta">${p.qty} item(s)${p.address ? ` &middot; Delivering to: ${escapeHTML(p.address)}` : ""}</div>
      <div class="account-order-items">${escapeHTML(p.productName)}${p.size ? ` (Size ${escapeHTML(String(p.size))} &times; ${p.qty})` : ` (Qty ${p.qty})`}</div>
      <div class="account-order-foot">
        <span class="account-order-total">${formatBDT(p.price * p.qty)}</span>
      </div>
    </div>`;
}

function ordersPanelHTML(customer) {
  const orders = getCustomerOrders(customer.id);
  const preOrders = getCustomerPreOrders(customer.id);
  return `
    <div class="account-card">
      <h3>Order History</h3>
      <p class="card-sub">Every order placed while logged in, with live status.</p>
      ${
        orders.length
          ? `<div class="account-order-list">${orders.map(orderCardHTML).join("")}</div>`
          : `<div class="account-orders-empty">You haven't placed any orders yet.<br/><a href="/Products/products.html" class="btn btn-primary" style="margin-top:16px">Browse Collection</a></div>`
      }
    </div>

    <div class="account-card">
      <h3>Pre-order History</h3>
      <p class="card-sub">Stock-out items you've requested to be notified about.</p>
      ${
        preOrders.length
          ? `<div class="account-order-list">${preOrders.map(preOrderCardHTML).join("")}</div>`
          : `<div class="account-orders-empty">You haven't requested any pre-orders yet.</div>`
      }
    </div>`;
}

/* ===================================================
   PANEL 5 — LOYALTY (buy 5 pairs, 6th at 70% off)
=================================================== */
function loyaltyPanelHTML(customer) {
  const stamps = customer.loyaltyStamps || 0;
  const ready = !!customer.loyaltyRewardReady;
  const percent = ready ? 100 : Math.round((stamps / 5) * 100);
  const shoeIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-3.2c0-.6.35-1.1.9-1.35L9 11l4-4c.5-.5 1.3-.6 1.9-.2l1.7 1.1c.5.3.8.9.8 1.5v1.1c0 .6.3 1.1.8 1.4l3.1 1.9c.4.25.7.7.7 1.2V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M8 18v-3"/></svg>`;
  const checkIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  const giftIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>`;

  return `
    <div class="account-card loyalty-card">
      <div class="loyalty-card-head">
        <span class="loyalty-card-icon">${giftIcon}</span>
        <div>
          <h3>Buy 5, Get the 6th at 70% Off</h3>
          <p class="card-sub" style="margin-bottom:0">Every pair delivered fills a stamp. Fill all 5 and your next pair unlocks a 70% discount at checkout — then the card starts filling again.</p>
        </div>
      </div>

      ${
        ready
          ? `<div class="loyalty-reward-banner">
              <span class="badge-emoji">🎉</span>
              <span>Reward unlocked! Your next pair is 70% off — check the box for it at checkout.</span>
            </div>`
          : ""
      }

      <div class="loyalty-stamps">
        ${[0, 1, 2, 3, 4]
          .map(
            (i) => `
          <div class="loyalty-stamp ${i < stamps ? "filled" : ""}">
            <span class="loyalty-stamp-index">${i + 1}</span>
            ${i < stamps ? checkIcon : shoeIcon}
          </div>`,
          )
          .join("")}
        <div class="loyalty-stamp loyalty-stamp-reward ${ready ? "filled" : ""}">${ready ? checkIcon : "70%"}</div>
      </div>

      <div class="loyalty-progress-bar-wrap">
        <div class="loyalty-progress-bar" style="width:${percent}%"></div>
      </div>

      <p class="loyalty-progress-label">
        ${
          ready
            ? "5 / 5 — reward ready to use!"
            : `${stamps} / 5 pairs delivered toward your next 70% off`
        }
      </p>
    </div>`;
}

/* ===================================================
   EVENTS (delegated on the root, bound once)
=================================================== */
function bindAccountEvents() {
  const root = document.querySelector("[data-account-root]");
  if (!root) return;

  root.addEventListener("click", async (e) => {
    const customer = getCurrentCustomer();

    /* ---- sidebar tabs ---- */
    const tabBtn = e.target.closest("[data-account-tab]");
    if (tabBtn) {
      activeTab = tabBtn.dataset.accountTab;
      addressFormMode = null;
      deleteAccountOpen = false;
      renderAccountPage();
      return;
    }

    /* ---- logout ---- */
    if (e.target.closest("[data-account-logout]")) {
      customerLogout();
      showToast("Logged out");
      refreshAccountUI();
      window.location.href = "/index.html";
      return;
    }

    if (!customer) return;

    /* ---- avatar ---- */
    if (e.target.closest("[data-avatar-upload-trigger]")) {
      root.querySelector("[data-avatar-input]").click();
      return;
    }
    if (e.target.closest("[data-avatar-remove]")) {
      await updateCustomerAvatar(customer.id, "");
      showToast("Profile photo removed");
      refreshAccountUI();
      renderAccountPage();
      return;
    }

    /* ---- addresses ---- */
    if (e.target.closest("[data-address-add-toggle]")) {
      addressFormMode = "add";
      renderAccountPage();
      root.querySelector("[data-address-form]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (e.target.closest("[data-address-cancel]")) {
      addressFormMode = null;
      renderAccountPage();
      return;
    }
    const editBtn = e.target.closest("[data-edit-address]");
    if (editBtn) {
      addressFormMode = editBtn.dataset.editAddress;
      renderAccountPage();
      root.querySelector("[data-address-form]")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const defaultBtn = e.target.closest("[data-default-address]");
    if (defaultBtn) {
      try {
        await setDefaultCustomerAddress(customer.id, defaultBtn.dataset.defaultAddress);
      } catch (err) {
        showToast(err.message || "Couldn't update default address");
        return;
      }
      showToast("Default address updated");
      renderAccountPage();
      return;
    }
    const deleteBtn = e.target.closest("[data-delete-address]");
    if (deleteBtn) {
      if (!(await confirmDialog("Delete this address?"))) return;
      try {
        await deleteCustomerAddress(customer.id, deleteBtn.dataset.deleteAddress);
      } catch (err) {
        showToast(err.message || "Couldn't delete that address");
        return;
      }
      showToast("Address deleted");
      renderAccountPage();
      return;
    }

    /* ---- delete account toggle ---- */
    if (e.target.closest("[data-delete-account-toggle]")) {
      deleteAccountOpen = true;
      renderAccountPage();
      return;
    }
    if (e.target.closest("[data-delete-cancel]")) {
      deleteAccountOpen = false;
      renderAccountPage();
      return;
    }

    /* ---- cancel order request ---- */
    const cancelOrderBtn = e.target.closest("[data-cancel-order]");
    if (cancelOrderBtn && !cancelOrderBtn.disabled) {
      if (!(await confirmDialog("Request cancellation for this order?", { danger: false, confirmText: "Yes, request" }))) return;
      const result = await requestOrderCancellation(
        cancelOrderBtn.dataset.cancelOrder,
        customer.id,
      );
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Cancellation requested — we'll review it shortly");
      renderAccountPage();
      return;
    }
  });

  root.addEventListener("change", async (e) => {
    const customer = getCurrentCustomer();
    if (!customer) return;

    /* ---- avatar file picked ---- */
    if (e.target.matches("[data-avatar-input]")) {
      const file = e.target.files && e.target.files[0];
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
        await updateCustomerAvatar(customer.id, url);
        showToast("Profile photo updated");
        refreshAccountUI();
        renderAccountPage();
      } catch (err) {
        showToast(err.message || "Couldn't upload that photo");
      }
    }
  });

  root.addEventListener("submit", async (e) => {
    const customer = getCurrentCustomer();
    if (!customer) return;

    /* ---- add/edit address ---- */
    if (e.target.matches("[data-address-form]")) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        label: fd.get("label"),
        fullName: fd.get("fullName").trim(),
        phone: fd.get("phone").trim(),
        zone: fd.get("zone"),
        city: fd.get("city").trim(),
        addressLine: fd.get("addressLine").trim(),
        isDefault: fd.get("isDefault") === "on",
      };
      if (
        !payload.fullName ||
        !payload.phone ||
        !payload.city ||
        !payload.addressLine
      ) {
        showToast("Please fill in all required fields");
        return;
      }
      try {
        if (isEditingAddress()) {
          await updateCustomerAddress(customer.id, addressFormMode, payload);
          showToast("Address updated");
        } else {
          await addCustomerAddress(customer.id, payload);
          showToast("Address saved");
        }
      } catch (err) {
        showToast(err.message || "Couldn't save that address");
        return;
      }
      addressFormMode = null;
      renderAccountPage();
      return;
    }

    /* ---- edit profile info ---- */
    if (e.target.matches("[data-profile-form]")) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const result = await updateCustomerProfile(customer.id, {
        firstName: fd.get("firstName").trim(),
        lastName: fd.get("lastName").trim(),
        email: fd.get("email").trim(),
        phone: fd.get("phone").trim(),
      });
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Profile updated");
      refreshAccountUI();
      renderAccountPage();
      return;
    }

    /* ---- change password ---- */
    if (e.target.matches("[data-password-form]")) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const currentPassword = fd.get("currentPassword");
      const newPassword = fd.get("newPassword");
      const confirmPassword = fd.get("confirmPassword");
      if (newPassword !== confirmPassword) {
        showToast("New passwords do not match");
        return;
      }
      const result = await changeCustomerPassword(
        customer.id,
        currentPassword,
        newPassword,
      );
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast(customer.hasPassword ? "Password changed successfully" : "Password set — you can now log in with it too");
      e.target.reset();
      refreshAccountUI();
      renderAccountPage();
      return;
    }

    /* ---- delete account ---- */
    if (e.target.matches("[data-delete-account-form]")) {
      e.preventDefault();
      // Guard against double-submits (e.g. an impatient extra click while
      // the request is in flight) sending two conflicting DELETE requests.
      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn?.disabled) return;
      if (submitBtn) submitBtn.disabled = true;
      const fd = new FormData(e.target);
      const result = await deleteCustomerAccount(customer.id, fd.get("password"));
      if (submitBtn) submitBtn.disabled = false;
      if (result.error) {
        showToast(result.error);
        return;
      }
      showToast("Account deleted");
      refreshAccountUI();
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 800);
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  initNavToggle();
  bindAccountEvents();
  try {
    await Promise.all([refreshCustomerOrders(), refreshCustomerPreOrders()]);
  } catch (e) {
    /* non-fatal — the Orders tab will just show empty */
  }
  renderAccountPage();
});

// re-render whenever auth.js reports the logged-in customer changed
// (login / signup / logout from anywhere on this page, e.g. the guest
// prompt's Login button, or another tab's session ending)
document.addEventListener("kivix:account-changed", async () => {
  try {
    await Promise.all([refreshCustomerOrders(), refreshCustomerPreOrders()]);
  } catch (e) {
    /* non-fatal */
  }
  renderAccountPage();
});
