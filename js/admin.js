let adminUser,
  editingBookId = null,
  bookPage = 1,
  bookTotal = 0;
const PAGE_SIZE = 20;
let bookSearchTimer;

async function init() {
  initTransitions();
  initScrollReveal();
  const session = await requireAdmin();
  if (!session) return;
  adminUser = await getCurrentUser();
  document.getElementById("navUser").textContent = adminUser.name;
  loadStats();
  loadBooksTable();
}

// ── Stats ────────────────────────────────────────────────────
async function loadStats() {
  const [
    { count: total },
    { count: avail },
    { count: loaned },
    { count: users },
    { count: overdue },
  ] = await Promise.all([
    sb.from("books").select("*", { count: "exact", head: true }),
    sb
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("is_available", true),
    sb
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("is_returned", false),
    sb.from("users").select("*", { count: "exact", head: true }),
    sb
      .from("loans")
      .select("*", { count: "exact", head: true })
      .eq("is_returned", false)
      .lt("due_date", new Date().toISOString()),
  ]);
  document.getElementById("statTotal").textContent =
    total?.toLocaleString() || 0;
  document.getElementById("statAvail").textContent =
    avail?.toLocaleString() || 0;
  document.getElementById("statLoaned").textContent =
    loaned?.toLocaleString() || 0;
  document.getElementById("statUsers").textContent =
    users?.toLocaleString() || 0;
  document.getElementById("statOverdue").textContent =
    overdue?.toLocaleString() || 0;
  animateAllStats();
}

// ── Books Table ──────────────────────────────────────────────
function searchBooks() {
  clearTimeout(bookSearchTimer);
  bookPage = 1;
  bookSearchTimer = setTimeout(loadBooksTable, 350);
}

async function loadBooksTable() {
  const wrap = document.getElementById("booksTableWrap");
  document.getElementById("booksSpinner").style.display = "block";
  wrap.innerHTML = "";

  const q = document.getElementById("bookSearch").value.trim();
  const from = (bookPage - 1) * PAGE_SIZE;

  let query = sb.from("books").select("*", { count: "exact" });
  if (q) query = query.or(`title.ilike.%${q}%,authors.ilike.%${q}%`);
  query = query.order("title").range(from, from + PAGE_SIZE - 1);

  const { data, count } = await query;
  document.getElementById("booksSpinner").style.display = "none";
  bookTotal = count || 0;

  if (!data?.length) {
    wrap.innerHTML = `<p style="color:var(--muted)">No books found.</p>`;
    shakeSearch("bookSearch");
    renderBooksPagination();
    return;
  }

  wrap.innerHTML = `<table>
    <thead><tr><th></th><th>Title</th><th>Authors</th><th>Year</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${data
      .map(
        (b) => `<tr>
      <td>
        <div style="overflow:hidden;border-radius:3px;width:36px;height:50px;flex-shrink:0">
          ${
            b.thumbnail
              ? `<img class="book-row-thumb" src="${b.thumbnail}"
                 style="transition:transform .5s ease;transform-origin:center"
                 onmouseover="this.style.transform='scale(1.12)'"
                 onmouseout="this.style.transform='scale(1)'"
                 onerror="this.style.display='none'" />`
              : "📖"
          }
        </div>
      </td>
      <td style="font-size:.88rem;color:var(--cream);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.title}</td>
      <td style="font-size:.82rem;color:var(--muted)">${b.authors?.split(",")[0] || "—"}</td>
      <td style="font-size:.82rem;color:var(--muted)">${b.published_year || "—"}</td>
      <td style="font-size:.82rem;color:var(--gold)">★ ${b.average_rating?.toFixed(1) || "—"}</td>
      <td><span class="book-badge ${b.is_available ? "badge-available" : "badge-unavailable"}">
        ${b.is_available ? "Available" : "On Loan"}
      </span></td>
      <td>
        <div style="display:flex;gap:.4rem">
          <button class="btn btn-outline btn-sm" onclick="openEditBook(${b.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteBook(${b.id}, '${b.title.replace(/'/g, "\\'")}', ${b.is_available})">Delete</button>
        </div>
      </td>
    </tr>`,
      )
      .join("")}</tbody>
  </table>`;
  renderBooksPagination();
}

function renderBooksPagination() {
  const pages = Math.ceil(bookTotal / PAGE_SIZE);
  const el = document.getElementById("booksPagination");
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = `<button class="page-btn" onclick="goBookPage(${bookPage - 1})" ${bookPage === 1 ? "disabled" : ""}>‹</button>`;
  const range = [...new Set([1, bookPage - 1, bookPage, bookPage + 1, pages])]
    .filter((p) => p >= 1 && p <= pages)
    .sort((a, b) => a - b);
  let prev = 0;
  range.forEach((p) => {
    if (prev && p - prev > 1)
      html += `<span style="color:var(--muted);padding:0 .5rem">…</span>`;
    html += `<button class="page-btn ${p === bookPage ? "active" : ""}" onclick="goBookPage(${p})">${p}</button>`;
    prev = p;
  });
  html += `<button class="page-btn" onclick="goBookPage(${bookPage + 1})" ${bookPage === pages ? "disabled" : ""}>›</button>`;
  el.innerHTML = html;
}

