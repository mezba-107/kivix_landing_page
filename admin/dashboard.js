/* ===================================================
   KI-VIX ADMIN — Dashboard
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  function statusBadge(status) {
    const cls = String(status || "Pending").toLowerCase();
    return `<span class="admin-badge ${cls}">${status}</span>`;
  }

  async function renderStats() {
    let stats;
    try {
      stats = await apiAdmin("/stats");
    } catch (e) {
      showToast("Couldn't load dashboard stats");
      return;
    }

    const cards = [
      {
        label: "Total Products",
        num: stats.totalProducts,
        icon: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
      },
      {
        label: "Total Orders",
        num: stats.totalOrders,
        icon: '<path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1Z"/><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h6"/>',
      },
      {
        label: "Pending Orders",
        num: stats.pendingOrders,
        icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
      },
      {
        label: "Pending Pre-orders",
        num: stats.pendingPreOrders,
        icon: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      },
      {
        label: "Admins & Mods",
        num: stats.totalAdmins,
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
      },
      {
        label: "Active Coupons",
        num: stats.activeCoupons,
        icon: '<path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/>',
      },
    ];

    document.querySelector("[data-stats-grid]").innerHTML = cards
      .map(
        (s) => `
      <div class="admin-stat-card">
        <div class="top-row">
          <div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg></div>
        </div>
        <div class="num">${s.num}</div>
        <div class="label">${s.label}</div>
      </div>`,
      )
      .join("");
  }

  async function renderRecentOrders() {
    let recent = [];
    try {
      const result = await apiAdmin("/orders?limit=6");
      recent = result.orders;
    } catch (e) {
      /* leave empty */
    }
    const body = document.querySelector("[data-recent-orders]");
    const empty = document.querySelector("[data-recent-empty]");

    if (!recent.length) {
      body.innerHTML = "";
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    body.innerHTML = recent
      .map(
        (o) => `
      <tr>
        <td data-label="Order" class="cell-name">${o.displayId || `#${o.id.slice(-6).toUpperCase()}`}</td>
        <td data-label="Customer">${escapeHTML(o.customerName)}<div class="cell-sub">${escapeHTML(o.phone)}</div></td>
        <td data-label="Items">${o.items.reduce((n, i) => n + i.qty, 0)} item(s)</td>
        <td data-label="Total" class="cell-name">${formatBDT(o.total)}</td>
        <td data-label="Status">${statusBadge(o.status)}</td>
        <td data-label="Date" class="cell-sub">${new Date(o.date).toLocaleDateString()}</td>
      </tr>`,
      )
      .join("");
  }

  await Promise.all([renderStats(), renderRecentOrders()]);
})();
