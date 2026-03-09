# Bibliotheca Session Change Log

This file tracks what was added, removed, and updated in this chat session.

## Added

### Login background slideshow

- Added slideshow container in `index.html` under `.auth-left`.
- Added 6 rotating background slides using local files:

  - `images/1.jpg`
  - `images/2.jpg`
  - `images/3.jpg`
  - `images/4.jpg`
  - `images/5.jpg`
  - `images/6.jpg`

- Added slideshow animation logic in `css/auth.css`:

  - `.auth-bg`, `.auth-slide`, `@keyframes authSlideShow`
  - Staggered delays per slide and smooth zoom/fade transitions.

### New feedback feature (Web3Forms)

- Added new page: `pages/feedback.html`
- Added new stylesheet: `css/feedback.css`
- Added new script: `js/feedback.js`
- Feedback is sent via Web3Forms API (`https://api.web3forms.com/submit`).
- Uses existing auth session only for access control (no feedback data stored in Supabase).
- Guard added in `js/feedback.js`:

  - Only authenticated users with role `user` can send feedback.
  - Non-user roles are redirected.

### Shared app-page background style for internal pages

- Added `body.app-page` subtle static background in `css/style.css`.
- Added `body.app-page::after` grid texture overlay.
- Ensured content layers (`nav`, `.page-wrap`) remain above the texture.

### Logo usage improvements

- Replaced emoji logo with favicon in auth header (`index.html`).
- Replaced nav brand emoji with favicon image across internal pages.
- Replaced footer brand emoji with favicon where present.
- Added shared icon class in `css/style.css`:

  - `.nav-logo-icon`

## Removed

### Decorative login elements

- Removed floating decorative book emoji elements from `index.html`.
- Removed decorative shelf symbol (`.shelf-art`) from `index.html`.

### Unused CSS after HTML cleanup

- Removed `.book-float` styles from `css/auth.css`.
- Removed `@keyframes float` and `@keyframes pulse` from `css/auth.css`.
- Removed `.shelf-art` CSS block from `css/auth.css`.

## Updated

### Auth visual tuning

- Made login overlay gradient more transparent in `css/auth.css` so slideshow images are visible.
- Updated slide cycle timing to support 6 images evenly.

### Buttons and inputs styling

- Enhanced button hover/press effects in `css/style.css`.
- Enhanced input focus transitions/glow in `css/style.css`.

### Navigation links

- Added `Feedback` link to user-facing pages:

  - `pages/dashboard.html`
  - `pages/profile.html`
  - `pages/book.html`

- Added footer `Feedback` links in:

  - `pages/dashboard.html`
  - `pages/book.html`

### Internal page body classes

- Added `class="app-page"` to:

  - `pages/dashboard.html`
  - `pages/admin.html`
  - `pages/insights.html`
  - `pages/profile.html`
  - `pages/book.html`

## Not changed

- `supabase_setup.sql` was not modified.
- No Supabase schema/storage dependency was added for feedback submissions.