function goBookPage(p) {
  if (p < 1 || p > Math.ceil(bookTotal / PAGE_SIZE)) return;
  bookPage = p;
  loadBooksTable();
}

async function deleteBook(id, title, isAvail) {
  if (!isAvail) {
    showToast("Cannot delete a book that is currently on loan.");
    return;
  }
  const okBook = await showConfirm(
    "Delete Book",
    `Delete "${title}"? This will permanently remove it from the library.`,
    "Delete Book",
    "📕",
    true,
  );
  if (!okBook) return;
  const { error } = await sb.from("books").delete().eq("id", id);
  if (error) {
    showToast("Error: " + error.message);
    return;
  }
  showToast("Book deleted.", "success");
  loadStats();
  loadBooksTable();
}

// ── Add / Edit Book Form ─────────────────────────────────────
function openAddBook() {
  editingBookId = null;
  document.getElementById("bookFormTitle").textContent = "Add New Book";
  document.getElementById("bookFormSubmitBtn").textContent = "Add Book";
  [
    "fTitle",
    "fAuthors",
    "fYear",
    "fCats",
    "fIsbn13",
    "fIsbn10",
    "fThumb",
    "fPages",
    "fDesc",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("bookFormMsg").innerHTML = "";
  document.getElementById("bookFormModal").classList.add("open");
}

async function openEditBook(id) {
  const { data: b } = await sb.from("books").select("*").eq("id", id).single();
  if (!b) return;
  editingBookId = id;
  document.getElementById("bookFormTitle").textContent = "Edit Book";
  document.getElementById("bookFormSubmitBtn").textContent = "Save Changes";
  document.getElementById("fTitle").value = b.title || "";
  document.getElementById("fAuthors").value = b.authors || "";
  document.getElementById("fYear").value = b.published_year || "";
  document.getElementById("fCats").value = b.categories || "";
  document.getElementById("fIsbn13").value = b.isbn13 || "";
  document.getElementById("fIsbn10").value = b.isbn10 || "";
  document.getElementById("fThumb").value = b.thumbnail || "";
  document.getElementById("fPages").value = b.num_pages || "";
  document.getElementById("fDesc").value = b.description || "";
  document.getElementById("bookFormMsg").innerHTML = "";
  document.getElementById("bookFormModal").classList.add("open");
}

async function submitBookForm() {
  const title = document.getElementById("fTitle").value.trim();
  if (!title) {
    document.getElementById("bookFormMsg").innerHTML =
      `<div class="alert alert-error">Title is required.</div>`;
    return;
  }

  const payload = {
    title,
    authors: document.getElementById("fAuthors").value.trim(),
    published_year: parseInt(document.getElementById("fYear").value) || null,
    categories: document.getElementById("fCats").value.trim(),
    isbn13: document.getElementById("fIsbn13").value.trim(),
    isbn10: document.getElementById("fIsbn10").value.trim(),
    thumbnail: document.getElementById("fThumb").value.trim(),
    num_pages: parseInt(document.getElementById("fPages").value) || null,
    description: document.getElementById("fDesc").value.trim(),
  };

  let error;
  if (editingBookId) {
    ({ error } = await sb
      .from("books")
      .update(payload)
      .eq("id", editingBookId));
  } else {
    ({ error } = await sb
      .from("books")
      .insert({ ...payload, is_available: true }));
  }

  if (error) {
    document.getElementById("bookFormMsg").innerHTML =
      `<div class="alert alert-error">${error.message}</div>`;
    return;
  }
  showToast(editingBookId ? "Book updated!" : "Book added!", "success");
  closeBookForm();
  loadStats();
  loadBooksTable();
}

function closeBookForm() {
  document.getElementById("bookFormModal").classList.remove("open");
}

// ── Loans Table ──────────────────────────────────────────────
async function loadLoansTable() {
  document.getElementById("loansSpinner").style.display = "block";
  const { data } = await sb
    .from("loans")
    .select("*, books(title), users(name, email)")
    .eq("is_returned", false)
    .order("due_date");
  document.getElementById("loansSpinner").style.display = "none";

  if (!data?.length) {
    document.getElementById("loansTableWrap").innerHTML =
      `<p style="color:var(--muted)">No active loans.</p>`;
    return;
  }

  const now = new Date();
  document.getElementById("loansTableWrap").innerHTML = `<table>
    <thead><tr><th>Book</th><th>Borrower</th><th>Borrowed</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${data
      .map((l) => {
        const due = new Date(l.due_date),
          overdue = now > due;
        return `<tr>
        <td style="font-size:.85rem;color:var(--cream)">${l.books?.title || "—"}</td>
        <td>
          <div style="font-size:.85rem;color:var(--cream)">${l.users?.name || "—"}</div>
          <div style="font-size:.75rem;color:var(--muted)">${l.users?.email || ""}</div>
        </td>
        <td style="font-size:.82rem;color:var(--muted)">${new Date(l.borrowed_at).toLocaleDateString()}</td>
        <td style="font-size:.82rem;color:${overdue ? "#e05747" : "var(--text)"}">${due.toLocaleDateString()}</td>
        <td>${
          overdue
            ? `<span class="overdue-tag">Overdue</span>`
            : `<span class="book-badge badge-available">Active</span>`
        }</td>
        <td><button class="btn btn-outline btn-sm" onclick="adminReturn(${l.book_id}, ${l.id})">Mark Returned</button></td>
      </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

// ── Overdue Table ────────────────────────────────────────────
async function loadOverdueTable() {
  document.getElementById("overdueSpinner").style.display = "block";
  const { data } = await sb
    .from("loans")
    .select("*, books(title), users(name, email)")
    .eq("is_returned", false)
    .lt("due_date", new Date().toISOString())
    .order("due_date");
  document.getElementById("overdueSpinner").style.display = "none";

  if (!data?.length) {
    document.getElementById("overdueTableWrap").innerHTML =
      `<p style="color:var(--muted)">No overdue loans. 🎉</p>`;
    return;
  }

  const now = new Date();
  document.getElementById("overdueTableWrap").innerHTML = `<table>
    <thead><tr><th>Book</th><th>Borrower</th><th>Due</th><th>Days Overdue</th><th>Fine</th><th>Action</th></tr></thead>
    <tbody>${data
      .map((l) => {
        const due = new Date(l.due_date);
        const days = Math.ceil((now - due) / 86400000);
        const fine = days * 10;
        return `<tr>
        <td style="font-size:.85rem;color:var(--cream)">${l.books?.title || "—"}</td>
        <td>
          <div style="font-size:.85rem">${l.users?.name || "—"}</div>
          <div style="font-size:.75rem;color:var(--muted)">${l.users?.email || ""}</div>
        </td>
        <td style="font-size:.82rem;color:#e05747">${due.toLocaleDateString()}</td>
        <td style="color:#e05747;font-weight:500">${days}d</td>
        <td style="color:#e05747">₹${fine}</td>
        <td><button class="btn btn-outline btn-sm" onclick="adminReturn(${l.book_id}, ${l.id})">Return</button></td>
      </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

// ── Users Table ──────────────────────────────────────────────
async function loadUsersTable() {
  document.getElementById("usersSpinner").style.display = "block";
  const { data } = await sb
    .from("users")
    .select("*, loans(id, is_returned)")
    .order("created_at", { ascending: false });
  document.getElementById("usersSpinner").style.display = "none";

  // Filter out soft-deleted users
  const activeUsers = data?.filter((u) => !u.is_deleted) || [];

  document.getElementById("usersTableWrap").innerHTML = `<table>
    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Active Loans</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>${activeUsers
      .map((u) => {
        const active = u.loans?.filter((l) => !l.is_returned).length || 0;
        return `<tr>
        <td>
          <div style="font-size:.88rem;color:var(--cream)">${u.name}</div>
          ${u.city ? `<div style="font-size:.75rem;color:var(--muted)">${u.city}</div>` : ""}
        </td>
        <td style="font-size:.82rem;color:var(--muted)">${u.email}</td>
        <td><span class="book-badge ${u.role === "admin" ? "badge-available" : "badge-unavailable"}">${u.role}</span></td>
        <td style="font-size:.82rem;color:var(--muted)">${u.phone || "—"}</td>
        <td style="font-size:.85rem">${active}/3</td>
        <td style="font-size:.82rem;color:var(--muted)">${new Date(u.created_at).toLocaleDateString()}</td>
        <td style="display:flex;gap:.4rem;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" onclick="toggleRole('${u.id}','${u.role}','${u.name}')">
            ${u.role === "admin" ? "Make User" : "Make Admin"}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}','${u.name}')">
            Delete
          </button>
        </td>
      </tr>`;
      })
      .join("")}</tbody>
  </table>`;
}

async function deleteUser(userId, name) {
  const ok = await showConfirm(
    "Delete User",
    `Delete ${name}'s account? Their loan history will be preserved but they won't be able to log in.`,
    "Delete User",
    "🗑️",
    true,
  );
  if (!ok) return;

  // Soft delete — mark as deleted, don't actually remove from DB
  const { error } = await sb
    .from("users")
    .update({ is_deleted: true })
    .eq("id", userId);
  if (error) {
    showToast("Error: " + error.message, "error");
    return;
  }

  showToast(`${name}'s account has been deleted.`, "success");
  loadUsersTable();
}

async function adminReturn(bookId, loanId) {
  const now = new Date();
  const { data: loan } = await sb
    .from("loans")
    .select("due_date")
    .eq("id", loanId)
    .single();
  const due = new Date(loan.due_date);
  const fine = now > due ? Math.ceil((now - due) / 86400000) * 10 : 0;
  await sb
    .from("loans")
    .update({
      is_returned: true,
      returned_at: now.toISOString(),
      fine_amount: fine,
    })
    .eq("id", loanId);
  await sb.from("books").update({ is_available: true }).eq("id", bookId);
  showToast(`Book returned.${fine > 0 ? " Fine: ₹" + fine : ""}`, "success");
  loadStats();
  loadLoansTable();
  loadOverdueTable();
}

async function toggleRole(userId, currentRole, name) {
  const newRole = currentRole === "admin" ? "user" : "admin";
  const okRole = await showConfirm(
    "Change Role",
    `Change ${name}'s role to ${newRole}?`,
    `Make ${newRole}`,
    "👤",
    false,
  );
  if (!okRole) return;
  await sb.from("users").update({ role: newRole }).eq("id", userId);
  showToast(`${name} is now ${newRole}.`, "success");
  loadUsersTable();
}

// ── Reviews Table ─────────────────────────────────────────────
async function loadReviewsTable() {
  document.getElementById("reviewsSpinner").style.display = "block";
  const { data } = await sb
    .from("reviews")
    .select("*, books(title), users(name, email)")
    .order("created_at", { ascending: false });
  document.getElementById("reviewsSpinner").style.display = "none";

  if (!data?.length) {
    document.getElementById("reviewsTableWrap").innerHTML =
      `<p style="color:var(--muted)">No reviews yet.</p>`;
    return;
  }

  document.getElementById("reviewsTableWrap").innerHTML = `<table>
    <thead><tr><th>Book</th><th>User</th><th>Rating</th><th>Review</th><th>Date</th><th>Action</th></tr></thead>
    <tbody>${data
      .map(
        (r) => `<tr>
      <td style="font-size:.85rem;color:var(--cream);max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.books?.title || "—"}</td>
      <td>
        <div style="font-size:.85rem;color:var(--cream)">${r.users?.name || "—"}</div>
        <div style="font-size:.75rem;color:var(--muted)">${r.users?.email || ""}</div>
      </td>
      <td style="color:var(--gold);font-size:.88rem">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</td>
      <td style="font-size:.82rem;color:var(--muted);max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${r.review_text || "<em>No text</em>"}
      </td>
      <td style="font-size:.78rem;color:var(--muted)">${new Date(r.created_at).toLocaleDateString()}</td>
      <td><button class="btn btn-danger btn-sm" onclick="adminDeleteReview(${r.id}, ${r.book_id})">Delete</button></td>
    </tr>`,
      )
      .join("")}</tbody>
  </table>`;
}

async function adminDeleteReview(reviewId, bookId) {
  const okRev = await showConfirm(
    "Delete Review",
    "Permanently delete this review? The book rating will be recalculated.",
    "Delete",
    "🗑️",
    true,
  );
  if (!okRev) return;
  const { error } = await sb.from("reviews").delete().eq("id", reviewId);
  if (error) {
    console.error("Admin delete review error:", error);
    showToast("Could not delete: " + error.message, "error");
    return;
  }

  // Recalculate average
  const { data: allRatings } = await sb
    .from("reviews")
    .select("rating")
    .eq("book_id", bookId);
  if (allRatings?.length) {
    const avg =
      allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length;
    await sb
      .from("books")
      .update({ average_rating: avg, ratings_count: allRatings.length })
      .eq("id", bookId);
  } else {
    await sb
      .from("books")
      .update({ average_rating: null, ratings_count: 0 })
      .eq("id", bookId);
  }
  showToast("Review deleted.", "success");
  loadReviewsTable();
}

// ── Tab switching ────────────────────────────────────────────
function switchTab(name) {
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".admin-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById(`tab-${name}`).classList.add("active");
  event.target.classList.add("active");
  if (name === "loans") loadLoansTable();
  if (name === "overdue") loadOverdueTable();
  if (name === "users") loadUsersTable();
  if (name === "reviews") loadReviewsTable();
}

document.getElementById("bookFormModal").addEventListener("click", (e) => {
  if (e.target.id === "bookFormModal") closeBookForm();
});

init();
