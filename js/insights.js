// ── Chart.js global defaults ────────────────────────────────
Chart.defaults.color = "#6b6152";
Chart.defaults.borderColor = "#2e2820";
Chart.defaults.font.family = "'DM Sans', sans-serif";

let adminUser;
const CATEGORIES = [
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

async function init() {
  initTransitions();
  initScrollReveal();
  const session = await requireAdmin();
  if (!session) return;
  adminUser = await getCurrentUser();
  document.getElementById("navUser").textContent = adminUser.name;
  document.getElementById("lastUpdated").textContent =
    "Updated " +
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Load everything in parallel
  await Promise.all([
    loadStats(),
    loadDonut(),
    loadHeatmap(),
    loadLeaderboard(),
    loadGenreChart(),
    loadTrendChart(),
  ]);
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
  document.getElementById("statTotal").textContent = total || 0;
  document.getElementById("statAvail").textContent = avail || 0;
  document.getElementById("statLoaned").textContent = loaned || 0;
  document.getElementById("statUsers").textContent = users || 0;
  document.getElementById("statOverdue").textContent = overdue || 0;
  animateAllStats();
}

// ── Availability Donut ───────────────────────────────────────
async function loadDonut() {
  const [{ count: avail }, { count: loaned }] = await Promise.all([
    sb
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("is_available", true),
    sb
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("is_available", false),
  ]);

  const a = avail || 0,
    l = loaned || 0,
    total = a + l;
  const pct = total ? Math.round((a / total) * 100) : 0;

  document.getElementById("availPct").textContent = pct + "% free";
  document.getElementById("donutNum").textContent = a.toLocaleString();

  new Chart(document.getElementById("donutChart"), {
    type: "doughnut",
    data: {
      datasets: [
        {
          data: [a, l],
          backgroundColor: ["#4dbb78", "#c9a84c"],
          borderColor: "#13110d",
          borderWidth: 3,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.raw.toLocaleString()} books`,
          },
        },
      },
      animation: { animateRotate: true, duration: 1200 },
    },
  });
}

// ── Borrow Activity Heatmap ──────────────────────────────────
async function loadHeatmap() {
  // Fetch all loans from last 12 weeks
  const since = new Date();
  since.setDate(since.getDate() - 84); // 12 weeks = 84 days

  const { data } = await sb
    .from("loans")
    .select("borrowed_at")
    .gte("borrowed_at", since.toISOString());

  // Count borrows per day
  const counts = {};
  (data || []).forEach((l) => {
    const day = l.borrowed_at.slice(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  });

  const max = Math.max(...Object.values(counts), 1);

  // Build 84-day grid (12 cols × 7 rows)
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  // Group into weeks (columns)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayNames = ["", "M", "", "W", "", "F", ""];

  // Color intensity
  function cellColor(count) {
    if (!count) return "var(--bg3)";
    const ratio = count / max;
    if (ratio < 0.2) return "rgba(201,168,76,.15)";
    if (ratio < 0.4) return "rgba(201,168,76,.35)";
    if (ratio < 0.7) return "rgba(201,168,76,.6)";
    return "var(--gold)";
  }

  const wrap = document.getElementById("heatmapWrap");
  document.getElementById("heatmapSpinner").remove();

  // Month labels above columns
  let lastMonth = "";
  const monthLabels = weeks.map((week) => {
    const m = week[0].toLocaleString("en", { month: "short" });
    if (m !== lastMonth) {
      lastMonth = m;
      return m;
    }
    return "";
  });

  wrap.innerHTML = `
    <div style="display:flex;gap:0">
      <div class="heatmap-day-labels">
        ${dayNames.map((d) => `<div class="hm-day-label">${d}</div>`).join("")}
      </div>
      <div>
        <div class="heatmap-month-labels">
          ${monthLabels.map((m) => `<div class="hm-month-label" style="width:16px">${m}</div>`).join("")}
        </div>
        <div class="heatmap-grid">
          ${weeks
            .map(
              (week) => `
            <div class="heatmap-col">
              ${week
                .map((d) => {
                  const key = d.toISOString().slice(0, 10);
                  const count = counts[key] || 0;
                  const label = `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}: ${count} borrow${count !== 1 ? "s" : ""}`;
                  return `<div class="hm-cell"
                  style="background:${cellColor(count)}"
                  data-tip="${label}"
                  onmouseenter="showHmTip(event,this)"
                  onmouseleave="hideHmTip()"></div>`;
                })
                .join("")}
            </div>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  // Tooltip element
  if (!document.getElementById("hmTooltip")) {
    const tip = document.createElement("div");
    tip.id = "hmTooltip";
    tip.className = "hm-tooltip";
    document.body.appendChild(tip);
  }
}

function showHmTip(e, el) {
  const tip = document.getElementById("hmTooltip");
  tip.textContent = el.dataset.tip;
  tip.style.left = e.clientX + 12 + "px";
  tip.style.top = e.clientY - 28 + "px";
  tip.classList.add("show");
}
function hideHmTip() {
  document.getElementById("hmTooltip")?.classList.remove("show");
}

// ── Top Borrowed Leaderboard ─────────────────────────────────
async function loadLeaderboard() {
  const { data } = await sb
    .from("loans")
    .select("book_id, books(title, authors)");

  document.getElementById("leaderSpinner").remove();

  if (!data?.length) {
    document.getElementById("leaderboard").innerHTML =
      `<p style="color:var(--muted);font-size:.85rem">No loan data yet.</p>`;
    return;
  }

  // Count by book_id
  const counts = {};
  const meta = {};
  data.forEach((l) => {
    if (!l.book_id) return;
    counts[l.book_id] = (counts[l.book_id] || 0) + 1;
    meta[l.book_id] = l.books;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxCount = sorted[0]?.[1] || 1;

  const el = document.getElementById("leaderboard");
  el.innerHTML = sorted
    .map(([id, count], i) => {
      const book = meta[id];
      const pct = Math.round((count / maxCount) * 100);
      return `
      <div class="leader-item">
        <div class="leader-rank ${i < 3 ? "top" : ""}">${i + 1}</div>
        <div class="leader-info">
          <div class="leader-title">${book?.title || "Unknown"}</div>
          <div class="leader-author">${book?.authors?.split("/")[0]?.trim() || "—"}</div>
        </div>
        <div class="leader-bar-wrap">
          <div class="leader-bar-bg">
            <div class="leader-bar-fill" style="width:0%" data-pct="${pct}"></div>
          </div>
          <div class="leader-count">${count} loan${count !== 1 ? "s" : ""}</div>
        </div>
      </div>`;
    })
    .join("");

  // Animate bars after render
  requestAnimationFrame(() => {
    document.querySelectorAll(".leader-bar-fill").forEach((bar, i) => {
      setTimeout(() => {
        bar.style.width = bar.dataset.pct + "%";
      }, i * 80);
    });
  });
}

// ── Genre Bar Chart ──────────────────────────────────────────
async function loadGenreChart() {
  // Count books per category using our known list
  const counts = await Promise.all(
    CATEGORIES.map((cat) =>
      sb
        .from("books")
        .select("*", { count: "exact", head: true })
        .eq("categories", cat)
        .then(({ count }) => ({ cat, count: count || 0 })),
    ),
  );

  const sorted = counts.sort((a, b) => b.count - a.count).slice(0, 12);
  const labels = sorted.map((x) => x.cat.replace(" / ", "/"));
  const values = sorted.map((x) => x.count);
  const maxVal = Math.max(...values);

  // Gold gradient bars
  const colors = values.map((v, i) => {
    const alpha = 0.35 + (v / maxVal) * 0.65;
    return `rgba(201,168,76,${alpha.toFixed(2)})`;
  });

  new Chart(document.getElementById("genreChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "rgba(201,168,76,.6)",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => ` ${ctx.raw} books` },
        },
      },
      scales: {
        x: {
          grid: { color: "#2e2820" },
          ticks: { color: "#6b6152", font: { size: 11 } },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#d4c9b0", font: { size: 11 } },
        },
      },
      animation: { duration: 1000, easing: "easeOutQuart" },
    },
  });
}

// ── Borrowing Trend Line Chart ───────────────────────────────
async function loadTrendChart() {
  // Get all loans, group by month
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);

  const { data } = await sb
    .from("loans")
    .select("borrowed_at")
    .gte("borrowed_at", since.toISOString())
    .order("borrowed_at");

  // Build month buckets
  const buckets = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    buckets[key] = 0;
  }

  (data || []).forEach((l) => {
    const key = l.borrowed_at.slice(0, 7);
    if (key in buckets) buckets[key]++;
  });

  const labels = Object.keys(buckets).map((k) => {
    const [y, m] = k.split("-");
    return new Date(+y, +m - 1).toLocaleString("en", {
      month: "short",
      year: "2-digit",
    });
  });
  const values = Object.values(buckets);

  new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderColor: "#c9a84c",
          backgroundColor: "rgba(201,168,76,.08)",
          borderWidth: 2,
          pointBackgroundColor: "#c9a84c",
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw} loans` } },
      },
      scales: {
        x: {
          grid: { color: "#2e2820" },
          ticks: { color: "#6b6152", font: { size: 11 } },
        },
        y: {
          grid: { color: "#2e2820" },
          ticks: { color: "#6b6152", font: { size: 11 } },
          beginAtZero: true,
        },
      },
      animation: { duration: 1200, easing: "easeOutQuart" },
    },
  });
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

init();
