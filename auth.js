/* ===================================================
   KI-VIX SNEAKERS — SHARED ACCOUNT MODULE
   Used by every page (home, collection, product details,
   checkout). This is the ONLY place the login / create
   account UI lives — when the real backend is wired up,
   this is the only file that needs to change.

   Requires: showToast() to already exist on the page
   (each page's own script defines it) — this file only
   calls it, it doesn't define it.
=================================================== */

/* Paste your OAuth Client ID from Google Cloud Console here
   (APIs & Services > Credentials > OAuth client ID > Web
   application). Leave the placeholder as-is and the "Continue
   with Google" buttons will explain that setup isn't finished
   yet instead of silently failing. */
const GOOGLE_CLIENT_ID =
  "791397117744-t8asq7vf0p2v4llh0ljs7vh3m3tbdks3.apps.googleusercontent.com";

/* Lazily loads Google's Identity Services script (once per page) and
   hands back a token client whose requestAccessToken() opens Google's
   own account-chooser popup — only ever called from a real click, so
   it isn't blocked as an unwanted popup. onSuccess receives the raw
   access token; the actual verification happens server-side (see
   POST /auth/customer/google), this file never trusts anything about
   the signed-in user on its own. */
let _googleTokenClient = null;
function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-google-gsi]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("load failed")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(script);
  });
}
async function googleSignIn(onSuccess) {
  if (GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
    showToast("Google sign-in isn't set up yet — add a Client ID in auth.js");
    return;
  }
  try {
    await loadGoogleIdentityScript();
  } catch (e) {
    showToast("Couldn't reach Google — check your connection");
    return;
  }
  if (!_googleTokenClient) {
    _googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error || !response.access_token) {
          showToast("Google sign-in was cancelled");
          return;
        }
        onSuccess(response.access_token);
      },
    });
  }
  _googleTokenClient.requestAccessToken();
}

