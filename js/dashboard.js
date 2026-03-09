let currentUser, searchTimer;
const PAGE_SIZE = 24;
let currentPage = 1,
  totalPages = 1;

async function init() {
  initTransitions();
  initScrollReveal();
  const session = await requireAuth("../index.html");
  if (!session) return;
  currentUser = await getCurrentUser();
  document.getElementById("navUser").textContent = currentUser?.name || "User";
  document.getElementById("greeting").textContent =
    `Welcome back, ${currentUser?.name?.split(" ")[0] || "there"}`;

  loadCategories();
  loadBubbles();
  loadBooks();
}

function updateTotalCount(count) {
  document.getElementById("totalCount").textContent =
    count?.toLocaleString() || "—";
}

function loadCategories() {
  const cats = [
    "Fiction",
    "Juvenile Fiction",
    "Biography / Autobiography",
    "History",
    "Literary Criticism",
    "Philosophy",
    "Religion",
    "Comics / Graphic Novels",
    "Drama",
    "Juvenile Nonfiction",
    "Poetry",
    "Literary Collections",
    "Business / Economics",
    "Science",
    "Social Science",
    "Performing Arts",
    "Art",
    "Cooking",
    "Body / Mind / Spirit",
    "Travel",
  ];
  const sel = document.getElementById("filterCat");
  cats.forEach((c) => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

async function loadBooks() {
  showSkeletons("bookGrid", 24);
  document.getElementById("loading").style.display = "none";

  const search = document.getElementById("searchInput").value.trim();
  const cat = document.getElementById("filterCat").value;
  const avail = document.getElementById("filterAvail").value;
  const sort = document.getElementById("sortBy").value;
  const from = (currentPage - 1) * PAGE_SIZE;

  let q = sb
    .from("books")
    .select(
      "id, title, authors, thumbnail, average_rating, num_pages, is_available",
      { count: "exact" },
    );

  if (search) q = q.or(`title.ilike.%${search}%,authors.ilike.%${search}%`);
  if (cat) q = q.eq("categories", cat);
  if (avail !== "") q = q.eq("is_available", avail === "true");
  q = q
    .order(sort, { ascending: sort === "title" })
    .range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await q;

  if (error || !data?.length) {
    document.getElementById("bookGrid").innerHTML =
      `<p style="color:var(--muted);grid-column:1/-1;padding:2rem 0">No books found.</p>`;
    shakeSearch("searchInput");
    renderPagination(0);
    return;
  }

  totalPages = Math.ceil(count / PAGE_SIZE);
  updateTotalCount(count);
  renderPagination(count);
  renderBooks(data);
}

function renderBooks(books) {
  const grid = document.getElementById("bookGrid");
  grid.innerHTML = books
    .map(
      (b) => `
    <div class="book-card fade-in" onclick="navigateTo('book.html?id=${b.id}')">
      <div class="book-thumb-wrap">
        ${
          b.thumbnail
            ? `<img class="book-thumb" src="${b.thumbnail}" alt="${b.title}" loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=book-thumb-placeholder>📖</div>'" />`
            : `<div class="book-thumb-placeholder">📖</div>`
        }
      </div>
      <div class="book-info">
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.authors || "Unknown author"}</div>
        <div style="display:flex;align-items:center;gap:.3rem;margin-top:.4rem;font-size:.78rem;color:var(--gold-dim)">
          ★ ${b.average_rating?.toFixed(1) || "—"} · ${b.num_pages || "?"} pp
        </div>
        <span class="book-badge ${b.is_available ? "badge-available" : "badge-unavailable"}">
          ${b.is_available ? "Available" : "On Loan"}
        </span>
      </div>
    </div>`,
    )
    .join("");
  applyTilt();
  staggerCards();
}

function renderPagination(total) {
  const el = document.getElementById("pagination");
  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }
  let html = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  const range = [
    ...new Set([
      1,
      2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      totalPages - 1,
      totalPages,
    ]),
  ]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  let prev = 0;
  range.forEach((p) => {
    if (prev && p - prev > 1)
      html += `<span style="color:var(--muted);padding:0 .5rem">…</span>`;
    html += `<button class="page-btn ${p === currentPage ? "active" : ""}" onclick="goPage(${p})">${p}</button>`;
    prev = p;
  });
  html += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>›</button>`;
  el.innerHTML = html;
}

function goPage(p) {
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  loadBooks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onSearch() {
  clearTimeout(searchTimer);
  currentPage = 1;
  searchTimer = setTimeout(loadBooks, 350);
}

// ── My Loans Modal ───────────────────────────────────────────
async function openMyLoans() {
  const { data } = await sb
    .from("loans")
    .select("*, books(title, authors, thumbnail)")
    .eq("user_id", currentUser.id)
    .order("borrowed_at", { ascending: false });

  const active = data?.filter((l) => !l.is_returned) || [];
  const history = data?.filter((l) => l.is_returned) || [];

  document.getElementById("loansBody").innerHTML = `
    <h4 style="margin-bottom:1rem">Active Loans (${active.length}/3)</h4>
    ${
      active.length
        ? `<table>
      <thead><tr><th>Book</th><th>Borrowed</th><th>Due</th><th>Action</th></tr></thead>
      <tbody>${active
        .map((l) => {
          const due = new Date(l.due_date),
            overdue = new Date() > due;
          return `<tr>
          <td>
            <div style="font-size:.88rem;color:var(--cream)">${l.books?.title}</div>
            <div style="font-size:.78rem;color:var(--muted)">${l.books?.authors || ""}</div>
          </td>
          <td style="font-size:.82rem;color:var(--muted)">${new Date(l.borrowed_at).toLocaleDateString()}</td>
          <td style="font-size:.82rem;color:${overdue ? "#e05747" : "var(--text)"}">
            ${due.toLocaleDateString()}${overdue ? " ⚠️" : ""}
          </td>
          <td><button class="btn btn-outline btn-sm" onclick="returnBook(${l.book_id},${l.id});closeLoansModal()">Return</button></td>
        </tr>`;
        })
        .join("")}</tbody>
    </table>`
        : `<p style="color:var(--muted);font-size:.88rem">No active loans.</p>`
    }

    ${
      history.length
        ? `
    <h4 style="margin:1.5rem 0 1rem">History</h4>
    <table>
      <thead><tr><th>Book</th><th>Returned</th><th>Fine</th></tr></thead>
      <tbody>${history
        .map(
          (l) => `<tr>
        <td style="font-size:.85rem;color:var(--cream)">${l.books?.title}</td>
        <td style="font-size:.82rem;color:var(--muted)">${new Date(l.returned_at).toLocaleDateString()}</td>
        <td style="font-size:.82rem;color:${l.fine_amount > 0 ? "#e05747" : "var(--green)"}">
          ${l.fine_amount > 0 ? "₹" + l.fine_amount : "None"}
        </td>
      </tr>`,
        )
        .join("")}</tbody>
    </table>`
        : ""
    }
  `;
  document.getElementById("loansModal").classList.add("open");
}

async function returnBook(bookId, loanId) {
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
  loadBooks();
  if (fine > 0) showToast(`Book returned. Late fee: ₹${fine} 💸`);
  else showToast("Book returned on time! ✅", "success");
}

function closeLoansModal() {
  document.getElementById("loansModal").classList.remove("open");
}
document.getElementById("loansModal").addEventListener("click", (e) => {
  if (e.target.id === "loansModal") closeLoansModal();
});

// ── Genre Bubble Explorer ────────────────────────────────────
const GENRE_DATA = [
  { cat: "Fiction", count: 2393 },
  { cat: "Juvenile Fiction", count: 497 },
  { cat: "Biography / Autobiography", count: 376 },
  { cat: "History", count: 252 },
  { cat: "Literary Criticism", count: 158 },
  { cat: "Philosophy", count: 151 },
  { cat: "Religion", count: 135 },
  { cat: "Comics / Graphic Novels", count: 127 },
  { cat: "Drama", count: 121 },
  { cat: "Juvenile Nonfiction", count: 100 },
  { cat: "Poetry", count: 73 },
  { cat: "Literary Collections", count: 69 },
  { cat: "Business / Economics", count: 66 },
  { cat: "Science", count: 62 },
  { cat: "Social Science", count: 56 },
  { cat: "Performing Arts", count: 48 },
  { cat: "Art", count: 45 },
  { cat: "Cooking", count: 44 },
  { cat: "Body / Mind / Spirit", count: 42 },
  { cat: "Travel", count: 42 },
];

function loadBubbles() {
  const container = document.getElementById("bubbleContainer");
  const maxCount = Math.max(...GENRE_DATA.map((g) => g.count));

  container.innerHTML = GENRE_DATA.map((g) => {
    const size = 0.75 + (g.count / maxCount) * 0.5; // font scale 0.75–1.25rem
    return `<div class="bubble" data-cat="${g.cat}"
      style="font-size:${size.toFixed(2)}rem"
      onclick="selectBubble('${g.cat.replace(/'/g, "\'")}', this)">
      ${g.cat}
      <span class="bubble-count">${g.count}</span>
    </div>`;
  }).join("");
}

function selectBubble(cat, el) {
  // Toggle: if already active, clear
  if (el.classList.contains("active")) {
    clearBubble();
    return;
  }

  // Deactivate all, activate this one
  document
    .querySelectorAll(".bubble")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");

  // Set the category filter dropdown and reload
  document.getElementById("filterCat").value = cat;
  document.getElementById("bubbleClear").style.display = "inline";
  currentPage = 1;
  loadBooks();
}

function clearBubble() {
  document
    .querySelectorAll(".bubble")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("filterCat").value = "";
  document.getElementById("bubbleClear").style.display = "none";
  currentPage = 1;
  loadBooks();
}

init();
