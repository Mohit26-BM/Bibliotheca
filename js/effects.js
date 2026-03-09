// ============================================================
//  effects.js — Bibliotheca UI Effects
//  1. Typewriter
//  2. Card 3D tilt on hover
//  3. Smooth page transitions
//  4. Animated stat counters
//  5. Shake on no results
// ============================================================

// ── 1. TYPEWRITER ────────────────────────────────────────────
// Usage: typewriter(element, text, speed)
// Clears the element's text and types it out letter by letter.

function typewriter(el, text, speed = 45) {
  if (!el) return;
  el.textContent = "";
  el.style.borderRight = "2px solid var(--gold)"; // blinking cursor
  el.style.paddingRight = "3px";
  el.style.animation = "blink .7s step-end infinite";

  // Inject blink keyframe if not already present
  if (!document.getElementById("blink-style")) {
    const s = document.createElement("style");
    s.id = "blink-style";
    s.textContent = `@keyframes blink { 50% { border-color: transparent; } }`;
    document.head.appendChild(s);
  }

  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(tick, speed);
    } else {
      // Remove cursor after done
      setTimeout(() => {
        el.style.borderRight = "none";
        el.style.animation = "none";
      }, 1200);
    }
  };
  setTimeout(tick, 400); // slight delay before starting
}

// ── 2. CARD 3D TILT ──────────────────────────────────────────
// Call applyTilt() after book cards are rendered into the DOM.
// It attaches mousemove/mouseleave listeners to every .book-card.

