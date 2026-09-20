/* ===================================================
   KI-VIX SNEAKERS — CHECKOUT PAGE ONLY
   Independent from script.js / products.js / Product details.js.
   Requires: data.js (CART, PRODUCTS, formatBDT, getCartTotal,
             updateCartQty, removeFromCart, getCartCount,
             clearCart, addOrder, WISHLIST helpers)
=================================================== */

const DELIVERY_ZONES = {
  inside: { label: "Inside Dhaka", sub: "Delivery within 1-2 days", fee: 80 },
  outside: {
    label: "Outside Dhaka",
    sub: "Delivery within 3-5 days",
    fee: 140,
  },
};

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

/* ===================================================
   Checkout page rendering
=================================================== */
let selectedZone = null;
let appliedCoupon = null; // { coupon, discount } once a valid code is applied
let useLoyaltyReward = false; // whether the shopper checked "use my reward"

async function renderCheckout() {
  const root = document.querySelector("[data-checkout-root]");

  if (!CART.length) {
    root.innerHTML = `
      <div class="checkout-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1.4"/><circle cx="18" cy="21" r="1.4"/><path d="M2 3h2l2.6 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L21 7H6"/></svg>
        <h2>Your cart is empty</h2>
        <p class="small" style="margin-top:8px">Add a few sneakers before checking out.</p>
        <a href="/Products/products.html" class="btn btn-primary" style="margin-top:20px">Browse Collection</a>
      </div>`;
    return;
  }

  const customer =
    typeof getCurrentCustomer === "function" ? getCurrentCustomer() : null;
  const savedAddresses =
    customer && typeof getCustomerAddresses === "function"
      ? getCustomerAddresses(customer.id)
      : [];
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || null;

  root.innerHTML = `
    <div class="checkout-grid">
      <div>
        <div class="checkout-card">
          <h3>Contact Information</h3>
          <form data-checkout-form>
            <div class="field-grid">
              <label class="field field-full">
                <span>Full Name *</span>
                <input type="text" name="name" required placeholder="Enter your full name" value="${customer ? (customer.firstName ? `${customer.firstName} ${customer.lastName || ""}`.trim() : customer.name || "") : ""}">
              </label>
              <label class="field">
                <span>Phone Number *</span>
                <input type="tel" name="phone" required placeholder="e.g. 01712345678" value="${customer?.phone || ""}">
              </label>
              <label class="field">
                <span>Email (optional)</span>
                <input type="email" name="email" placeholder="your.email@example.com" value="${customer?.email || ""}">
              </label>
            </div>
          </form>
        </div>

        <div class="checkout-card">
          <h3>Shipping Address</h3>
          ${
            savedAddresses.length
              ? `
          <div class="zone-options saved-address-list" data-saved-address-list style="margin-bottom:16px">
            ${savedAddresses
              .map(
                (a) => `
              <label class="zone-option">
                <input type="radio" name="savedAddress" value="${a.id}" data-saved-address-radio ${a.isDefault ? "checked" : ""}>
                <div class="zone-option-info">
                  <div class="name">${a.label} — ${a.fullName}</div>
                  <div class="sub">${a.addressLine}${a.city ? `, ${a.city}` : ""} (${DELIVERY_ZONES[a.zone]?.label || a.zone})</div>
                </div>
              </label>`,
              )
              .join("")}
            <label class="zone-option">
              <input type="radio" name="savedAddress" value="new" data-saved-address-radio ${defaultAddress ? "" : "checked"}>
              <div class="zone-option-info"><div class="name">Enter a new address</div></div>
            </label>
          </div>`
              : ""
          }
          <div class="zone-options" data-zone-options>
            ${Object.entries(DELIVERY_ZONES)
              .map(
                ([key, z]) => `
              <label class="zone-option">
                <input type="radio" name="zone" value="${key}" data-zone-radio ${defaultAddress?.zone === key ? "checked" : ""}>
                <div class="zone-option-info">
                  <div class="name">${z.label}</div>
                  <div class="sub">${z.sub}</div>
                </div>
                <div class="zone-option-fee">${formatBDT(z.fee)}</div>
              </label>
            `,
              )
              .join("")}
          </div>
          <label class="field field-full" style="margin-top:16px">
            <span>Full Address *</span>
            <textarea name="address" form="checkout-form-el" rows="3" required placeholder="House, road, area" data-address-field>${defaultAddress?.addressLine || ""}</textarea>
          </label>
          <label class="field field-full" style="margin-top:16px">
            <span>City / District *</span>
            <input type="text" name="city" form="checkout-form-el" required placeholder="e.g. Dhanmondi, Dhaka" value="${defaultAddress?.city || ""}" data-city-field>
          </label>
          ${
            customer
              ? `<label class="checkbox-field" style="margin-top:14px">
                  <input type="checkbox" data-save-address-checkbox />
                  Save this address to my profile for next time
                </label>`
              : ""
          }
        </div>

        ${
          customer?.loyaltyRewardReady
            ? `
        <div class="checkout-card loyalty-reward-card">
          <h3>🎉 Loyalty Reward Unlocked</h3>
          <p class="small" style="margin-bottom:14px">You've bought 5 pairs — your cheapest pair in this order gets <strong>70% off</strong>.</p>
          <label class="checkbox-field">
            <input type="checkbox" data-use-loyalty-checkbox />
            Use my 70% off reward on this order
          </label>
        </div>`
            : ""
        }

        <div class="checkout-card">
          <h3>Payment Method</h3>
          <div class="payment-option">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>
            <div>
              <div class="name">Cash on Delivery</div>
              <div class="sub">Pay when you receive your order</div>
            </div>
            <div class="payment-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            </div>
          </div>
        </div>

        <div class="checkout-card">
          <h3>Order Notes (Optional)</h3>
          <label class="field">
            <span>Special Instructions</span>
            <textarea name="notes" form="checkout-form-el" rows="3" placeholder="Any special instructions for your order..." data-notes-field></textarea>
          </label>
        </div>
      </div>

      <div class="checkout-card summary-card">
        <h3>Order Summary</h3>
        <div class="summary-items">
          ${CART.map(
            (item) => `
            <div class="summary-item">
              <div class="summary-item-thumb">${productThumbHTML(item)}</div>
              <div>
                <div class="summary-item-name">${item.name}</div>
                <div class="summary-item-meta">Size ${item.size} · x${item.qty}</div>
              </div>
              <div class="summary-item-price">${formatBDT(item.price * item.qty)}</div>
            </div>
          `,
          ).join("")}
        </div>
        <div class="coupon-row">
          <input
            type="text"
            placeholder="Coupon code"
            data-coupon-input
            value="${appliedCoupon ? appliedCoupon.coupon.code : ""}"
            ${appliedCoupon ? "disabled" : ""}
          />
          <button type="button" class="btn ${appliedCoupon ? "btn-secondary" : "btn-primary"}" data-coupon-btn>
            ${appliedCoupon ? "Remove" : "Apply"}
          </button>
        </div>
        <div class="coupon-message" data-coupon-message></div>
        <div class="summary-row"><span>Subtotal (${getCartCount()} items)</span><span data-summary-subtotal>${formatBDT(getCartTotal())}</span></div>
        <div class="summary-row discount" data-summary-discount-row style="display:none"><span>Discount</span><span data-summary-discount>-৳0</span></div>
        <div class="summary-row discount" data-summary-loyalty-row style="display:none"><span>Loyalty Reward</span><span data-summary-loyalty>-৳0</span></div>
        <div class="summary-row"><span>Shipping</span><span data-summary-shipping>Select a zone</span></div>
        <div class="summary-row total"><span>Total</span><span data-summary-total>${formatBDT(getCartTotal())}</span></div>
        <button type="submit" form="checkout-form-el" class="btn btn-primary btn-block" style="margin-top:16px" data-place-order>Place Order</button>
      </div>
    </div>`;

  // give the form an id so the summary's submit button (outside the form
  // element visually) can still submit it via the `form` attribute
  root.querySelector("[data-checkout-form]").id = "checkout-form-el";

  // a saved default address is pre-checked in the markup above, so line
  // up the JS-side selectedZone (and the totals) with what's shown
  selectedZone = defaultAddress ? defaultAddress.zone : null;
  useLoyaltyReward = false;
  await updateSummaryTotals();

  bindCheckoutEvents(customer, savedAddresses);
}

