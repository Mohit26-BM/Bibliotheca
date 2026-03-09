# Bibliotheca — Library Management System

A full-stack library management system built with **Vanilla HTML/CSS/JS** and **Supabase**. No frameworks. No build tools.

![Frontend](https://img.shields.io/badge/Frontend-HTML%2FCSS%2FJS-c9a84c?style=flat-square)
![Backend](https://img.shields.io/badge/Backend-Supabase-3ecf8e?style=flat-square)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=flat-square)
![Theme](https://img.shields.io/badge/Theme-Dark%20Library-1c1813?style=flat-square)

---
[Visit Here](https://the-bibliotheca.netlify.app/index.html)

---

## Tech Stack

| Layer    | Technology                      |
| -------- | ------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend  | Supabase (BaaS)                 |
| Database | PostgreSQL                      |
| Auth     | Supabase Auth (JWT)             |
| Charts   | Chart.js                        |

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
    ├── 1.jpg — 6.jpg
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

## Dataset

Book data imported from Kaggle. Load via Supabase → Table Editor → Import CSV.

---

## Loan Rules

- Max **3 active loans** per user
- Loan period **14 days**
- Late fine **₹10 per day**, calculated on return
