/* ===================================================
   KI-VIX — Countdown Offer Bar
   Reads the single admin-configured OFFER_TIMER (+ its
   linked coupon, if any) from data.js and, when active with
   a future end time, injects a slim "Sale ends in HH:MM:SS"
   bar above the top ticker on every storefront page.
   Self-contained: ships its own CSS so no per-page stylesheet
   edits are needed. Dismissing it (the × button) hides it for
   the rest of this browser tab's session.
=================================================== */
(async function () {
  await KIVIX_READY;
  try {
    await loadOfferTimer();
  } catch (e) {
    return;
  }
  if (!OFFER_TIMER.active || !OFFER_TIMER.endsAt) return;

  const endTime = new Date(OFFER_TIMER.endsAt).getTime();
  if (!endTime || Number.isNaN(endTime) || endTime <= Date.now()) return;

  const SS_DISMISSED = "kivix_offer_timer_dismissed";
  try {
    if (sessionStorage.getItem(SS_DISMISSED) === String(endTime)) return;
  } catch (e) {
    /* sessionStorage unavailable — just show the bar every time */
  }

  // The backend already populates the linked coupon on this object, so
  // no extra lookup is needed here — just make sure it's still active.
  const coupon =
    OFFER_TIMER.coupon && OFFER_TIMER.coupon.active !== false
      ? OFFER_TIMER.coupon
      : null;

  injectStyles();

  const bar = document.createElement("div");
  bar.className = "kvx-otb";
  bar.innerHTML = `
    <div class="kvx-otb-row">
      <div class="kvx-otb-title">
        <strong>${escapeHTML(OFFER_TIMER.title || "Limited Time Offer")}</strong>
        <span>${escapeHTML(OFFER_TIMER.subtitle || "Sale ends in:")}</span>
      </div>
      <div class="kvx-otb-clock" aria-hidden="true">
        <div class="kvx-otb-box"><span data-otb-h>00</span><small>Hours</small></div>
        <span class="kvx-otb-colon">:</span>
        <div class="kvx-otb-box"><span data-otb-m>00</span><small>Mins</small></div>
        <span class="kvx-otb-colon">:</span>
        <div class="kvx-otb-box"><span data-otb-s>00</span><small>Secs</small></div>
      </div>
      <button type="button" class="kvx-otb-close" aria-label="Dismiss offer">&times;</button>
    </div>
    ${coupon ? couponPillHTML(coupon) : ""}
  `;

  const marquee = document.querySelector(".marquee");
  if (marquee && marquee.parentNode) {
    marquee.parentNode.insertBefore(bar, marquee);
  } else {
    document.body.insertBefore(bar, document.body.firstChild);
  }

  const hEl = bar.querySelector("[data-otb-h]");
  const mEl = bar.querySelector("[data-otb-m]");
  const sEl = bar.querySelector("[data-otb-s]");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      clearInterval(intervalId);
      bar.remove();
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    hEl.textContent = pad(Math.floor(totalSeconds / 3600));
    mEl.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    sEl.textContent = pad(totalSeconds % 60);
  }
  tick();
  const intervalId = setInterval(tick, 1000);

  bar.querySelector(".kvx-otb-close").addEventListener("click", () => {
    clearInterval(intervalId);
    bar.remove();
    try {
      sessionStorage.setItem(SS_DISMISSED, String(endTime));
    } catch (e) {
      /* ignore */
    }
  });

  function couponPillHTML(c) {
    const discountLabel =
      c.type === "percent" ? `${c.value}% DISCOUNT` : `৳${c.value} DISCOUNT`;
    return `
      <div class="kvx-otb-coupon">
        <span class="kvx-otb-tag">🏷</span>
        ${escapeHTML(discountLabel)} — COUPON CODE:
        <strong>${escapeHTML(c.code)}</strong>
      </div>`;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  function injectStyles() {
    if (document.getElementById("kvx-otb-styles")) return;
    const style = document.createElement("style");
    style.id = "kvx-otb-styles";
    style.textContent = `
      .kvx-otb {
        background: #0d0d0d;
        color: #fff;
        font-family: "Poppins", sans-serif;
        position: relative;
        z-index: 60;
      }
      .kvx-otb-row {
        max-width: 1240px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        padding: 10px 44px 10px 16px;
        flex-wrap: wrap;
      }
      .kvx-otb-title {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
        margin-right: auto;
      }
      .kvx-otb-title strong {
        font-size: 14.5px;
        font-weight: 700;
        letter-spacing: 0.2px;
      }
      .kvx-otb-title span {
        font-size: 11.5px;
        color: #b9b9b9;
      }
      .kvx-otb-clock {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .kvx-otb-box {
        background: #1c1c1c;
        border: 1px solid #333;
        border-radius: 6px;
        min-width: 42px;
        padding: 5px 6px 4px;
        text-align: center;
      }
      .kvx-otb-box span {
        display: block;
        font-size: 15px;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
      }
      .kvx-otb-box small {
        display: block;
        font-size: 8.5px;
        color: #9a9a9a;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-top: 1px;
      }
      .kvx-otb-colon {
        font-weight: 700;
        color: #555;
      }
      .kvx-otb-close {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #cfcfcf;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        padding: 4px 6px;
      }
      .kvx-otb-close:hover {
        color: #fff;
      }
      .kvx-otb-coupon {
        border-top: 1px dashed #333;
        text-align: center;
        font-size: 11.5px;
        font-weight: 700;
        letter-spacing: 0.3px;
        padding: 8px 16px;
        color: #ff5b6a;
      }
      .kvx-otb-coupon strong {
        color: #fff;
      }
      .kvx-otb-tag {
        margin-right: 3px;
      }
      @media (max-width: 560px) {
        .kvx-otb-row {
          justify-content: flex-start;
          padding: 10px 40px 10px 14px;
        }
        .kvx-otb-title {
          margin-right: 0;
          flex: 1 1 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }
})();
