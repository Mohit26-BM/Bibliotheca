# Bibliotheca — Library Management System

A full-stack library management system built with **Vanilla HTML/CSS/JS** and **Supabase**. No frameworks. No build tools.

**Live Demo:** [the-bibliotheca.netlify.app](https://the-bibliotheca.netlify.app)

![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-c9a84c?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=flat-square)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square)
![Theme](https://img.shields.io/badge/Theme-Dark%20Library-1c1813?style=flat-square)

---

## Tech Stack

| Layer    | Technology                      |
| -------- | ------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend  | Supabase (BaaS)                 |
| Database | PostgreSQL                      |
| Auth     | Supabase Auth (JWT)             |
| Charts   | Chart.js                        |
| Hosting  | Netlify                         |

---

## Project Structure

```text
library-app/
├── index.html
├── favicon.ico
├── supabase_setup.sql
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
└── images/
    └── 1.jpg — 6.jpg
```

---

## Database Schema

```sql
books    — id, title, authors, categories, thumbnail, description,
           published_year, average_rating, num_pages, ratings_count, is_available

users    — id, name, email, role, phone, address, city, pin, bio, is_deleted

loans    — id, book_id, user_id, borrowed_at, due_date, returned_at,
           fine_amount, is_returned

reviews  — id, book_id, user_id, rating (1–5), review_text
```

---

## Setup

**1. Add credentials to `js/supabase.js`:**
```javascript
const SUPABASE_URL      = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

**2. Run `supabase_setup.sql`** in Supabase SQL Editor.

**3. Enable Email Auth:**
Supabase → Authentication → Providers → Email → Enable, turn off Confirm Email.

**4. Promote yourself to admin:**
```sql
update public.users set role = 'admin' where email = 'your@email.com';
```

**5. Import book data:**
Dataset sourced from Kaggle. Load via Supabase → Table Editor → Import CSV.

---

## Loan Rules

- Max **3 active loans** per user
- Loan period **14 days**
- Late fine **₹10 per day**, calculated on return
