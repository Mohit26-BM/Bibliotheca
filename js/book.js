let currentUser,
  selectedRating = 0,
  descExpanded = false;

async function init() {
  initTransitions();
  initScrollReveal();
  const session = await requireAuth("../index.html");
  if (!session) return;
  currentUser = await getCurrentUser();
  document.getElementById("navUser").textContent = currentUser?.name || "User";

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    window.location.href = "dashboard.html";
    return;
  }

  await loadBook(id);
}

async function loadBook(id) {
  const [{ data: book }, { data: reviews }] = await Promise.all([
    sb.from("books").select("*").eq("id", id).single(),
    sb
      .from("reviews")
      .select("*, users(name)")
      .eq("book_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!book) {
    document.getElementById("spinner").style.display = "none";
    return;
  }

  const { data: myLoan } = await sb
    .from("loans")
    .select("id, due_date")
    .eq("book_id", id)
    .eq("user_id", currentUser.id)
    .eq("is_returned", false)
    .maybeSingle();

  const { count: loanCount } = await sb
    .from("loans")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser.id)
    .eq("is_returned", false);

  const myReview = reviews?.find((r) => r.user_id === currentUser.id);
  if (myReview) selectedRating = myReview.rating;

  const avgStars = Math.round(book.average_rating || 0);
  const descLong = book.description && book.description.length > 400;

  document.title = `${book.title} — Bibliotheca`;

  document.getElementById("bookContent").innerHTML = `
    <div class="book-hero">
      <div class="cover-wrap">
        ${
          book.thumbnail
            ? `<img class="cover-img" src="${book.thumbnail}" alt="${book.title}"
               onerror="this.outerHTML='<div class=cover-placeholder>📖</div>'" />`
            : `<div class="cover-placeholder">📖</div>`
        }
      </div>

      <div class="book-meta">
        <h1>${book.title}</h1>
        <p class="book-author-line">by <span>${book.authors || "Unknown Author"}</span></p>

        <div class="meta-pills">
          ${book.categories ? `<span class="pill pill-gold">${book.categories}</span>` : ""}
          ${book.published_year ? `<span class="pill">${book.published_year}</span>` : ""}
          ${book.num_pages ? `<span class="pill">${book.num_pages} pages</span>` : ""}
          <span class="pill ${book.is_available ? "badge-available" : "badge-unavailable"}" style="border-radius:20px">
            ${book.is_available ? "✓ Available" : "✗ On Loan"}
          </span>
        </div>

        <div class="rating-row">
          <div class="big-rating">${book.average_rating?.toFixed(1) || "—"}</div>
          <div class="rating-detail">
            <div class="stars-display">
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) =>
                    `<span class="${n <= avgStars ? "star-filled" : "star-empty"}">★</span>`,
                )
                .join("")}
            </div>
            <div class="rating-count">${(book.ratings_count || 0).toLocaleString()} ratings</div>
          </div>
        </div>

        <div class="action-box">
          ${
            myLoan
              ? `<div>
                 <p style="color:var(--gold);font-size:.9rem;margin-bottom:.4rem">📖 Currently borrowed by you</p>
                 <p class="due-info">Due: <strong>${new Date(myLoan.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></p>
               </div>
               <button class="btn btn-outline btn-sm" onclick="returnBook(${book.id}, ${myLoan.id})">Return Book</button>`
              : book.is_available
                ? loanCount >= 3
                  ? `<p style="color:var(--muted);font-size:.88rem">You have 3 active loans. Return a book to borrow more.</p>`
                  : `<div>
                     <button class="btn btn-gold" onclick="borrowBook(${book.id})">Borrow This Book</button>
                     <p class="due-info" style="margin-top:.5rem">14-day loan · ₹10/day late fee</p>
                   </div>`
                : `<p style="color:var(--muted);font-size:.88rem">This book is currently on loan and unavailable.</p>`
          }
        </div>

        <div class="description-section">
          <h3>About this book</h3>
          ${
            book.description
              ? `<p class="description-text ${descLong ? "collapsed" : ""}" id="descText">${book.description}</p>
               ${descLong ? `<button class="read-more" onclick="toggleDesc()">Read more ↓</button>` : ""}`
              : `<p class="description-text" style="color:var(--muted)">No description available.</p>`
          }
        </div>

        <div class="info-grid">
          ${book.isbn13 ? `<div class="info-item"><span class="info-label">ISBN-13</span><span class="info-value">${book.isbn13}</span></div>` : ""}
          ${book.isbn10 ? `<div class="info-item"><span class="info-label">ISBN-10</span><span class="info-value">${book.isbn10}</span></div>` : ""}
          ${book.published_year ? `<div class="info-item"><span class="info-label">Published</span><span class="info-value">${book.published_year}</span></div>` : ""}
          ${book.num_pages ? `<div class="info-item"><span class="info-label">Pages</span><span class="info-value">${book.num_pages}</span></div>` : ""}
          ${book.categories ? `<div class="info-item"><span class="info-label">Category</span><span class="info-value">${book.categories}</span></div>` : ""}
        </div>
      </div>
    </div>

    <hr class="section-divider" />

    <div class="reviews-section">
      <h3>Reader Reviews (${reviews?.length || 0})</h3>
      <div class="review-form-box">
        <p>${myReview ? "Your Review" : "Rate & Review"}</p>
        <div class="star-input" id="starInput">
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<span class="${n <= (myReview?.rating || 0) ? "lit" : ""}" data-v="${n}" onclick="setRating(${n})">★</span>`,
            )
            .join("")}
        </div>
        <textarea id="reviewText" rows="3" placeholder="Share your thoughts about this book…">${myReview?.review_text || ""}</textarea>
        <button class="btn btn-outline btn-sm" style="margin-top:.7rem" onclick="submitReview(${book.id})">
          ${myReview ? "Update Review" : "Submit Review"}
        </button>
      </div>

      <div id="reviewsList">
        ${
          reviews?.length
            ? reviews
                .map(
                  (r) => `
            <div class="review-card">
              <div class="reviewer-row">
                <div>
                  <span class="reviewer-name">${r.users?.name || "Reader"}</span>
                  <span class="review-stars" style="margin-left:.6rem">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
                </div>
                <div style="display:flex;align-items:center;gap:.8rem">
                  <span class="review-date">${new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  ${
                    r.user_id === currentUser.id
                      ? `<button class="btn btn-danger btn-sm" style="padding:.15rem .6rem;font-size:.72rem"
                         onclick="deleteReview(${r.id}, ${book.id})">Delete</button>`
                      : ""
                  }
                </div>
              </div>
              ${r.review_text ? `<p class="review-text">${r.review_text}</p>` : ""}
            </div>`,
                )
                .join("")
            : `<p class="no-reviews">No reviews yet — be the first to share your thoughts.</p>`
        }
      </div>
    </div>
  `;

  document.getElementById("spinner").style.display = "none";
  document.getElementById("bookContent").style.display = "block";
}

function toggleDesc() {
  const el = document.getElementById("descText");
  const btn = document.querySelector(".read-more");
  descExpanded = !descExpanded;
  el.classList.toggle("collapsed", !descExpanded);
  btn.textContent = descExpanded ? "Show less ↑" : "Read more ↓";
}

function setRating(v) {
  selectedRating = v;
  document
    .querySelectorAll("#starInput span")
    .forEach((s, i) => s.classList.toggle("lit", i < v));
}

async function submitReview(bookId) {
  if (!selectedRating) {
    showToast("Please select a star rating first.");
    return;
  }
  const text = document.getElementById("reviewText").value.trim();

  // Check if review already exists to decide insert vs update
  const { data: existing } = await sb
    .from("reviews")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", currentUser.id)
    .maybeSingle();

  let error;
  if (existing) {
    // Update existing review
    ({ error } = await sb
      .from("reviews")
      .update({ rating: selectedRating, review_text: text })
      .eq("id", existing.id)
      .eq("user_id", currentUser.id));
  } else {
    // Insert new review
    ({ error } = await sb
      .from("reviews")
      .insert({
        book_id: bookId,
        user_id: currentUser.id,
        rating: selectedRating,
        review_text: text,
      }));
  }

  if (error) {
    showToast("Error saving review: " + error.message, "error");
    return;
  }

  const { data: allRatings } = await sb
    .from("reviews")
    .select("rating")
    .eq("book_id", bookId);
  const avg = allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length;
  await sb
    .from("books")
    .update({ average_rating: avg, ratings_count: allRatings.length })
    .eq("id", bookId);

  showToast(
    existing ? "Review updated! ✨" : "Review submitted! ✨",
    "success",
  );
  const id = new URLSearchParams(window.location.search).get("id");
  setTimeout(() => loadBook(id), 800);
}

async function deleteReview(reviewId, bookId) {
  const ok = await showConfirm(
    "Delete Review",
    "Are you sure you want to delete your review? This cannot be undone.",
    "Delete",
    "🗑️",
    true,
  );
  if (!ok) return;
  const { error } = await sb.from("reviews").delete().eq("id", reviewId);
  if (error) {
    console.error("Delete review error:", error);
    showToast("Could not delete review: " + error.message, "error");
    return;
  }

  // Recalculate average rating
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

  selectedRating = 0;
  showToast("Review deleted.", "success");
  const id = new URLSearchParams(window.location.search).get("id");
  setTimeout(() => loadBook(id), 600);
}

async function borrowBook(bookId) {
  const due = new Date();
  due.setDate(due.getDate() + 14);
  const { error } = await sb.from("loans").insert({
    book_id: bookId,
    user_id: currentUser.id,
    due_date: due.toISOString(),
    is_returned: false,
  });
  if (error) {
    showToast("Error: " + error.message);
    return;
  }
  await sb.from("books").update({ is_available: false }).eq("id", bookId);
  showToast(`Borrowed! Due by ${due.toLocaleDateString()} 📚`, "success");
  setTimeout(() => loadBook(bookId), 800);
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
  if (fine > 0) showToast(`Returned late. Fine: ₹${fine} 💸`);
  else showToast("Returned on time! ✅", "success");
  setTimeout(() => loadBook(bookId), 800);
}

async function openMyLoans() {
  const { data } = await sb
    .from("loans")
    .select("*, books(title, authors)")
    .eq("user_id", currentUser.id)
    .order("borrowed_at", { ascending: false });

  const active = data?.filter((l) => !l.is_returned) || [];
  document.getElementById("loansBody").innerHTML = `
    <h4 style="margin-bottom:1rem">Active Loans (${active.length}/3)</h4>
    ${
      active.length
        ? `<table>
      <thead><tr><th>Book</th><th>Due</th><th>Action</th></tr></thead>
      <tbody>${active
        .map((l) => {
          const due = new Date(l.due_date),
            overdue = new Date() > due;
          return `<tr>
          <td style="font-size:.88rem;color:var(--cream)">${l.books?.title}</td>
          <td style="font-size:.82rem;color:${overdue ? "#e05747" : "var(--text)"}">${due.toLocaleDateString()}${overdue ? " ⚠️" : ""}</td>
          <td><button class="btn btn-outline btn-sm"
            onclick="returnBook(${l.book_id},${l.id});document.getElementById('loansModal').classList.remove('open')">
            Return
          </button></td>
        </tr>`;
        })
        .join("")}</tbody>
    </table>`
        : `<p style="color:var(--muted)">No active loans.</p>`
    }
  `;
  document.getElementById("loansModal").classList.add("open");
}

document.getElementById("loansModal").addEventListener("click", (e) => {
  if (e.target.id === "loansModal")
    document.getElementById("loansModal").classList.remove("open");
});

init();
