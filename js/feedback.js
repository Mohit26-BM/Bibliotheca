// ============================================================
// Web3Forms Access Key is now in Netlify environment variables
// All feedback submissions go through /.netlify/functions/feedback-proxy
// ============================================================

let currentUser = null;

async function init() {
  initTransitions();
  initScrollReveal();

  const session = await requireAuth("../index.html");
  if (!session) return;

  currentUser = await getCurrentUser();
  if (!currentUser) return;

  document.getElementById("navUser").textContent = currentUser.name || "User";

  // Only normal users can send feedback from this page.
  if (currentUser.role !== "user") {
    window.location.href = currentUser.role === "admin" ? "admin.html" : "dashboard.html";
    return;
  }

  const nameEl = document.getElementById("fbName");
  const emailEl = document.getElementById("fbEmail");
  nameEl.value = currentUser.name || "";
  emailEl.value = currentUser.email || "";

  document.getElementById("feedbackForm").addEventListener("submit", submitFeedback);
}

async function submitFeedback(e) {
  e.preventDefault();

  const msgEl = document.getElementById("feedbackMsg");
  const btn = document.getElementById("sendFeedbackBtn");
  const type = document.getElementById("fbType").value;
  const message = document.getElementById("fbMessage").value.trim();

  if (!type || !message) {
    msgEl.innerHTML = '<div class="alert alert-error">Please select a feedback type and enter your message.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";
  msgEl.innerHTML = "";

  const payload = {
    subject: `Bibliotheca Feedback: ${type}`,
    from_name: "Bibliotheca Feedback Page",
    name: document.getElementById("fbName").value.trim(),
    email: document.getElementById("fbEmail").value.trim(),
    feedback_type: type,
    message,
  };

  try {
    // Call feedback proxy instead of Web3Forms directly
    const response = await fetch("/.netlify/functions/feedback-proxy", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${(await sb.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || result.message || "Failed to send feedback.");
    }

    document.getElementById("fbMessage").value = "";
    document.getElementById("fbType").value = "";
    msgEl.innerHTML = '<div class="alert alert-success">Thanks! Your feedback has been sent successfully.</div>';
  } catch (err) {
    msgEl.innerHTML = `<div class="alert alert-error">${err.message || "Something went wrong while sending feedback."}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = "Send Feedback";
  }
}

document.addEventListener("DOMContentLoaded", init);