async function applySavedAddressToFields(address) {
  const form = document.querySelector("[data-checkout-form]");
  const addressField = document.querySelector("[data-address-field]");
  const cityField = document.querySelector("[data-city-field]");
  if (!form || !addressField) return;

  if (address) {
    form.querySelector('[name="name"]').value = address.fullName;
    form.querySelector('[name="phone"]').value = address.phone;
    addressField.value = address.addressLine;
    if (cityField) cityField.value = address.city || "";
    const zoneRadio = document.querySelector(
      `[data-zone-radio][value="${address.zone}"]`,
    );
    if (zoneRadio) {
      zoneRadio.checked = true;
      selectedZone = address.zone;
    }
  } else {
    addressField.value = "";
    if (cityField) cityField.value = "";
  }
  await updateSummaryTotals();
}

function bindCheckoutEvents(customer, savedAddresses) {
  bindCouponEvents();

  const loyaltyCheckbox = document.querySelector("[data-use-loyalty-checkbox]");
  if (loyaltyCheckbox) {
    loyaltyCheckbox.addEventListener("change", async () => {
      useLoyaltyReward = loyaltyCheckbox.checked;
      await updateSummaryTotals();
    });
  }

  document.querySelectorAll("[data-zone-radio]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      selectedZone = radio.value;
      await updateSummaryTotals();
    });
  });

  document.querySelectorAll("[data-saved-address-radio]").forEach((radio) => {
    radio.addEventListener("change", async () => {
      if (radio.value === "new") {
        await applySavedAddressToFields(null);
        return;
      }
      const address = savedAddresses.find((a) => String(a.id) === radio.value);
      await applySavedAddressToFields(address);
    });
  });

  document
    .querySelector("[data-checkout-form]")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      // Guard against double submission — a double-click (or a slow
      // network) firing this handler twice before the first request
      // finishes used to create two identical orders.
      const placeOrderBtn = document.querySelector("[data-place-order]");
      if (placeOrderBtn && placeOrderBtn.disabled) return;
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Placing order...";
      }

      if (!selectedZone) {
        showToast("Please choose a delivery zone");
        if (placeOrderBtn) {
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = "Place Order";
        }
        return;
      }

      const form = e.target;
      const fd = new FormData(form);
      const name = fd.get("name").trim();
      const phone = fd.get("phone").trim();
      const address = document
        .querySelector("[data-address-field]")
        .value.trim();
      const city = document.querySelector("[data-city-field]").value.trim();
      const notes = document.querySelector("[data-notes-field]").value.trim();

      if (!name || !phone || !address || !city) {
        showToast("Please fill in all required fields");
        if (placeOrderBtn) {
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = "Place Order";
        }
        return;
      }

      const zone = DELIVERY_ZONES[selectedZone];
      const subtotal = getCartTotal();
      const discount = appliedCoupon ? appliedCoupon.discount : 0;
      const loyaltyDiscount = useLoyaltyReward
        ? Math.round((Math.min(...CART.map((i) => i.price)) * 70) / 100)
        : 0;
      const order = {
        customerName: name,
        phone: phone,
        email: fd.get("email") ? fd.get("email").trim() : "",
        address: `${address}, ${city} (${zone.label})`,
        notes: notes,
        items: CART.map((i) => ({
          productId: i.productId,
          size: i.size,
          qty: i.qty,
        })),
        // Note: price/shippingFee/total below are for the order summary
        // display only — the backend always recalculates the real total
        // from each product's current database price and the chosen
        // zone, so nothing sent here can change what's actually charged.
        zone: selectedZone,
        shippingFee: zone.fee,
        couponCode: appliedCoupon ? appliedCoupon.coupon.code : "",
        discount: discount,
        useLoyaltyReward: useLoyaltyReward,
        total: subtotal - discount - loyaltyDiscount + zone.fee,
      };

      // logged-in customers can opt to save whatever's in the address
      // fields to their profile for next time
      const saveAddressBox = document.querySelector(
        "[data-save-address-checkbox]",
      );
      if (customer && saveAddressBox && saveAddressBox.checked) {
        try {
          await addCustomerAddress(customer.id, {
            label: "Home",
            fullName: name,
            phone: phone,
            zone: selectedZone,
            city: city,
            addressLine: address,
          });
        } catch (err) {
          /* non-fatal — still place the order even if saving the
             address for next time fails */
        }
      }

      let saved;
      try {
        saved = await addOrder(order);
      } catch (err) {
        showToast(err.message || "Couldn't place your order — please try again");
        if (placeOrderBtn) {
          placeOrderBtn.disabled = false;
          placeOrderBtn.textContent = "Place Order";
        }
        return;
      }
      appliedCoupon = null;
      if (useLoyaltyReward && customer) {
        customer.loyaltyRewardReady = false;
      }
      useLoyaltyReward = false;
      clearCart();
      document.querySelectorAll("[data-cart-count]").forEach((el) => {
        el.textContent = "0";
      });
      renderSuccess(saved);
    });
}

