# Netlify Deployment Guide

This guide walks through deploying Bibliotheca to Netlify with secure environment variable configuration.

## Prerequisites

- Supabase project set up (see README)
- Web3Forms account + access key (for feedback)
- Netlify account (free tier works)

## Step 1: Prepare Your Code

All sensitive keys are now kept out of version control:

- `netlify/` directory contains serverless functions
- `.env.example` shows required environment variables
- `.gitignore` excludes `.env` files and `node_modules/`

## Step 2: Deploy to Netlify

### Option A: GitHub Integration (Recommended)

1. Push your code to GitHub (public or private repo)
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "New site from Git"
4. Connect GitHub and select your repo
5. Accept default build settings and click Deploy

### Option B: Drag & Drop

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag your entire project folder onto the page
3. Wait for deployment to complete

### Option C: Netlify CLI

```bash
npm install -g netlify-cli
cd /path/to/Bibliotheca
netlify deploy --prod
```

## Step 3: Configure Environment Variables

After your site deploys, add your secret keys:

1. In Netlify Dashboard, go to **Site Settings** → **Build & Deploy** → **Environment**
2. Add these variables:

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL (from Supabase Settings → API) |
| `SUPABASE_ANON_KEY` | Your Supabase anon key (same from API settings) |
| `WEB3FORMS_ACCESS_KEY` | Your Web3Forms access key |

3. After adding variables, go to **Deploy** tab and click **Trigger deploy**

## Step 4: Update Supabase Auth URLs

Your Netlify site needs to be registered with Supabase for authentication to work:

1. Supabase Dashboard → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add your Netlify domain(s):
   - `https://your-site-name.netlify.app`
   - `https://your-site-name.netlify.app/pages/dashboard.html`
3. Save

## How It Works

### Frontend (Public)

- `index.html`, `/pages/`, `/css/`, `/js/` — all publicly accessible
- `js/supabase.js` — contains Supabase anon key (THIS IS OK - see Security below)
- Frontend calls Netlify Functions for data operations

### Netlify Functions (Server-side)

- `.netlify/functions/supabase-proxy.js` — proxies all Supabase data queries
  - Receives JWT token from frontend
  - Uses server-side credentials to access database
  - Enforces RLS at database level

- `.netlify/functions/feedback-proxy.js` — proxies Web3Forms submissions
  - Uses server-side Web3Forms key (never exposed to browser)

### Supabase (Backend)

- Row-Level Security enforces data access rules
- Users can only see their own data
- Admins can see all data
- All policies validated server-side


## Security Notes

### Why is the Supabase anon key public?

- The **anon key** CANNOT perform authenticated data operations directly
- RLS policies enforce access control at the database level
- If someone tries to bypass RLS, the database rejects them
- Only valid through the authenticated proxy functions

### Why use Netlify Functions?

- **Web3Forms key** is truly secret (server-side only)
- Adds extra layer of control and logging
- Prevents quote abuse on Supabase/Web3Forms
- Allows request rate limiting and validation

### Best Practices

1. ✅ Keep anon key in frontend (it's designed for this)
2. ✅ Use functions to proxy high-sensitive operations
3. ✅ Always enable and test RLS policies
4. ✅ Use JWT token validation in functions
5. ❌ Never put service_role key anywhere accessible
6. ❌ Never disable JWT verification in functions

## Troubleshooting

### "Functions not working"

- Check Netlify logs: Site Settings → Functions
- Verify environment variables were saved: Build & Deploy → Environment
- Trigger a redeploy after adding variables

### "CORS errors"

- Check browser console for exact error
- Ensure Netlify domain is added to Supabase redirect URLs

### "Authentication not persisting"

- Supabase stores session in localStorage
- Clear browser cache and sign in again
- Check browser DevTools → Application → LocalStorage

### "Feedback not sending"

- Verify Web3Forms key in Netlify environment
- Check browser Network tab for proxy function response
- Ensure user is authenticated (not on login page)


## Environment Variables Reference

See `.env.example` for the complete list.

```bash
# For local development, create .env.local file (don't commit):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
WEB3FORMS_ACCESS_KEY=abc...
```

Netlify automatically reads from these sources:
1. Site Settings → Build & Deploy → Environment
2. Environment variables in `netlify.toml` (optional)
3. `.env` file (during local preview only, with `netlify dev`)


## Next Steps

- Test all features (dashboard, admin, feedback)
- Set up custom domain (Netlify Site Settings → Domain Management)
- Enable auto-deploys (GitHub integration handles this automatically)
- Monitor usage in Supabase Dashboard and Web3Forms account
