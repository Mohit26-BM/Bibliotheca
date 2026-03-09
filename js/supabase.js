// ============================================================
// SUPABASE SETUP
// Anon key stays in frontend for Auth operations (this is safe with RLS)
// Data queries go through /.netlify/functions/supabase-proxy for extra security
// ============================================================

// We need the real credentials for auth — fetch from Netlify config
// For local development, comment out and use placeholders below
const SUPABASE_URL = "https://pczonciwfgmecbzsbtyt.supabase.co";
const SUPABASE_ANON_KEY = 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjem9uY2l3ZmdtZWNienNidHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3ODMyODUsImV4cCI6MjA4ODM1OTI4NX0.IUcoDPud1ROUkcMJ83MW3P9k9jJ4fcuuoZL_VR8DEmg";

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Call Supabase proxy function for data queries
// Keeps all data access server-side with full control
async function callSupabaseProxy(action, payload = {}) {
  const {
    data: { session },
  } = await sb.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('/.netlify/functions/supabase-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, payload })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Proxy call failed');
  }

  return response.json();
}

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
  
  try {
    const user = await callSupabaseProxy('getCurrentUser');
    if (!user || user.role !== 'admin') {
      window.location.href = "dashboard.html";
      return null;
    }
    return session;
  } catch (err) {
    console.error('Admin check failed:', err);
    window.location.href = "dashboard.html";
    return null;
  }
}

// Get current user profile — creates profile row if missing (safety net)
async function getCurrentUser() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return null;

  try {
    // Try to get user via proxy (respects RLS)
    const user = await callSupabaseProxy('getCurrentUser');
    return user;
  } catch (err) {
    console.error('Failed to fetch user profile:', err);
    return null;
  }
}

// Sign out and redirect correctly from any page depth
async function signOut() {
  await sb.auth.signOut();
  const inPages = window.location.pathname.includes("/pages/");
  window.location.href = inPages ? "../index.html" : "index.html";
}
