/* ===================================================
   KI-VIX SNEAKERS — HOME PAGE ONLY
   This file is independent from products.js and
   Product details.js on purpose — editing this file
   will not affect the other two pages.
   Requires: data.js (PRODUCTS, CART, getProductById, formatBDT, ...)
=================================================== */

/* ---------- product card markup ---------- */
function starRowSVG(count = 5) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>`;
  }
  return out;
}

function productCardHTML(p) {
  const outOfStock = isProductOutOfStock(p);
  const badge = p.discount ? `<span class="badge">-${p.discount}%</span>` : "";
  const old = p.oldPrice
    ? `<span class="old-price">${formatBDT(p.oldPrice)}</span>`
    : "";
  const { avg, count } = getProductRatingStats(p.id);
  const ratingRowHTML = count
    ? `<div class="rating-row">
          <div class="stars">${starRowSVG(5)}</div>
          <span class="rating-value">${avg.toFixed(1)} (${count})</span>
        </div>`
    : `<div class="rating-row">
          <div class="stars no-rating">${starRowSVG(5)}</div>
          <span class="rating-value">New</span>
        </div>`;
  return `
    <a class="product-card${outOfStock ? " out-of-stock" : ""}" href="/Products/Product%20details.html?id=${p.id}" data-id="${p.id}">
      ${badge}
      ${outOfStock ? `<span class="stock-badge">Stock Out</span>` : ""}
      <button type="button" class="wishlist-btn${isInWishlist(p.id) ? " active" : ""}" data-wishlist-toggle="${p.id}" aria-label="Save ${p.name}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>
      </button>
      <div class="thumb">
        ${productCardThumbHTML(p, "0 0 300 180")}
      </div>
      <div class="card-body">
        <span class="brand-tag">${p.brand || ""}</span>
        <h3>${p.name}</h3>
        ${ratingRowHTML}
        <div class="price-row">
          <span class="price">${formatBDT(p.price)}</span>
          ${old}
        </div>
        <div class="card-actions">
          <button type="button" class="add-to-cart-btn" data-quick-add="${p.id}" aria-label="Add ${p.name} to cart"${outOfStock ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
            ${outOfStock ? "Out of Stock" : "Add to Cart"}
          </button>
          <button type="button" class="buy-now-btn" data-buy-now-card="${p.id}" aria-label="Buy ${p.name} now"${outOfStock ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>
            Buy Now
          </button>
        </div>
      </div>
    </a>`;
}

function promoCardHTML(p) {
  const badge = p.discount ? `<span class="badge">-${p.discount}%</span>` : "";
  const old = p.oldPrice
    ? `<span class="old-price">${formatBDT(p.oldPrice)}</span>`
    : "";
  return `
    <a class="promo-card" href="/Products/Product%20details.html?id=${p.id}">
      ${badge}
      <div class="thumb">
        ${productCardThumbHTML(p, "0 0 260 160")}
      </div>
      <h3>${p.name}</h3>
      <p class="price">${formatBDT(p.price)}${old}</p>
      <div class="card-actions">
        <button type="button" class="add-to-cart-btn" data-quick-add="${p.id}" aria-label="Add ${p.name} to cart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
          Add to Cart
        </button>
        <button type="button" class="buy-now-btn" data-buy-now-card="${p.id}" aria-label="Buy ${p.name} now">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 11-14h-7l1-6Z"/></svg>
          Buy Now
        </button>
      </div>
    </a>`;
}

function renderGrid(targetSelector, list) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  el.innerHTML = list.map((p) => productCardHTML(p)).join("");
}

/* ===================================================
   Reviews / testimonials (home page)
   Pulls real reviews customers left on any product via
   the API (data.js: loadReviews/PRODUCT_REVIEWS_STORE) —
   no placeholder/fake testimonials.
=================================================== */
function starsSVG(count) {
  let out = "";
  for (let i = 0; i < count; i++) {
    out += `<svg viewBox="0 0 24 24"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>`;
  }
  return out;
}

function reviewCardHTML(r, index, visibleCount) {
  const initial = (r.name || "A").trim().charAt(0).toUpperCase();
  const extraClass = index >= visibleCount ? " is-extra" : "";
  const product = getProductById(r.product);
  return `
    <div class="review-card${extraClass}">
      <svg class="quote-mark" viewBox="0 0 24 24" fill="currentColor"><path d="M9.5 7C6.5 7 4 9.5 4 12.7c0 2.7 1.9 4.6 4.3 4.6.4 0 .8-.1 1.1-.2-.5 1.5-1.8 2.7-3.4 3.1v2.3c3.4-.6 6-3.6 6-7.4V12c0-2.8-1.3-5-2.5-5zm10 0c-3 0-5.5 2.5-5.5 5.7 0 2.7 1.9 4.6 4.3 4.6.4 0 .8-.1 1.1-.2-.5 1.5-1.8 2.7-3.4 3.1v2.3c3.4-.6 6-3.6 6-7.4V12c0-2.8-1.3-5-2.5-5z"/></svg>
      <div class="review-stars">${starsSVG(r.rating)}</div>
      <p class="review-text">"${escapeHTML(r.text)}"</p>
      ${
        r.image
          ? `<div class="review-photo">
              <img
                src="${escapeHTML(r.image)}"
                alt="Photo from ${escapeHTML(r.name)}'s review"
                loading="lazy"
                data-lightbox-img="${escapeHTML(r.image)}"
                data-lightbox-alt="Photo from ${escapeHTML(r.name)}'s review"
              />
            </div>`
          : ""
      }
      <div class="review-author">
        <div class="review-avatar">${escapeHTML(initial)}</div>
        <div class="review-author-info">
          <h4>${escapeHTML(r.name)}</h4>
          <span>${product ? `On ${escapeHTML(product.name)}` : ""}</span>
        </div>
      </div>
    </div>`;
}

const REVIEWS_VISIBLE_COUNT = 3;

async function renderReviews() {
  const section = document.querySelector(".reviews-section");
  const el = document.querySelector("[data-reviews]");
  const toggleWrap = document.querySelector(".reviews-more");
  const toggleBtn = document.querySelector("[data-reviews-toggle]");
  const toggleLabel = document.querySelector("[data-reviews-toggle-label]");
  if (!el) return;

  let reviews = [];
  try {
    reviews = await loadReviews(); // every review, across all products, newest first
  } catch (e) {
    /* leave empty — section hides below */
  }

  if (!reviews.length) {
    if (section) section.style.display = "none";
    return;
  }
  if (section) section.style.display = "";

  el.innerHTML = reviews
    .map((r, i) => reviewCardHTML(r, i, REVIEWS_VISIBLE_COUNT))
    .join("");
  enableImageLightbox(el);

  if (!toggleWrap || !toggleBtn) return;

  if (reviews.length <= REVIEWS_VISIBLE_COUNT) {
    toggleWrap.style.display = "none";
    return;
  }

  toggleWrap.style.display = "";
  let expanded = false;
  toggleBtn.addEventListener("click", () => {
    expanded = !expanded;
    el.querySelectorAll(".review-card.is-extra").forEach((card) => {
      card.classList.toggle("show", expanded);
    });
    toggleBtn.classList.toggle("is-open", expanded);
    if (toggleLabel) {
      toggleLabel.textContent = expanded ? "Show Less" : "View More Reviews";
    }
  });
}

/* ===================================================
   Infinite auto-sliding promo carousel (home page hero offer)
=================================================== */
function initCarousel() {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const track = root.querySelector(".carousel-track");
  const dotsWrap = root.querySelector(".carousel-dots");
  const prevBtn = root.querySelector(".carousel-arrow.prev");
  const nextBtn = root.querySelector(".carousel-arrow.next");

  const offerProducts = PRODUCTS.filter((p) => p.discount > 0);
  const slides = offerProducts.length ? offerProducts : PRODUCTS;

  // Headline reflects the real, current best discount instead of a
  // hardcoded number — updates itself whenever the admin changes
  // product discounts.
  const headingEl = document.querySelector("[data-offer-heading]");
  if (headingEl) {
    if (offerProducts.length) {
      const maxDiscount = Math.max(...offerProducts.map((p) => p.discount));
      headingEl.textContent = `Up to ${maxDiscount}% Off`;
    } else {
      headingEl.textContent = "This Week's Picks";
    }
  }

  // The infinite-loop effect below works by cloning the first few slides
  // onto the end of the track, so it can scroll "past" the last card and
  // snap back invisibly. With only one real slide, that clone is just the
  // same card shown twice — so skip the loop machinery entirely and show
  // the single card once, with no arrows/dots/autoplay.
  const canLoop = slides.length > 1;

  function perView() {
    const w = window.innerWidth;
    if (w <= 720) return 1.6;
    if (w <= 1024) return 2;
    return 4;
  }

  let index = 0;
  let items = canLoop
    ? [...slides, ...slides.slice(0, Math.ceil(perView()))]
    : [...slides];
  track.innerHTML = items.map(promoCardHTML).join("");

  if (!canLoop) {
    dotsWrap.innerHTML = "";
    dotsWrap.style.display = "none";
    if (prevBtn) prevBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "none";
    return;
  }

  dotsWrap.innerHTML = slides
    .map(
      (_, i) =>
        `<button aria-label="Go to slide ${i + 1}" class="${i === 0 ? "active" : ""}"></button>`,
    )
    .join("");
  const dots = [...dotsWrap.children];

  function cardWidth() {
    const card = track.querySelector(".promo-card");
    if (!card) return 0;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap || 18);
    return card.getBoundingClientRect().width + gap;
  }

  function goTo(i, instant = false) {
    track.style.transition = instant
      ? "none"
      : "transform .5s cubic-bezier(.65,0,.35,1)";
    track.style.transform = `translateX(-${i * cardWidth()}px)`;
    dots.forEach((d, di) =>
      d.classList.toggle(
        "active",
        di === ((i % slides.length) + slides.length) % slides.length,
      ),
    );
  }

  function next() {
    index++;
    goTo(index);
    if (index >= slides.length) {
      setTimeout(() => {
        index = 0;
        goTo(index, true);
      }, 520);
    }
  }
  function prev() {
    if (index <= 0) {
      index = slides.length;
      goTo(index, true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          index--;
          goTo(index);
        }),
      );
      return;
    }
    index--;
    goTo(index);
  }

  goTo(0, true);

  let timer = setInterval(next, 3200);
  function pause() {
    clearInterval(timer);
  }
  function resume() {
    clearInterval(timer);
    timer = setInterval(next, 3200);
  }

  nextBtn?.addEventListener("click", () => {
    next();
    resume();
  });
  prevBtn?.addEventListener("click", () => {
    prev();
    resume();
  });
  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", resume);

  dots.forEach((d, i) =>
    d.addEventListener("click", () => {
      index = i;
      goTo(index);
      resume();
    }),
  );

  let resizeT;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      items = [...slides, ...slides.slice(0, Math.ceil(perView()))];
      track.innerHTML = items.map(promoCardHTML).join("");
      goTo(index, true);
    }, 150);
  });
}

/* ---------- hero slideshow ---------- */
function initHeroSlideshow() {
  const mount = document.getElementById("hero-shoe");
  if (!mount) return;

  // If the admin has uploaded custom hero images (Homepage page in
  // /admin), show those. Otherwise fall back to the built-in
  // placeholder tone slides so the hero never looks empty.
  const uploaded =
    typeof HERO_SLIDES !== "undefined" && HERO_SLIDES.length
      ? HERO_SLIDES
      : null;

  const slideCount = uploaded ? uploaded.length : 6;
  const tones = [
    "#e30613", // red
    "#1a1a1a", // black
    "#e7e7e2", // white
    "#1b2a4a", // navy
    "#3b4a2f", // olive
    "#6e1423", // burgundy
  ];

  const arrowSvg = (path) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;

  mount.innerHTML = `
    <div class="hero-slideshow-stage${uploaded ? " has-photo" : ""}">
      ${(uploaded || tones)
        .map((item, i) => {
          const inner = uploaded
            ? `<div class="hero-photo-backdrop" style="--pc-img:url('${item.image}');--mob-img:url('${item.mobileImage || item.image}')"></div><picture>${item.mobileImage ? `<source media="(max-width: 720px)" srcset="${item.mobileImage}" />` : ""}<img src="${item.image}" alt="KI-VIX hero" class="hero-photo" draggable="false" /></picture>`
            : sneakerSVG(item, "0 0 320 200");
          const bg = uploaded ? "" : ` style="background:${item}14"`;
          return `<div class="hero-slide${i === 0 ? " is-active" : ""}"${bg}>${inner}</div>`;
        })
        .join("")}
      ${
        slideCount > 1
          ? `<button type="button" class="hero-slide-nav prev" aria-label="Previous slide">${arrowSvg("M15 18l-6-6 6-6")}</button>
             <button type="button" class="hero-slide-nav next" aria-label="Next slide">${arrowSvg("M9 18l6-6-6-6")}</button>`
          : ""
      }
    </div>
    <div class="hero-slideshow-dots">
      ${Array.from({ length: slideCount })
        .map((_, i) => `<span${i === 0 ? ' class="is-active"' : ""}></span>`)
        .join("")}
    </div>`;

  const slides = mount.querySelectorAll(".hero-slide");
  const dots = mount.querySelectorAll(".hero-slideshow-dots span");
  const stage = mount.querySelector(".hero-slideshow-stage");
  if (slides.length < 2) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  let active = 0;
  let timer = null;

  function show(index) {
    slides[active].classList.remove("is-active");
    dots[active].classList.remove("is-active");
    active = (index + slides.length) % slides.length;
    slides[active].classList.add("is-active");
    dots[active].classList.add("is-active");
  }

  function next() {
    show(active + 1);
  }
  function prev() {
    show(active - 1);
  }

  function startAuto() {
    if (reduceMotion) return;
    clearInterval(timer);
    timer = setInterval(next, 4200);
  }
  function stopAuto() {
    clearInterval(timer);
  }
  // manual navigation restarts the autoplay timer so it never fights the user
  function goTo(index) {
    show(index);
    startAuto();
  }

  mount.querySelector(".hero-slide-nav.next")?.addEventListener("click", () => {
    next();
    startAuto();
  });
  mount.querySelector(".hero-slide-nav.prev")?.addEventListener("click", () => {
    prev();
    startAuto();
  });
  dots.forEach((dot, i) => dot.addEventListener("click", () => goTo(i)));

  // swipe support (touch + mouse drag) on the stage
  let dragStartX = null;
  const onDragStart = (x) => {
    dragStartX = x;
    stopAuto();
  };
  const onDragEnd = (x) => {
    if (dragStartX === null) return;
    const delta = x - dragStartX;
    dragStartX = null;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    startAuto();
  };
  stage.addEventListener(
    "touchstart",
    (e) => onDragStart(e.touches[0].clientX),
    {
      passive: true,
    },
  );
  stage.addEventListener("touchend", (e) =>
    onDragEnd(e.changedTouches[0].clientX),
  );

  // Mouse drag: listen for mouseup on the whole document, not just the
  // stage. The photo can otherwise trigger the browser's native
  // "drag the image" behaviour, which hijacks the mouseup event so it
  // never reaches the stage — leaving stopAuto() called with no matching
  // startAuto(), permanently freezing the slideshow. Tracking mouseup on
  // document (and always cleaning up) guarantees autoplay always resumes.
  stage.addEventListener("dragstart", (e) => e.preventDefault());
  stage.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onDragStart(e.clientX);
    const onMouseUp = (ev) => {
      onDragEnd(ev.clientX);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mouseup", onMouseUp);
  });

  // Note: autoplay is intentionally NOT paused on hover here. The hero
  // fills almost the whole first screen, so the cursor rests over it
  // constantly during normal browsing — pausing on hover made the
  // slideshow look like it only ever advanced once, then froze. It
  // still pauses correctly while the user is actively dragging/
  // swiping (see mousedown/touchstart above).

  startAuto();
}

/* ---------- mobile nav toggle ---------- */
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

/* ---------- home page bootstrap ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  try {
    await loadHeroSlides();
  } catch (e) {
    /* fall back to the default illustrated slides below */
  }

  initNavToggle();

  renderGrid(
    "[data-grid]",
    shuffleArray(PRODUCTS.filter((p) => !isProductOutOfStock(p))).slice(0, 6),
  );
  initHeroSlideshow();
  initCarousel();
  await renderReviews();
});
