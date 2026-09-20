/* ===================================================
   KI-VIX ADMIN — Homepage hero slideshow images
   Each slide has a PC image (required) and an optional Mobile
   image. The homepage shows the PC image on desktop and the
   Mobile image on phones (falls back to PC if none uploaded).
   Images upload straight to Cloudinary via uploadImage().
=================================================== */
(async function () {
  const admin = await requireAdminAuth();
  if (!admin) return;
  initAdminShell(admin);

  const grid = document.querySelector("[data-hero-grid]");
  const newPc = document.querySelector("[data-new-pc]");
  const newMobile = document.querySelector("[data-new-mobile]");
  const newPcPrev = document.querySelector("[data-new-pc-preview]");
  const newMobilePrev = document.querySelector("[data-new-mobile-preview]");
  const addBtn = document.querySelector("[data-add-slide]");
  const canDelete = admin.role !== "Mod";

  const thumb = (src, w, h, label) =>
    src
      ? `<div class="admin-gallery-thumb" style="width:${w}px;height:${h}px"><img src="${src}" alt="${label}" /></div>`
      : `<div class="admin-gallery-thumb" style="width:${w}px;height:${h}px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--muted);text-align:center;padding:6px">No mobile image<br/>(PC image used)</div>`;

  function render() {
    if (!HERO_SLIDES.length) {
      grid.innerHTML = `<div class="admin-empty" style="padding:30px 10px">
        No custom hero images yet — the homepage is showing its default illustration.
      </div>`;
      return;
    }
    grid.innerHTML = HERO_SLIDES.map(
      (s, i) => `
      <div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap;padding:12px;border:1.5px solid var(--line);border-radius:12px;max-width:640px">
        <div>
          <div style="font-size:12px;margin-bottom:6px">Slide ${i + 1} · PC</div>
          ${thumb(s.image, 200, 90, "PC image")}
          <label class="admin-file-btn admin-file-btn-inline">Replace PC
            <input type="file" accept="image/*" hidden data-replace="image" data-id="${s.id}" />
          </label>
        </div>
        <div>
          <div style="font-size:12px;margin-bottom:6px">Mobile</div>
          ${thumb(s.mobileImage, 70, 90, "Mobile image")}
          <label class="admin-file-btn admin-file-btn-inline">${s.mobileImage ? "Replace" : "Add"} Mobile
            <input type="file" accept="image/*" hidden data-replace="mobileImage" data-id="${s.id}" />
          </label>
          ${s.mobileImage ? `<button type="button" class="admin-file-btn admin-file-btn-inline" data-clear-mobile="${s.id}">Remove Mobile</button>` : ""}
        </div>
        ${canDelete ? `<button type="button" class="admin-file-btn admin-file-btn-inline" style="margin-left:auto" data-remove-hero="${s.id}">Delete slide</button>` : ""}
      </div>`,
    ).join("");
  }

  function preview(input, box, w, h) {
    const f = input.files && input.files[0];
    box.innerHTML = f
      ? thumb(URL.createObjectURL(f), w, h, "preview")
      : "";
  }
  newPc.addEventListener("change", () => preview(newPc, newPcPrev, 200, 90));
  newMobile.addEventListener("change", () =>
    preview(newMobile, newMobilePrev, 70, 90),
  );

  addBtn.addEventListener("click", async () => {
    const pcFile = newPc.files && newPc.files[0];
    const mobFile = newMobile.files && newMobile.files[0];
    if (!pcFile) {
      showToast("Please choose a PC image first");
      return;
    }
    addBtn.disabled = true;
    addBtn.textContent = "Uploading…";
    try {
      const [image, mobileImage] = await Promise.all([
        uploadImage(pcFile, "hero-slides"),
        mobFile ? uploadImage(mobFile, "hero-slides") : Promise.resolve(""),
      ]);
      await addHeroSlide({ image, mobileImage });
      newPc.value = "";
      newMobile.value = "";
      newPcPrev.innerHTML = "";
      newMobilePrev.innerHTML = "";
      render();
      showToast("Hero slide added");
    } catch (err) {
      showToast(err.message || "Couldn't add that slide");
    }
    addBtn.disabled = false;
    addBtn.textContent = "Add Slide";
  });

  grid.addEventListener("change", async (e) => {
    const input = e.target.closest("[data-replace]");
    if (!input || !input.files[0]) return;
    showToast("Uploading image…");
    try {
      const url = await uploadImage(input.files[0], "hero-slides");
      await updateHeroSlide(input.dataset.id, {
        [input.dataset.replace]: url,
      });
      showToast("Image updated");
    } catch (err) {
      showToast(err.message || "Couldn't update that image");
    }
    render();
  });

  grid.addEventListener("click", async (e) => {
    const clr = e.target.closest("[data-clear-mobile]");
    if (clr) {
      try {
        await updateHeroSlide(clr.dataset.clearMobile, { mobileImage: "" });
      } catch (err) {
        showToast(err.message || "Couldn't remove mobile image");
      }
      render();
      return;
    }
    const btn = e.target.closest("[data-remove-hero]");
    if (!btn) return;
    try {
      await deleteHeroSlide(btn.dataset.removeHero);
    } catch (err) {
      showToast(err.message || "Couldn't remove that slide");
      return;
    }
    render();
  });

  try {
    await loadHeroSlides();
  } catch (e) {
    showToast("Couldn't load hero images");
  }
  render();
})();
