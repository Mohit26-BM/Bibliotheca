let currentUser;

async function init() {
  initTransitions();
  initScrollReveal();
  const session = await requireAuth("../index.html");
  if (!session) return;

  currentUser = await getCurrentUser();
  if (!currentUser) return;

  populateSidebar();
  populateForm();
  loadStats();
  loadRecentLoans();
}

function populateSidebar() {
  const initial = currentUser.name?.charAt(0).toUpperCase() || "?";
  document.getElementById("avatarDisplay").textContent = initial;
  document.getElementById("sidebarName").textContent = currentUser.name || "—";
  document.getElementById("sidebarEmail").textContent =
    currentUser.email || "—";
  document.getElementById("navUser").textContent = currentUser.name || "User";

  const roleEl = document.getElementById("sidebarRole");
  roleEl.textContent = currentUser.role;
  roleEl.className = `book-badge ${currentUser.role === "admin" ? "badge-available" : "badge-unavailable"}`;

  if (currentUser.created_at) {
    document.getElementById("memberSince").textContent =
      "Member since " +
      new Date(currentUser.created_at).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      });
  }
}

function populateForm() {
  document.getElementById("pName").value = currentUser.name || "";
  document.getElementById("pEmail").value = currentUser.email || "";
  document.getElementById("pPhone").value = currentUser.phone || "";
  document.getElementById("pAddress").value = currentUser.address || "";
  document.getElementById("pCity").value = currentUser.city || "";
  document.getElementById("pPin").value = currentUser.pin || "";
  document.getElementById("pBio").value = currentUser.bio || "";
}

async function loadStats() {
  const { data: loans } = await sb
    .from("loans")
    .select("id, is_returned")
    .eq("user_id", currentUser.id);

  const { count: reviewCount } = await sb
    .from("reviews")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id);

  const total = loans?.length || 0;
  const active = loans?.filter((l) => !l.is_returned).length || 0;

  animateCounter(document.getElementById("statLoans"), total, 600);
  animateCounter(document.getElementById("statActive"), active, 600);
  animateCounter(document.getElementById("statReviews"), reviewCount || 0, 600);
}

async function loadRecentLoans() {
  const { data } = await sb
    .from("loans")
    .select("*, books(title, authors, thumbnail)")
    .eq("user_id", currentUser.id)
    .order("borrowed_at", { ascending: false })
    .limit(8);

  const el = document.getElementById("recentLoans");

  if (!data?.length) {
    el.innerHTML = `<p style="color:var(--muted);font-size:.88rem;padding:1rem 0">No borrowing history yet.</p>`;
    return;
  }

  el.innerHTML = data
    .map((l) => {
      const now = new Date();
      const due = new Date(l.due_date);
      const active = !l.is_returned;
      const overdue = active && now > due;

      let statusClass = "status-returned",
        statusText = "Returned";
      if (active && !overdue) {
        statusClass = "status-active";
        statusText = "Active";
      }
      if (overdue) {
        statusClass = "status-overdue";
        statusText = "Overdue";
      }

      return `
      <div class="loan-row">
        ${
          l.books?.thumbnail
            ? `<img class="loan-thumb" src="${l.books.thumbnail}" alt="${l.books?.title}"
               onerror="this.outerHTML='<div class=loan-thumb-ph>📖</div>'" />`
            : `<div class="loan-thumb-ph">📖</div>`
        }
        <div class="loan-info">
          <div class="loan-title">${l.books?.title || "Unknown"}</div>
          <div class="loan-meta">
            ${l.books?.authors || ""}
            · Borrowed ${new Date(l.borrowed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </div>
        </div>
        <span class="loan-status ${statusClass}">${statusText}</span>
      </div>`;
    })
    .join("");
}

async function saveProfile() {
  const name = document.getElementById("pName").value.trim();
  const phone = document.getElementById("pPhone").value.trim();
  const address = document.getElementById("pAddress").value.trim();
  const city = document.getElementById("pCity").value.trim();
  const pin = document.getElementById("pPin").value.trim();
  const bio = document.getElementById("pBio").value.trim();

  if (!name) {
    document.getElementById("profileMsg").innerHTML =
      `<div class="alert alert-error">Name cannot be empty.</div>`;
    return;
  }

  const btn = document.getElementById("saveBtn");
  btn.textContent = "Saving…";
  btn.disabled = true;

  const { error } = await sb
    .from("users")
    .update({
      name,
      phone,
      address,
      city,
      pin,
      bio,
    })
    .eq("id", currentUser.id);

  btn.textContent = "Save Changes";
  btn.disabled = false;

  if (error) {
    document.getElementById("profileMsg").innerHTML =
      `<div class="alert alert-error">${error.message}</div>`;
    return;
  }

  document.getElementById("profileMsg").innerHTML =
    `<div class="alert alert-success">Profile updated successfully.</div>`;
  setTimeout(
    () => (document.getElementById("profileMsg").innerHTML = ""),
    3000,
  );

  // Refresh sidebar name
  currentUser.name = name;
  document.getElementById("sidebarName").textContent = name;
  document.getElementById("navUser").textContent = name;
  document.getElementById("avatarDisplay").textContent = name
    .charAt(0)
    .toUpperCase();
  showToast("Profile saved!", "success");
}

init();
