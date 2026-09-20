/* ===================================================
   KI-VIX — global loading overlay controller
   Injects the overlay markup once, then exposes
   window.showLoading() / window.hideLoading().

   apiRequest() in data.js calls these around every
   network call, so any page that loads data.js gets
   the loading screen for free — no per-page wiring.

   Handles overlapping requests with a counter, and
   avoids flicker on fast requests:
   - only shows if a request is still running after 150ms
   - once shown, stays visible at least 300ms
=================================================== */

(function () {
  const SHOW_DELAY = 150; // ms — don't show for very fast requests
  const MIN_VISIBLE = 300; // ms — avoid a one-frame flash once shown

  let pending = 0;
  let showTimer = null;
  let shownAt = 0;
  let overlayEl = null;

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = document.createElement("div");
    overlayEl.id = "kivix-loading-overlay";
    overlayEl.setAttribute("aria-hidden", "true");
    overlayEl.innerHTML =
      '<div class="kivix-loading-box">' +
      '<div class="kivix-spinner"></div>' +
      '<div class="kivix-loading-text">Loading…</div>' +
      "</div>";
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function reveal() {
    const el = ensureOverlay();
    el.classList.add("is-visible");
    shownAt = Date.now();
  }

  function conceal() {
    if (overlayEl) overlayEl.classList.remove("is-visible");
  }

  function showLoading() {
    pending++;
    if (pending === 1 && !showTimer) {
      showTimer = setTimeout(() => {
        showTimer = null;
        if (pending > 0) reveal();
      }, SHOW_DELAY);
    }
  }

  function hideLoading() {
    pending = Math.max(0, pending - 1);
    if (pending > 0) return;

    if (showTimer) {
      // finished before it ever became visible — nothing to hide
      clearTimeout(showTimer);
      showTimer = null;
      return;
    }

    const elapsed = Date.now() - shownAt;
    const wait = Math.max(0, MIN_VISIBLE - elapsed);
    setTimeout(() => {
      if (pending === 0) conceal();
    }, wait);
  }

  function whenBodyReady(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  whenBodyReady(ensureOverlay);

  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
})();
