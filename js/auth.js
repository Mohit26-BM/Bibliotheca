// Redirect if already logged in
(async () => {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (session) {
    const { data: u } = await sb
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    window.location.href =
      u?.role === "admin" ? "pages/admin.html" : "pages/dashboard.html";
  }
})();

function switchTab(tab) {
  document
    .getElementById("loginForm")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("registerForm")
    .classList.toggle("active", tab === "register");
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    t.classList.toggle(
      "active",
      (i === 0 && tab === "login") || (i === 1 && tab === "register"),
    );
  });
  document.getElementById("msg").innerHTML = "";
}

function showMsg(text, type = "error") {
  document.getElementById("msg").innerHTML =
    `<div class="alert alert-${type}">${text}</div>`;
}

async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  if (!email || !pass) {
    showMsg("Please fill in all fields.");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) {
    showMsg(error.message);
    return;
  }

  const { data: u } = await sb
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single();
  showMsg("Welcome back!", "success");
  setTimeout(() => {
    window.location.href =
      u?.role === "admin" ? "pages/admin.html" : "pages/dashboard.html";
  }, 600);
}

async function doRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const pass = document.getElementById("regPass").value;
  if (!name || !email || !pass) {
    showMsg("Please fill in all fields.");
    return;
  }
  const score = getStrengthScore(pass);
  if (pass.length < 6) {
    showMsg("Password must be at least 6 characters.");
    return;
  }
  if (score < 2) {
    showMsg("Please choose a stronger password.");
    return;
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: { data: { name } },
  });
  if (error) {
    showMsg(error.message);
    return;
  }

  // Insert profile row only if trigger didn't already create it
  if (data.user) {
    const { data: existing } = await sb
      .from("users")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!existing) {
      await sb
        .from("users")
        .insert({ id: data.user.id, name, email, role: "user" });
    }
  }

  // Check if email confirmation is required
  if (data.session) {
    // Confirmation off — logged in immediately, redirect
    showMsg("Account created! Taking you in…", "success");
    setTimeout(() => {
      window.location.href = "pages/dashboard.html";
    }, 800);
  } else {
    // Confirmation on — tell them to check email
    showMsg(
      "Account created! Check your email to confirm before signing in.",
      "success",
    );
    setTimeout(() => switchTab("login"), 2500);
  }
}

// Enter key support
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  if (document.getElementById("loginForm").classList.contains("active"))
    doLogin();
  else doRegister();
});

// ── Password Strength Checker ─────────────────────────────────
function getStrengthScore(pass) {
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
}

function checkStrength(pass) {
  const wrap = document.getElementById("strengthWrap");
  const fill = document.getElementById("strengthFill");
  const label = document.getElementById("strengthLabel");
  const hints = document.getElementById("strengthHints");
  const checks = document.getElementById("strengthChecks");

  if (!pass) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "block";

  const rules = [
    { id: "len", text: "6+ characters", pass: pass.length >= 6 },
    { id: "long", text: "10+ characters", pass: pass.length >= 10 },
    { id: "up", text: "Uppercase", pass: /[A-Z]/.test(pass) },
    { id: "num", text: "Number", pass: /[0-9]/.test(pass) },
    { id: "sym", text: "Symbol", pass: /[^A-Za-z0-9]/.test(pass) },
  ];

  const score = getStrengthScore(pass);

  const levels = [
    { pct: "15%", color: "#e05747", text: "Too weak", hint: "Keep going…" },
    { pct: "30%", color: "#e07847", text: "Weak", hint: "Add more variety" },
    { pct: "55%", color: "#e0b347", text: "Fair", hint: "Getting better" },
    { pct: "78%", color: "#a3c847", text: "Good", hint: "Almost there!" },
    { pct: "100%", color: "#4dbb78", text: "Strong", hint: "Great password ✓" },
  ];

  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.pct;
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
  hints.textContent = lvl.hint;

  checks.innerHTML = rules
    .map(
      (r) => `
    <span class="s-check ${r.pass ? "pass" : ""}">
      <span class="s-dot"></span>${r.text}
    </span>`,
    )
    .join("");
}

// ── Effects ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTransitions();

  // Typewriter on the tagline
  const tagline = document.querySelector(".auth-tagline");
  if (tagline) {
    const text = tagline.textContent.trim();
    typewriter(tagline, text, 28);
  }
});
