# Bibliotheca — Library Management System

A full-stack library management system built with **Vanilla HTML/CSS/JS** and **Supabase**. No frameworks. No build tools.

![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-c9a84c?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=flat-square)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square)
![Theme](https://img.shields.io/badge/Theme-Dark%20Library-1c1813?style=flat-square)

---

## Recent Updates (Short)

- Added auth-page background slideshow (`images/1.jpg` to `images/6.jpg`).
- Added user-only feedback page using Web3Forms:
  - `pages/feedback.html`
  - `css/feedback.css`
  - `js/feedback.js`
- Replaced book emoji logos with favicon icons on internal pages.
- Added subtle static background style for internal pages via `body.app-page`.
- Cleaned up removed decorative auth elements (floating books / shelf symbol).

---

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Frontend  | HTML5, CSS3, Vanilla JavaScript |
| Backend   | Supabase (BaaS)                 |
| Database  | PostgreSQL                      |
| Auth      | Supabase Auth (JWT)             |
| Charts    | Chart.js                        |
| Hosting   | Netlify / Vercel / GitHub Pages |

---

## Project Structure

```text
library-app/
├── index.html
├── favicon.ico
├── pages/
│   ├── dashboard.html
│   ├── admin.html
│   ├── book.html
│   ├── profile.html
│   ├── insights.html
│   └── feedback.html
├── css/
│   ├── style.css
│   ├── auth.css
│   ├── dashboard.css
│   ├── admin.css
│   ├── book.css
│   ├── profile.css
│   ├── insights.css
│   └── feedback.css
├── js/
│   ├── supabase.js
│   ├── effects.js
│   ├── auth.js
│   ├── dashboard.js
│   ├── admin.js
│   ├── book.js
│   ├── profile.js
│   ├── insights.js
│   └── feedback.js
├── images/
│   ├── 1.jpg
│   ├── 2.jpg
│   ├── 3.jpg
│   ├── 4.jpg
│   ├── 5.jpg
│   └── 6.jpg
└── supabase_setup.sql
```

---

## Database Schema

```sql
books
  id             serial primary key
  isbn13         text
  isbn10         text
  title          text
  authors        text
  categories     text
  thumbnail      text
  description    text
  published_year int
  average_rating float
  num_pages      int
  ratings_count  int
  is_available   boolean default true
  created_at     timestamptz default now()

users
  id         uuid references auth.users primary key
  name       text
  email      text
  role       text default 'user'
  phone      text
  address    text
  city       text
  pin        text
  bio        text
  is_deleted boolean default false
  created_at timestamptz default now()

loans
  id          serial primary key
  book_id     int references books
  user_id     uuid references users
  borrowed_at timestamptz default now()
  due_date    timestamptz
  returned_at timestamptz
  fine_amount int default 0
  is_returned boolean default false

reviews
  id          serial primary key
  book_id     int references books
  user_id     uuid references users
  rating      int check (rating between 1 and 5)
  review_text text
  created_at  timestamptz default now()
```

---

## Installation

```bash
git clone https://github.com/yourusername/bibliotheca.git
cd bibliotheca
```

Run locally using any of these:

```bash
# Python
python3 -m http.server 3000

# Node
npx serve .

# VS Code — Live Server extension → right click index.html → Open with Live Server
```

---

## Supabase Setup

**1. Initialize Supabase Project**
- Go to [supabase.com](https://supabase.com) and create a new project
- Copy your Project URL and Anon Key

**2. Add credentials (for local development only):**

Edit `js/supabase.js`:
```javascript
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

> **Note:** The anon key is safe to expose in frontend code because Supabase Row-Level Security (RLS) prevents unauthorized data access. When deploying to Netlify, move this key to environment variables (see Deployment section).

3. Run `supabase_setup.sql` in the Supabase SQL Editor:
- Supabase Dashboard → SQL Editor → New Query
- Copy & paste contents of `supabase_setup.sql`
- Click Run

4. Enable Email Auth:
   - Supabase Dashboard → **Authentication** → **Providers** → **Email**
   - Enable the provider
   - Turn off "Confirm Email" (optional, for easier testing)

5. Promote yourself to admin:

Run in Supabase SQL Editor:
```sql
update public.users set role = 'admin' where email = 'your@email.com';
```

Sign out and back in — you'll now have admin access.

---

## Feedback (Web3Forms)

Set your Web3Forms key in `js/feedback.js`:

```javascript
const WEB3FORMS_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY";
```

Feedback form access is guarded in frontend logic to logged-in users with `role === "user"`.

---

## Deployment

### Local Development

```bash
# Python
python3 -m http.server 3000

# Node
npx serve .

# VS Code — Live Server extension → right click index.html → Open with Live Server
```

### Deploy to Netlify

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag your project folder onto the screen
3. Wait for build to complete

**Option 2: Netlify CLI**

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Set Environment Variables on Netlify

After deploying, add your keys to Netlify so the serverless functions can access them:

1. Go to **Netlify Dashboard** → Your Site → **Site Settings** → **Build & Deploy** → **Environment**
2. Add these environment variables:
   - `SUPABASE_URL` = Your Supabase project URL
   - `SUPABASE_ANON_KEY` = Your Supabase anon key
   - `WEB3FORMS_ACCESS_KEY` = Your Web3Forms access key

3. **Trigger a redeploy** (Settings → Build & Deploy → Deploys → Trigger deploy)

### Supabase Auth Redirect URL

After your live URL is generated, add it to Supabase:

Supabase Dashboard → **Authentication** → **URL Configuration** → **Redirect URLs**

Add:
- `https://your-netlify-domain.netlify.app`
- `https://your-netlify-domain.netlify.app/pages/dashboard.html`

---

## Loan Rules

- Max **3 active loans** per user
- Loan period **14 days**
- Late fine **₹10 per day**, calculated on return
