/* ===================================================
   KI-VIX ADMIN — Offers
   Countdown bar (OFFER_TIMER) + popup banners (OFFER_BANNERS),
   both backed by the API in data.js. Banner images upload
   straight to Cloudinary via uploadImage().
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  /* ---------------- Countdown offer bar ---------------- */
  const timerForm = document.querySelector("[data-timer-form]");
  const timerCouponSelect = document.querySelector(
    "[data-timer-coupon-select]",
  );

  function toDatetimeLocalValue(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderTimerCouponOptions() {
    const currentId = OFFER_TIMER.coupon ? String(OFFER_TIMER.coupon.id) : "";
    timerCouponSelect.innerHTML =
      `<option value="">None</option>` +
      COUPONS.map(
        (c) =>
          `<option value="${c.id}" ${currentId === String(c.id) ? "selected" : ""}>${c.code} — ${c.type === "percent" ? `${c.value}%` : `৳${c.value}`} off</option>`,
      ).join("");
  }

  function loadTimerForm() {
    renderTimerCouponOptions();
    timerForm.querySelector('[name="title"]').value = OFFER_TIMER.title || "";
    timerForm.querySelector('[name="subtitle"]').value =
      OFFER_TIMER.subtitle || "";
    timerForm.querySelector('[name="endsAt"]').value = toDatetimeLocalValue(
      OFFER_TIMER.endsAt,
    );
    timerForm.querySelector('[name="active"]').checked = !!OFFER_TIMER.active;
  }

  timerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(timerForm);
    const endsAt = fd.get("endsAt");
    const active = fd.get("active") === "on";
    if (active && !endsAt) {
      showToast("Pick when the countdown should end");
      return;
    }
    if (active && new Date(endsAt) <= new Date()) {
      showToast("Pick a countdown end time in the future");
      return;
    }
    try {
      await saveOfferTimer({
        title: fd.get("title").trim() || "Limited Time Offer",
        subtitle: fd.get("subtitle").trim() || "Sale ends in:",
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        couponId: fd.get("couponId") || null,
        active,
      });
    } catch (err) {
      showToast(err.message || "Couldn't save the offer bar");
      return;
    }
    loadTimerForm();
    showToast("Offer bar saved");
  });

  /* ---------------- Popup banners ---------------- */
  const list = document.querySelector("[data-offer-list]");
  const countEl = document.querySelector("[data-offer-count]");
  const newPc = document.querySelector("[data-new-pc]");
  const newMobile = document.querySelector("[data-new-mobile]");
  const newPcPrev = document.querySelector("[data-new-pc-preview]");
  const newMobilePrev = document.querySelector("[data-new-mobile-preview]");
  const addBtn = document.querySelector("[data-add-offer]");

  const thumbBox = (src, w, h) =>
    src
      ? `<img src="${src}" alt="" style="width:${w}px;height:${h}px;object-fit:cover;border-radius:8px;border:1.5px solid var(--line)" />`
      : `<div style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center;color:var(--muted);border:1.5px solid var(--line);border-radius:8px;padding:4px">No mobile image<br/>(PC used)</div>`;
  function preview(inp, box, w, h) {
    const f = inp.files && inp.files[0];
    box.innerHTML = f ? thumbBox(URL.createObjectURL(f), w, h) : "";
  }
  newPc.addEventListener("change", () => preview(newPc, newPcPrev, 130, 82));
  newMobile.addEventListener("change", () =>
    preview(newMobile, newMobilePrev, 62, 82),
  );

  function offerCardHTML(b) {
    return `
      <div class="admin-offer-card" data-offer-card="${b.id}">
        <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:11.5px;margin-bottom:4px">PC</div>
            ${thumbBox(b.image, 130, 82)}
            <label class="admin-file-btn admin-file-btn-inline" style="margin-top:6px">Replace PC
              <input type="file" accept="image/*" hidden data-offer-replace="image" data-id="${b.id}" />
            </label>
          </div>
          <div>
            <div style="font-size:11.5px;margin-bottom:4px">Mobile</div>
            ${thumbBox(b.mobileImage, 62, 82)}
            <label class="admin-file-btn admin-file-btn-inline" style="margin-top:6px">${b.mobileImage ? "Replace" : "Add"} Mobile
              <input type="file" accept="image/*" hidden data-offer-replace="mobileImage" data-id="${b.id}" />
            </label>
            ${b.mobileImage ? `<button type="button" class="admin-file-btn admin-file-btn-inline" style="margin-top:6px" data-clear-offer-mobile="${b.id}">Remove Mobile</button>` : ""}
          </div>
        </div>
        <div class="admin-offer-card-body">
          <input
            type="text"
            placeholder="Link (optional) — e.g. /Products/products.html"
            value="${b.link ? b.link.replace(/"/g, "&quot;") : ""}"
            data-offer-link="${b.id}"
          />
          <label class="admin-offer-toggle">
            <input type="checkbox" data-offer-active="${b.id}" ${b.active !== false ? "checked" : ""} />
            Active (shown to visitors)
          </label>
        </div>
        <div class="admin-offer-card-actions">
          ${admin.role !== "Mod" ? `<button type="button" class="admin-btn-sm danger" data-remove-offer="${b.id}">Delete</button>` : ""}
        </div>
      </div>`;
  }

  function render() {
    countEl.textContent = OFFER_BANNERS.length;
    if (!OFFER_BANNERS.length) {
      list.innerHTML = `<div class="admin-empty" style="padding:30px 10px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>
        No offer banners yet — visitors won't see a popup until you add one.
      </div>`;
      return;
    }
    list.innerHTML = OFFER_BANNERS.map(offerCardHTML).join("");
  }

  addBtn.addEventListener("click", async () => {
    const pcFile = newPc.files && newPc.files[0];
    const mobFile = newMobile.files && newMobile.files[0];
    if (!pcFile) {
      showToast("Please choose a PC image first");
      return;
    }
    if (OFFER_BANNERS.length >= 5) {
      showToast("You can add up to 5 offer banners");
      return;
    }
    addBtn.disabled = true;
    addBtn.textContent = "Uploading…";
    try {
      const [image, mobileImage] = await Promise.all([
        uploadImage(pcFile, "offer-banners"),
        mobFile ? uploadImage(mobFile, "offer-banners") : Promise.resolve(""),
      ]);
      await addOfferBanner({ image, mobileImage, link: "", active: true });
      newPc.value = "";
      newMobile.value = "";
      newPcPrev.innerHTML = "";
      newMobilePrev.innerHTML = "";
      render();
      showToast("Offer banner added");
    } catch (err) {
      showToast(err.message || "Couldn't add that banner");
    }
    addBtn.disabled = false;
    addBtn.textContent = "Add Banner";
  });

  list.addEventListener("click", async (e) => {
    const clr = e.target.closest("[data-clear-offer-mobile]");
    if (clr) {
      try {
        await updateOfferBanner(clr.dataset.clearOfferMobile, {
          mobileImage: "",
        });
      } catch (err) {
        showToast(err.message || "Couldn't remove mobile image");
      }
      render();
      return;
    }
    const btn = e.target.closest("[data-remove-offer]");
    if (!btn) return;
    try {
      await deleteOfferBanner(btn.dataset.removeOffer);
    } catch (err) {
      showToast(err.message || "Couldn't remove that banner");
      return;
    }
    render();
    showToast("Banner removed");
  });

  list.addEventListener("change", async (e) => {
    const rep = e.target.closest("[data-offer-replace]");
    if (rep) {
      if (!rep.files[0]) return;
      showToast("Uploading image…");
      try {
        const url = await uploadImage(rep.files[0], "offer-banners");
        await updateOfferBanner(rep.dataset.id, {
          [rep.dataset.offerReplace]: url,
        });
        showToast("Image updated");
      } catch (err) {
        showToast(err.message || "Couldn't update that image");
      }
      render();
      return;
    }
    const linkInput = e.target.closest("[data-offer-link]");
    if (linkInput) {
      try {
        await updateOfferBanner(linkInput.dataset.offerLink, {
          link: linkInput.value.trim(),
        });
      } catch (err) {
        showToast(err.message || "Couldn't save that link");
      }
      return;
    }
    const activeToggle = e.target.closest("[data-offer-active]");
    if (activeToggle) {
      try {
        await updateOfferBanner(activeToggle.dataset.offerActive, {
          active: activeToggle.checked,
        });
      } catch (err) {
        showToast(err.message || "Couldn't update that banner");
      }
    }
  });

  try {
    await Promise.all([loadOfferBanners(true), loadCoupons(), loadOfferTimer()]);
  } catch (e) {
    showToast("Couldn't load offers");
  }
  loadTimerForm();
  render();
})();