async function updateSummaryTotals() {
  const zone = selectedZone ? DELIVERY_ZONES[selectedZone] : null;
  const subtotal = getCartTotal();
  const shippingEl = document.querySelector("[data-summary-shipping]");
  const totalEl = document.querySelector("[data-summary-total]");
  const discountRow = document.querySelector("[data-summary-discount-row]");
  const discountEl = document.querySelector("[data-summary-discount]");
  const loyaltyRow = document.querySelector("[data-summary-loyalty-row]");
  const loyaltyEl = document.querySelector("[data-summary-loyalty]");
  if (!shippingEl || !totalEl) return;

  shippingEl.textContent = zone ? formatBDT(zone.fee) : "Select a zone";

  let discount = 0;
  if (appliedCoupon) {
    // re-check against the current subtotal in case the cart changed
    // since the coupon was applied (e.g. dropped below its minimum order)
    const check = await validateCoupon(appliedCoupon.coupon.code, subtotal);
    if (check.ok) {
      discount = check.discount;
      appliedCoupon = { coupon: check.coupon, discount };
      if (discountRow) {
        discountRow.style.display = "";
        discountRow.querySelector("span:first-child").textContent =
          `Discount (${check.coupon.code})`;
      }
      if (discountEl) discountEl.textContent = `-${formatBDT(discount)}`;
    } else {
      appliedCoupon = null;
      if (discountRow) discountRow.style.display = "none";
      syncCouponRowUI();
      showToast(check.message);
    }
  } else if (discountRow) {
    discountRow.style.display = "none";
  }

  let loyaltyDiscount = 0;
  if (useLoyaltyReward && CART.length) {
    const cheapestUnitPrice = Math.min(...CART.map((i) => i.price));
    loyaltyDiscount = Math.round((cheapestUnitPrice * 70) / 100);
    if (loyaltyRow) loyaltyRow.style.display = "";
    if (loyaltyEl) loyaltyEl.textContent = `-${formatBDT(loyaltyDiscount)}`;
  } else if (loyaltyRow) {
    loyaltyRow.style.display = "none";
  }

  totalEl.textContent = formatBDT(
    subtotal - discount - loyaltyDiscount + (zone ? zone.fee : 0),
  );
}