function applyTilt() {
  document.querySelectorAll(".book-card").forEach((card) => {
    // Avoid double-binding
    if (card._tiltBound) return;
    card._tiltBound = true;

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2); // -1 to 1
      const dy = (e.clientY - cy) / (rect.height / 2); // -1 to 1
      const tiltX = dy * -8; // max 8deg vertical tilt
      const tiltY = dx * 8; // max 8deg horizontal tilt
      const bright = 1 + Math.abs(dx + dy) * 0.04;

      card.style.transform = `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
      card.style.transition = "transform .05s ease, box-shadow .05s ease";
      card.style.boxShadow = `${-tiltY * 2}px ${tiltX * 2}px 24px rgba(0,0,0,.5)`;
      card.style.filter = `brightness(${bright})`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
      card.style.transition =
        "transform .4s ease, box-shadow .4s ease, filter .4s ease";
      card.style.boxShadow = "";
      card.style.filter = "";
    });
  });
}

// ── 3. SMOOTH PAGE TRANSITIONS ───────────────────────────────
// Adds a fade-out before any internal navigation.
// Call initTransitions() once on page load.

function initTransitions() {
  // Inject transition styles
  if (!document.getElementById("transition-style")) {
    const s = document.createElement("style");
    s.id = "transition-style";
    s.textContent = `
      body { animation: pageIn .35s ease both; }
      @keyframes pageIn  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pageOut { from { opacity: 1; } to { opacity: 0; } }
      body.leaving { animation: pageOut .25s ease both; pointer-events: none; }
    `;
    document.head.appendChild(s);
  }

  // Intercept all internal link clicks
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href");
    // Skip external, anchor, and javascript links
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("#") ||
      href.startsWith("javascript")
    )
      return;

    e.preventDefault();
    document.body.classList.add("leaving");
    setTimeout(() => {
      window.location.href = href;
    }, 260);
  });

  // Also handle window.location.href navigations via a helper
  window.navigateTo = (url) => {
    document.body.classList.add("leaving");
    setTimeout(() => {
      window.location.href = url;
    }, 260);
  };
}

// ── 4. ANIMATED STAT COUNTERS ────────────────────────────────
// Usage: animateCounter(element, targetNumber, duration)
// Counts up from 0 to targetNumber over duration ms.

function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const start = performance.now();
  const startVal = 0;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3); // cubic ease-out

  const tick = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const current = Math.round(
      easeOut(progress) * (target - startVal) + startVal,
    );
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

// Animate all stat cards on the admin page
// Call after loadStats() has set the values
function animateAllStats() {
  const ids = [
    "statTotal",
    "statAvail",
    "statLoaned",
    "statUsers",
    "statOverdue",
  ];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = parseInt(el.textContent.replace(/,/g, "")) || 0;
    el.textContent = "0";
    // Stagger each counter slightly
    setTimeout(() => animateCounter(el, val, 1000), i * 120);
  });
}

// ── 5. SHAKE ON NO RESULTS ───────────────────────────────────
// Call shakeSearch() when search returns 0 results.

function shakeSearch(inputId = "searchInput") {
  const el = document.getElementById(inputId);
  if (!el) return;

  // Inject shake keyframe once
  if (!document.getElementById("shake-style")) {
    const s = document.createElement("style");
    s.id = "shake-style";
    s.textContent = `
      @keyframes shake {
        0%,100% { transform: translateX(0); }
        15%      { transform: translateX(-7px); }
        30%      { transform: translateX(6px); }
        45%      { transform: translateX(-5px); }
        60%      { transform: translateX(4px); }
        75%      { transform: translateX(-3px); }
        90%      { transform: translateX(2px); }
      }
      .shake-anim {
        animation: shake .5s cubic-bezier(.36,.07,.19,.97) both !important;
        border-color: #e05747 !important;
        box-shadow: 0 0 0 2px rgba(192,57,43,.2) !important;
      }
    `;
    document.head.appendChild(s);
  }

  el.classList.remove("shake-anim");
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add("shake-anim");
  setTimeout(() => el.classList.remove("shake-anim"), 600);
}

// ════════════════════════════════════════════════════════════
//  NEW ANIMATIONS
//  6. Shimmer skeleton loaders
//  7. Staggered card entrance
//  8. Scroll reveal
//  9. Slide-in toast (replaces old showToast)
// ════════════════════════════════════════════════════════════

// ── 6. SHIMMER SKELETON LOADERS ──────────────────────────────
// Returns HTML string for N skeleton book cards
function skeletonCards(n = 12) {
  return Array.from(
    { length: n },
    () => `
    <div class="book-card-skeleton">
      <div class="skel-thumb skeleton"></div>
      <div class="skel-body">
        <div class="skel-line skeleton"></div>
        <div class="skel-line short skeleton"></div>
        <div class="skel-line xshort skeleton"></div>
      </div>
    </div>`,
  ).join("");
}

// Call this before fetching — replaces the grid contents with skeletons
function showSkeletons(gridId = "bookGrid", count = 24) {
  const grid = document.getElementById(gridId);
  if (grid) grid.innerHTML = skeletonCards(count);
}

// ── 7. STAGGERED CARD ENTRANCE ───────────────────────────────
// Call after inserting book cards into the DOM.
// Each card gets a small incremental animation-delay.
function staggerCards(selector = ".book-card", baseDelay = 30) {
  document.querySelectorAll(selector).forEach((card, i) => {
    card.style.animationDelay = i * baseDelay + "ms";
  });
}

// ── 8. SCROLL REVEAL ─────────────────────────────────────────
// Call initScrollReveal() once on page load.
// Add class "reveal" to any element you want to fade up on scroll.
// Add class "reveal-group" to a container to stagger its children.

let _revealObserver = null;

function initScrollReveal() {
  if (_revealObserver) return; // don't double-init

  _revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          _revealObserver.unobserve(entry.target); // fire once
        }
      });
    },
    { threshold: 0.12 },
  );

  // Observe all current + future .reveal / .reveal-group elements
  function observe() {
    document.querySelectorAll(".reveal, .reveal-group").forEach((el) => {
      if (!el._revealBound) {
        el._revealBound = true;
        _revealObserver.observe(el);
      }
    });
  }

  observe();

  // Re-scan after dynamic content is added (e.g. after book grid renders)
  const mutObs = new MutationObserver(observe);
  mutObs.observe(document.body, { childList: true, subtree: true });
}

// ── 9. SLIDE-IN TOAST (replaces old showToast) ───────────────
// Usage: showToast("Message")  or  showToast("Message", "success" | "error")
// Replaces the simple pop-up with a slide-in panel from the right.

let _toastTimer = null;

function showToast(msg, type = "default") {
  const t = document.getElementById("toast");
  if (!t) return;

  // Clear pending hide
  clearTimeout(_toastTimer);

  // Icon per type
  const icons = { success: "✅", error: "⚠️", default: "📖" };
  const icon = icons[type] || icons.default;

  // Strip old type classes
  t.classList.remove("toast-success", "toast-error", "show");
  if (type === "success") t.classList.add("toast-success");
  if (type === "error") t.classList.add("toast-error");

  t.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-body">
      <span class="toast-msg">${msg}</span>
    </span>
    <button class="toast-close" onclick="hideToast()">✕</button>
  `;

  // Force reflow so transition fires even if already showing
  void t.offsetWidth;
  t.classList.add("show");

  // Auto-hide after 3.5s
  _toastTimer = setTimeout(hideToast, 3500);
}

function hideToast() {
  const t = document.getElementById("toast");
  if (t) t.classList.remove("show");
}

// ── CUSTOM CONFIRM DIALOG ────────────────────────────────────
// Replaces native browser confirm() with a styled modal.
// Usage: const ok = await showConfirm("Title", "Message", "Danger label", "icon")
// Returns true if confirmed, false if cancelled.

function showConfirm(
  title,
  message,
  confirmLabel = "Confirm",
  icon = "⚠️",
  danger = true,
) {
  return new Promise((resolve) => {
    // Inject overlay HTML once
    let overlay = document.getElementById("confirmOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "confirmOverlay";
      overlay.innerHTML = `
        <div id="confirmBox">
          <div class="confirm-icon" id="confirmIcon"></div>
          <div class="confirm-title" id="confirmTitle"></div>
          <div class="confirm-msg" id="confirmMsg"></div>
          <div class="confirm-actions">
            <button class="btn btn-outline" id="confirmCancel">Cancel</button>
            <button class="btn" id="confirmOk"></button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    // Populate content
    document.getElementById("confirmIcon").textContent = icon;
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent = message;
    const okBtn = document.getElementById("confirmOk");
    okBtn.textContent = confirmLabel;
    okBtn.className = `btn ${danger ? "btn-danger" : "btn-gold"}`;

    // Show
    requestAnimationFrame(() => overlay.classList.add("open"));

    // Handlers — defined fresh each call to avoid stale closures
    function close(result) {
      overlay.classList.remove("open");
      okBtn.replaceWith(okBtn.cloneNode(true)); // remove old listener
      document
        .getElementById("confirmCancel")
        .replaceWith(document.getElementById("confirmCancel").cloneNode(true));
      resolve(result);
    }

    document
      .getElementById("confirmOk")
      .addEventListener("click", () => close(true), { once: true });
    document
      .getElementById("confirmCancel")
      .addEventListener("click", () => close(false), { once: true });
    overlay.addEventListener(
      "click",
      (e) => {
        if (e.target === overlay) close(false);
      },
      { once: true },
    );
  });
}
