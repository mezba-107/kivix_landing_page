/* ===================================================
   KI-VIX SNEAKERS — OFFER POPUP
   Shows the admin's active offer banner(s) (managed at
   /admin/offers.html) on every page load/refresh. If
   there is more than one active banner, small arrows/dots
   let the visitor flip through them.
   Requires: data.js (OFFER_BANNERS)
=================================================== */

function buildOfferPopup(banners) {
  if (document.querySelector("[data-offer-popup-overlay]")) return;

  let active = 0;

  const overlay = document.createElement("div");
  overlay.className = "offer-popup-overlay";
  overlay.setAttribute("data-offer-popup-overlay", "");

  function slideHTML(b) {
    const img = `<picture>${b.mobileImage ? `<source media="(max-width: 640px)" srcset="${b.mobileImage}" />` : ""}<img src="${b.image}" alt="Offer" /></picture>`;
    return b.link
      ? `<a class="offer-popup-link" href="${b.link}">${img}</a>`
      : img;
  }

  overlay.innerHTML = `
    <div class="offer-popup" role="dialog" aria-modal="true" aria-label="Special offer">
      <button type="button" class="offer-popup-close" data-offer-popup-close aria-label="Close">&times;</button>
      <div data-offer-popup-slide>${slideHTML(banners[0])}</div>
      ${
        banners.length > 1
          ? `
        <button type="button" class="offer-popup-nav prev" data-offer-popup-prev aria-label="Previous offer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></button>
        <button type="button" class="offer-popup-nav next" data-offer-popup-next aria-label="Next offer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg></button>
        <div class="offer-popup-dots">
          ${banners.map((_, i) => `<span${i === 0 ? ' class="is-active"' : ""}></span>`).join("")}
        </div>`
          : ""
      }
    </div>`;
  document.body.appendChild(overlay);

  const slideWrap = overlay.querySelector("[data-offer-popup-slide]");
  const dots = overlay.querySelectorAll(".offer-popup-dots span");

  function goTo(i) {
    active = (i + banners.length) % banners.length;
    slideWrap.innerHTML = slideHTML(banners[active]);
    dots.forEach((d, di) => d.classList.toggle("is-active", di === active));
  }

  overlay
    .querySelector("[data-offer-popup-prev]")
    ?.addEventListener("click", () => goTo(active - 1));
  overlay
    .querySelector("[data-offer-popup-next]")
    ?.addEventListener("click", () => goTo(active + 1));

  function close() {
    overlay.classList.remove("show");
    document.body.style.overflow = "";
    setTimeout(() => overlay.remove(), 300);
  }
  overlay
    .querySelector("[data-offer-popup-close]")
    .addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  requestAnimationFrame(() => {
    overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  try {
    await loadOfferBanners();
  } catch (e) {
    return;
  }
  const active = OFFER_BANNERS.filter((b) => b.active !== false && b.image);
  if (!active.length) return;

  setTimeout(() => buildOfferPopup(active), 500);
});
