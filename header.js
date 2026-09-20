/* ===================================================
   KI-VIX SNEAKERS — SHARED HEADER MODULE
   Used by every page (home, collection, product details,
   checkout). Handles:
     1) the Search icon in the nav (live product search)
     2) the Contact link in the nav (Facebook / WhatsApp
        popover instead of a page jump)

   Requires: data.js (PRODUCTS, formatBDT) and cart.js
   (sneakerSVG) to already be loaded on the page.
=================================================== */

/* ---- EDIT THESE TWO LINES with your real links ---- */
const KIVIX_FACEBOOK_URL = "https://www.facebook.com/share/1DdCFrKcYL/?mibextid=wwXIfr"; // your Facebook Page (Messenger) link
const KIVIX_WHATSAPP_URL = "https://wa.me/8801762303310"; // your WhatsApp number, e.g. https://wa.me/8801812345678
/* ----------------------------------------------------- */

/* ===================================================
   SEARCH OVERLAY
=================================================== */
function buildSearchOverlay() {
  const existing = document.querySelector("[data-search-overlay]");
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.className = "search-overlay";
  overlay.setAttribute("data-search-overlay", "");
  overlay.innerHTML = `
    <div class="search-modal" role="dialog" aria-modal="true" aria-label="Search sneakers">
      <div class="search-modal-head">
        <svg class="search-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input type="text" placeholder="Search sneakers, brands..." data-search-input autocomplete="off" />
        <button type="button" class="search-close" data-search-close aria-label="Close search">&times;</button>
      </div>
      <div class="search-results" data-search-results></div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeSearchOverlay();
  });
  overlay
    .querySelector("[data-search-close]")
    .addEventListener("click", closeSearchOverlay);
  overlay
    .querySelector("[data-search-input]")
    .addEventListener("input", (e) => renderSearchResults(e.target.value));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearchOverlay();
  });

  document.querySelectorAll("[data-search-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openSearchOverlay();
    });
  });

  return overlay;
}

function renderSearchResults(query) {
  const wrap = document.querySelector("[data-search-results]");
  if (!wrap) return;
  const q = query.trim().toLowerCase();

  if (!q) {
    wrap.innerHTML = `<p class="search-hint">Start typing to search our sneaker collection.</p>`;
    return;
  }

  const list = typeof PRODUCTS !== "undefined" ? PRODUCTS : [];
  const matches = list.filter((p) => {
    const haystack = `${p.name} ${p.brand || ""} ${p.tag || ""}`.toLowerCase();
    return haystack.includes(q);
  });

  if (!matches.length) {
    wrap.innerHTML = `<p class="search-hint">No sneakers found for &ldquo;${query}&rdquo;.</p>`;
    return;
  }

  wrap.innerHTML = matches
    .map((p) => {
      const thumb = typeof productThumbHTML === "function" ? productThumbHTML(p) : "";
      const price =
        typeof formatBDT === "function" ? formatBDT(p.price) : p.price;
      return `
      <a class="search-result-item" href="/Products/Product%20details.html?id=${p.id}">
        <span class="search-result-thumb">${thumb}</span>
        <span class="search-result-info">
          <span class="search-result-name">${p.name}</span>
          <span class="search-result-brand">${p.brand || ""}</span>
        </span>
        <span class="search-result-price">${price}</span>
      </a>`;
    })
    .join("");
}

function openSearchOverlay() {
  const overlay = buildSearchOverlay();
  document
    .querySelectorAll("[data-contact-popover]")
    .forEach((p) => (p.hidden = true));
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
  renderSearchResults("");
  const input = overlay.querySelector("[data-search-input]");
  input.value = "";
  setTimeout(() => input.focus(), 60);
}

function closeSearchOverlay() {
  const overlay = document.querySelector("[data-search-overlay]");
  if (!overlay) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
}

/* ===================================================
   NAV CONTACT POPOVER (Facebook Messenger / WhatsApp)
=================================================== */
function buildContactPopover(wrap) {
  const link = wrap.querySelector("[data-contact-toggle]");
  if (!link || wrap.querySelector("[data-contact-popover]")) return;

  const popover = document.createElement("div");
  popover.className = "contact-popover";
  popover.setAttribute("data-contact-popover", "");
  popover.hidden = true;
  popover.innerHTML = `
    <a class="contact-popover-btn contact-fb" href="${KIVIX_FACEBOOK_URL}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34v7.03C18.34 21.22 22 17.06 22 12.06Z"/></svg>
      <span>Message us on Facebook</span>
    </a>
    <a class="contact-popover-btn contact-wa" href="${KIVIX_WHATSAPP_URL}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2Zm0 18.13c-1.6 0-3.1-.44-4.38-1.2l-.31-.18-3 .79.8-2.92-.2-.3A8.1 8.1 0 1 1 12 20.13Zm4.44-6.06c-.24-.12-1.44-.71-1.66-.79-.22-.08-.39-.12-.55.12s-.63.79-.78.95c-.14.16-.28.18-.53.06a6.62 6.62 0 0 1-1.94-1.2 7.28 7.28 0 0 1-1.34-1.67c-.14-.24 0-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.65.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.11-.22-.17-.46-.28Z"/></svg>
      <span>Chat on WhatsApp</span>
    </a>`;
  wrap.appendChild(popover);

  link.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll("[data-contact-popover]").forEach((p) => {
      if (p !== popover) p.hidden = true;
    });
    closeSearchOverlay();
    popover.hidden = !popover.hidden;
  });
}

function initContactMenus() {
  document.querySelectorAll("[data-contact-menu]").forEach(buildContactPopover);

  document.addEventListener("click", () => {
    document
      .querySelectorAll("[data-contact-popover]")
      .forEach((p) => (p.hidden = true));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  buildSearchOverlay();
  initContactMenus();
});
