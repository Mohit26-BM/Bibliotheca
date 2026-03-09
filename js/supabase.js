// ============================================================
//  REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT VALUES
// ============================================================
const SUPABASE_URL = "https://pczonciwfgmecbzsbtyt.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjem9uY2l3ZmdtZWNienNidHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODMyODUsImV4cCI6MjA4ODM1OTI4NX0.IUcoDPud1ROUkcMJ83MW3P9k9jJ4fcuuoZL_VR8DEmg";
// ============================================================

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Redirect to login if not authenticated
async function requireAuth(redirectTo = "../index.html") {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

// Redirect to dashboard if not admin
async function requireAdmin() {
  const session = await requireAuth();
  if (!session) return null;
  const { data: user } = await sb
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  if (!user || user.role !== "admin") {
    window.location.href = "dashboard.html";
    return null;
  }
  return session;
}

// Get current user profile — creates profile row if missing (safety net)
async function getCurrentUser() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return null;

  let { data } = await sb
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  // If profile row doesn't exist (trigger may have failed), create it now
  if (!data) {
    await sb.from("users").insert({
      id: session.user.id,
      name:
        session.user.user_metadata?.name || session.user.email.split("@")[0],
      email: session.user.email,
      role: "user",
    });
    ({ data } = await sb
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single());
  }

  return data;
}

// Sign out and redirect correctly from any page depth
async function signOut() {
  await sb.auth.signOut();
  const inPages = window.location.pathname.includes("/pages/");
  window.location.href = inPages ? "../index.html" : "index.html";
}
