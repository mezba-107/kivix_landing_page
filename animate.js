/* ===================================================
   KI-VIX SNEAKERS — SHARED ENTRANCE ANIMATION
   A small, subtle reveal applied to the common building
   blocks on every page. Runs once on window "load" so it
   picks up content rendered by each page's own script
   (product grids, reviews, related products, ...).
=================================================== */
(function () {
  const HERO_SELECTOR =
    ".hero .eyebrow, .hero h1, .hero-copy, .hero-features, .hero-cta-row, .promo-copy .eyebrow, .promo-copy h2, .promo-copy p, .promo-copy .btn-secondary";
  const MEDIA_SELECTOR = ".hero-media";
  const CARD_SELECTOR =
    ".product-card, .promo-card, .review-card, .bento-card, .pdp-review-card";
  const PLAIN_SELECTOR = [
    ".trust-item",
    ".section-head",
    ".collection-hero .eyebrow",
    ".collection-hero h1",
    ".collection-hero .subtitle",
    ".filter-row",
    ".breadcrumb",
    ".pdp-thumbs",
    ".pdp-main",
    ".pdp-info",
    ".reviews-summary-card",
    ".write-review-form",
    ".reviews-list-head",
    ".checkout-steps",
    ".checkout-card",
    ".summary-card",
    ".checkout-empty",
    ".checkout-success",
    ".account-hero .eyebrow",
    ".account-hero h1",
    ".account-guest",
    ".footer-top > div",
  ].join(",");

  function reveal() {
    const allSelector = `${HERO_SELECTOR}, ${MEDIA_SELECTOR}, ${CARD_SELECTOR}, ${PLAIN_SELECTOR}`;

    if (!("IntersectionObserver" in window)) {
      document
        .querySelectorAll(allSelector)
        .forEach((el) => el.classList.add("reveal-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" },
    );

    // Hero copy: cascading line-by-line entrance
    document.querySelectorAll(HERO_SELECTOR).forEach((el, i) => {
      el.classList.add("reveal-hero");
      el.style.transitionDelay = `${i * 0.1}s`;
      io.observe(el);
    });

    // Hero media: fade + gentle scale-in, timed to land mid-cascade
    document.querySelectorAll(MEDIA_SELECTOR).forEach((el) => {
      el.classList.add("reveal-media");
      el.style.transitionDelay = "0.15s";
      io.observe(el);
    });

    // Cards: stagger by position within their own row/parent
    const cardParents = new Set();
    document.querySelectorAll(CARD_SELECTOR).forEach((el) => {
      if (el.parentElement) cardParents.add(el.parentElement);
    });
    cardParents.forEach((parent) => {
      const cards = Array.from(parent.children).filter((el) =>
        el.matches(CARD_SELECTOR),
      );
      cards.forEach((el, i) => {
        el.classList.add("reveal-card");
        el.style.transitionDelay = `${(i % 4) * 0.08}s`;
        io.observe(el);
      });
    });

    // Everything else: simple sequential fade-up
    document.querySelectorAll(PLAIN_SELECTOR).forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${(i % 6) * 0.06}s`;
      io.observe(el);
    });
  }

  window.addEventListener("load", () => setTimeout(reveal, 30));
})();