function buildAuthModal() {
  if (document.querySelector("[data-auth-overlay]")) return;

  const overlay = document.createElement("div");
  overlay.className = "cart-overlay auth-overlay";
  overlay.setAttribute("data-auth-overlay", "");
  overlay.innerHTML = `
    <div class="auth-modal" role="dialog" aria-modal="true" aria-label="Account">
      <button class="cart-close" type="button" data-auth-close aria-label="Close">&times;</button>
      <div class="auth-tabs">
        <button type="button" class="auth-tab active" data-auth-tab="login">Login</button>
        <button type="button" class="auth-tab" data-auth-tab="signup">Create Account</button>
      </div>
      <div class="auth-panel" data-auth-panel="login">
        <div class="field"><label>Email or Phone Number</label><input type="text" name="identifier" placeholder="you@example.com" /></div>
        <div class="field"><label>Password</label><input type="password" name="password" placeholder="••••••••" /></div>
        <button type="button" class="btn btn-primary btn-block" data-auth-submit="login">Login</button>
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="auth-social-btn" data-auth-google="login">
          <svg viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <p class="auth-switch-note">New here? <a href="#" data-auth-switch="signup">Create an account</a></p>
      </div>
      <div class="auth-panel" data-auth-panel="signup" hidden>
        <div class="auth-name-grid">
          <div class="field"><label>First Name</label><input type="text" name="firstName" placeholder="First name" /></div>
          <div class="field"><label>Last Name</label><input type="text" name="lastName" placeholder="Last name" /></div>
        </div>
        <div class="auth-method-toggle" data-auth-method-toggle>
          <button type="button" class="active" data-auth-method="email">Email</button>
          <button type="button" data-auth-method="phone">Phone</button>
        </div>
        <div class="field" data-auth-method-field="email">
          <label>Email</label><input type="email" name="email" placeholder="you@example.com" />
        </div>
        <div class="field" data-auth-method-field="phone" hidden>
          <label>Mobile Number</label><input type="tel" name="phone" placeholder="01XXXXXXXXX" />
        </div>
        <div class="field"><label>Password</label><input type="password" name="password" placeholder="Create a password" /></div>
        <div class="field"><label>Confirm Password</label><input type="password" name="confirmPassword" placeholder="Re-enter password" /></div>
        <button type="button" class="btn btn-primary btn-block" data-auth-submit="signup">Create Account</button>
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="auth-social-btn" data-auth-google="signup">
          <svg viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.617z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.581C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
          Continue with Google
        </button>
        <p class="auth-switch-note">Already have an account? <a href="#" data-auth-switch="login">Login</a></p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  enablePasswordToggles(overlay);

  function showTab(which) {
    overlay.querySelectorAll("[data-auth-tab]").forEach((t) => {
      t.classList.toggle("active", t.dataset.authTab === which);
    });
    overlay.querySelectorAll("[data-auth-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.authPanel !== which;
    });
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAuthModal();
  });
  overlay
    .querySelector("[data-auth-close]")
    .addEventListener("click", closeAuthModal);

  overlay.querySelectorAll("[data-auth-tab]").forEach((tab) => {
    tab.addEventListener("click", () => showTab(tab.dataset.authTab));
  });
  overlay.querySelectorAll("[data-auth-switch]").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showTab(link.dataset.authSwitch);
    });
  });

  overlay
    .querySelectorAll("[data-auth-method-toggle] button")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const method = btn.dataset.authMethod;
        overlay
          .querySelectorAll("[data-auth-method-toggle] button")
          .forEach((b) => b.classList.toggle("active", b === btn));
        overlay
          .querySelectorAll("[data-auth-method-field]")
          .forEach((field) => {
            field.hidden = field.dataset.authMethodField !== method;
          });
      });
    });

  overlay.querySelectorAll("[data-auth-google]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      googleSignIn(async (accessToken) => {
        const result = await customerGoogleLogin(accessToken);
        btn.disabled = false;
        if (result.error) {
          showToast(result.error);
          return;
        }
        const first = (
          result.customer.firstName ||
          result.customer.name ||
          ""
        ).split(" ")[0];
        showToast(`Welcome${first ? ", " + first : ""}!`);
        closeAuthModal();
        refreshAccountUI();
      }).finally(() => {
        btn.disabled = false;
      });
    });
  });

  // Enter key submits the visible panel's form, same as clicking its
  // button — works from any input in either the Login or Create
  // Account panel.
  overlay.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const panel = e.target.closest("[data-auth-panel]");
    if (!panel || panel.hidden) return;
    if (e.target.tagName !== "INPUT") return;
    e.preventDefault();
    panel.querySelector("[data-auth-submit]")?.click();
  });

  overlay.querySelectorAll("[data-auth-submit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const panel = btn.closest("[data-auth-panel]");

      if (btn.dataset.authSubmit === "signup") {
        const firstNameInput = panel.querySelector('input[name="firstName"]');
        const lastNameInput = panel.querySelector('input[name="lastName"]');
        const method =
          panel.querySelector("[data-auth-method-toggle] button.active")
            ?.dataset.authMethod || "email";
        const emailInput = panel.querySelector(
          '[data-auth-method-field="email"] input',
        );
        const phoneInput = panel.querySelector(
          '[data-auth-method-field="phone"] input',
        );
        // Selecting by type="password" broke once the show/hide eye
        // button could flip a field to type="text" — name is stable
        // regardless of whether the password is currently shown.
        const password =
          panel.querySelector('input[name="password"]')?.value || "";
        const confirmPassword =
          panel.querySelector('input[name="confirmPassword"]')?.value || "";

        const firstName = firstNameInput?.value.trim() || "";
        const lastName = lastNameInput?.value.trim() || "";
        const email = method === "email" ? emailInput?.value.trim() : "";
        const phone = method === "phone" ? phoneInput?.value.trim() : "";

        if (!firstName || !lastName) {
          showToast("Please enter your first and last name");
          return;
        }
        if (method === "email" && !email) {
          showToast("Please enter your email");
          return;
        }
        if (method === "phone" && !phone) {
          showToast("Please enter your mobile number");
          return;
        }
        if (!password || password.length < 4) {
          showToast("Password must be at least 4 characters");
          return;
        }
        if (password !== confirmPassword) {
          showToast("Passwords do not match");
          return;
        }

        const result = await customerSignup({
          firstName,
          lastName,
          email,
          phone,
          password,
          method,
        });
        if (result.error) {
          showToast(result.error);
          return;
        }
        showToast(`Welcome, ${firstName}! Your account has been created.`);
        closeAuthModal();
        refreshAccountUI();
        return;
      }

      /* ---- login ---- */
      // Same fix as signup above — name, not type, since the password
      // field's type can be toggled to "text" by the show/hide button.
      const identifierInput = panel.querySelector('input[name="identifier"]');
      const passwordInput = panel.querySelector('input[name="password"]');
      const identifier = identifierInput?.value.trim() || "";
      const password = passwordInput?.value || "";
      if (!identifier || !password) {
        showToast("Please enter your email/phone and password");
        return;
      }
      const customer = await customerLogin(identifier, password);
      if (!customer) {
        showToast("Incorrect email/phone or password");
        return;
      }
      const first = (customer.firstName || customer.name || "").split(" ")[0];
      showToast(`Welcome back${first ? ", " + first : ""}!`);
      closeAuthModal();
      refreshAccountUI();
    });
  });

  overlay._showTab = showTab;
}

function openAuthModal(tab) {
  buildAuthModal();
  const overlay = document.querySelector("[data-auth-overlay]");
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
  if (tab && overlay._showTab) overlay._showTab(tab);
}
function closeAuthModal() {
  const overlay = document.querySelector("[data-auth-overlay]");
  if (!overlay) return;
  overlay.classList.remove("show");
  document.body.style.overflow = "";
}

/* Default (logged-out) person-outline icon, restored on the nav
   toggle button whenever there is no logged-in customer. */
const PROFILE_ICON_SVG = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </svg>`;

/* Given a customer, returns the small avatar markup used both in the
   nav icon button and on the profile page itself: their uploaded
   photo if they have one, otherwise a circle with the first letter
   of their name. */
function customerAvatarHTML(customer) {
  const name = (customer.firstName || customer.name || "?").trim();
  const initial = (name.charAt(0) || "?").toUpperCase();
  if (customer.avatar) {
    return `<img src="${customer.avatar}" alt="${name.replace(/"/g, "&quot;")}" class="profile-avatar-img" />`;
  }
  return `<span class="profile-avatar-initial">${initial}</span>`;
}

/* Redraws the icon + dropdown of every profile menu on the page and
   (re)binds its buttons. Called on load and again right after a
   successful login/signup/logout. Logged-in customers get their
   avatar/initial on the nav icon; clicking it goes straight to the
   profile page. Logged-out visitors keep the outline icon and the
   Login / Create Account dropdown. */
function renderProfileMenu(menu) {
  const toggle = menu.querySelector("[data-profile-toggle]");
  const dropdown = menu.querySelector("[data-profile-dropdown]");
  if (!toggle) return;

  const customer =
    typeof getCurrentCustomer === "function" ? getCurrentCustomer() : null;

  if (customer) {
    toggle.innerHTML = customerAvatarHTML(customer);
    toggle.classList.add("icon-btn-avatar");
    toggle.setAttribute("aria-label", "My Account");
    if (dropdown) {
      dropdown.hidden = true;
      dropdown.innerHTML = "";
    }
  } else {
    toggle.innerHTML = PROFILE_ICON_SVG;
    toggle.classList.remove("icon-btn-avatar");
    toggle.setAttribute("aria-label", "Account");
    if (dropdown) {
      dropdown.innerHTML = `
        <button type="button" data-profile-login>Login</button>
        <button type="button" data-profile-signup>Create Account</button>`;
    }
  }
}

function bindProfileDropdownActions(dropdown) {
  dropdown
    .querySelector("[data-profile-login]")
    ?.addEventListener("click", () => {
      dropdown.hidden = true;
      openAuthModal("login");
    });
  dropdown
    .querySelector("[data-profile-signup]")
    ?.addEventListener("click", () => {
      dropdown.hidden = true;
      openAuthModal("signup");
    });
}

function refreshAccountUI() {
  document.querySelectorAll("[data-profile-menu]").forEach((menu) => {
    renderProfileMenu(menu);
    const dropdown = menu.querySelector("[data-profile-dropdown]");
    if (dropdown) bindProfileDropdownActions(dropdown);
  });
  // lets any page-specific script (e.g. /Account/profile.js) know the
  // logged-in customer just changed, so it can re-render its own content
  document.dispatchEvent(new CustomEvent("kivix:account-changed"));
}

function initProfileMenu() {
  document.querySelectorAll("[data-profile-menu]").forEach((menu) => {
    const toggle = menu.querySelector("[data-profile-toggle]");
    const dropdown = menu.querySelector("[data-profile-dropdown]");
    if (!toggle) return;

    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const customer =
        typeof getCurrentCustomer === "function" ? getCurrentCustomer() : null;
      if (customer) {
        window.location.href = "/Account/profile.html";
        return;
      }
      if (dropdown) dropdown.hidden = !dropdown.hidden;
    });
  });

  refreshAccountUI();

  document.addEventListener("click", () => {
    document
      .querySelectorAll("[data-profile-dropdown]")
      .forEach((d) => (d.hidden = true));
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await KIVIX_READY;
  initProfileMenu();
});