/* keeps the coupon input/button in sync with `appliedCoupon` without
   tearing down and rebuilding the rest of the checkout form (which
   would wipe out whatever the shopper has typed so far) */
function syncCouponRowUI() {
  const input = document.querySelector("[data-coupon-input]");
  const btn = document.querySelector("[data-coupon-btn]");
  if (!input || !btn) return;
  if (appliedCoupon) {
    input.value = appliedCoupon.coupon.code;
    input.disabled = true;
    btn.textContent = "Remove";
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-secondary");
  } else {
    input.disabled = false;
    btn.textContent = "Apply";
    btn.classList.remove("btn-secondary");
    btn.classList.add("btn-primary");
  }
}

function bindCouponEvents() {
  const btn = document.querySelector("[data-coupon-btn]");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const input = document.querySelector("[data-coupon-input]");
    const msgEl = document.querySelector("[data-coupon-message]");
    msgEl.textContent = "";
    msgEl.className = "coupon-message";

    if (appliedCoupon) {
      appliedCoupon = null;
      input.value = "";
      syncCouponRowUI();
      await updateSummaryTotals();
      return;
    }

    const code = input.value.trim();
    if (!code) {
      msgEl.textContent = "Enter a coupon code";
      msgEl.className = "coupon-message error";
      return;
    }
    const result = await validateCoupon(code, getCartTotal());
    if (!result.ok) {
      msgEl.textContent = result.message;
      msgEl.className = "coupon-message error";
      return;
    }
    appliedCoupon = { coupon: result.coupon, discount: result.discount };
    msgEl.textContent = `"${result.coupon.code}" applied — you saved ${formatBDT(result.discount)}!`;
    msgEl.className = "coupon-message success";
    syncCouponRowUI();
    await updateSummaryTotals();
  });

  document
    .querySelector("[data-coupon-input]")
    .addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        btn.click();
      }
    });
}

function renderSuccess(order) {
  const detailsStep = document.querySelector("[data-step-details]");
  const confirmedStep = document.querySelector("[data-step-confirmed]");
  if (detailsStep) {
    detailsStep.classList.remove("active");
    detailsStep.classList.add("done");
    detailsStep.querySelector(".step-dot").innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  }
  if (confirmedStep) confirmedStep.classList.add("active");

  const root = document.querySelector("[data-checkout-root]");
  root.innerHTML = `
    <div class="checkout-success">
      <div class="icon-circle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      </div>
      <h2>Order Placed!</h2>
      <p>Thanks, ${escapeHTML(order.customerName)} — your order <strong>${escapeHTML(order.displayId || `#${String(order.id).slice(-6).toUpperCase()}`)}</strong> is confirmed. We'll call ${escapeHTML(order.phone)} to confirm delivery.</p>
      ${order.discount ? `<p class="small" style="color:#15803d;margin-top:-8px">Coupon <strong>${escapeHTML(order.couponCode)}</strong> saved you ${formatBDT(order.discount)}!</p>` : ""}
      <a href="/Products/products.html" class="btn btn-primary">Continue Shopping</a>
    </div>`;
}

/* cart.js calls this after any cart change made from the shared cart
   drawer (qty +/-, remove, or "Add to Cart" from the wishlist drawer)
   so the checkout summary stays in sync. */
function onCartChange() {
  renderCheckout();
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  initNavToggle();
  await renderCheckout();
});

// if the shopper logs in/out from the nav while sitting on this page,
// re-render so contact info + saved addresses reflect the new session
document.addEventListener("kivix:account-changed", renderCheckout);
