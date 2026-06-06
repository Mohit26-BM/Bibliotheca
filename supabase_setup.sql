-- ============================================================
--  Bibliotheca — Supabase Setup SQL
--  Complete reference script — reflects all migrations applied.
--  To set up from scratch: run sections 1–6 in order.
-- ============================================================


-- ============================================================
-- 1. AUTO-INSERT USER PROFILE ON SIGN UP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table public.books    enable row level security;
alter table public.users    enable row level security;
alter table public.loans    enable row level security;
alter table public.reviews  enable row level security;

-- ── BOOKS ──
create policy "Books are viewable by all users"
  on public.books for select
  using (auth.role() = 'authenticated');

create policy "Admins can insert books"
  on public.books for insert
  with check (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

create policy "Admins can update books"
  on public.books for update
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

create policy "Admins can delete books"
  on public.books for delete
  using (
    (select role from public.users where id = auth.uid()) = 'admin'
  );

-- ── USERS ──
-- SELECT: open to all authenticated — access control handled in JS
-- UPDATE/INSERT: use scalar subquery to avoid circular reference
create policy "users_select"
  on public.users for select
  using (true);

create policy "users_insert"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update"
  on public.users for update
  using (
    auth.uid() = id
    or (select role from public.users where id = auth.uid()) = 'admin'
  );

-- ── LOANS ──
create policy "Users can view own loans"
  on public.loans for select
  using (
    user_id = auth.uid()
    or (select role from public.users where id = auth.uid()) = 'admin'
  );

create policy "Users can create loans"
  on public.loans for insert
  with check (user_id = auth.uid());

create policy "Users can update own loans"
  on public.loans for update
  using (
    user_id = auth.uid()
    or (select role from public.users where id = auth.uid()) = 'admin'
  );

-- ── REVIEWS ──
create policy "Reviews are viewable by authenticated users"
  on public.reviews for select
  using (auth.role() = 'authenticated');

create policy "Users can insert reviews"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "Users can update own reviews"
  on public.reviews for update
  using (user_id = auth.uid());

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (
    user_id = auth.uid()
    or (select role from public.users where id = auth.uid()) = 'admin'
  );


-- ============================================================
-- 3. HELPER COMMANDS (run manually as needed)
-- ============================================================

-- Promote a user to admin:
-- update public.users set role = 'admin' where email = 'your@email.com';

-- Confirm a user email manually (only needed if email confirmation is ON):
-- update auth.users set email_confirmed_at = now() where email = 'your@email.com';

-- Backfill missing profile rows (safe to re-run):
-- insert into public.users (id, name, email, role)
-- select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)), email, 'user'
-- from auth.users on conflict (id) do nothing;


-- ============================================================
-- 4. INDEXES
-- ============================================================

create index if not exists idx_books_title        on public.books (title);
create index if not exists idx_books_available    on public.books (is_available);
create index if not exists idx_loans_user_id      on public.loans (user_id);
create index if not exists idx_loans_book_id      on public.loans (book_id);
create index if not exists idx_loans_is_returned  on public.loans (is_returned);
create index if not exists idx_reviews_book_id    on public.reviews (book_id);
create index if not exists idx_reviews_user_id    on public.reviews (user_id);
create index if not exists idx_users_is_deleted   on public.users (is_deleted);


-- ============================================================
-- 5. USER PROFILE FIELDS + SOFT DELETE
-- ============================================================

alter table public.users
  add column if not exists phone      text,
  add column if not exists address    text,
  add column if not exists city       text,
  add column if not exists pin        text,
  add column if not exists bio        text,
  add column if not exists is_deleted boolean default false;


-- ============================================================
-- 6. REVIEWS POLICY FIX
--    Supersedes review policies in Section 2.
--    Adds admin delete permission.
-- ============================================================

drop policy if exists "Reviews are viewable by authenticated users" on public.reviews;
drop policy if exists "Users can insert reviews"                    on public.reviews;
drop policy if exists "Users can update own reviews"               on public.reviews;
drop policy if exists "Users can delete own reviews"               on public.reviews;
drop policy if exists "Admins can delete any review"               on public.reviews;

create policy "Reviews are viewable by authenticated users"
  on public.reviews for select
  using (auth.role() = 'authenticated');

create policy "Users can insert reviews"
  on public.reviews for insert
  with check (user_id = auth.uid());

create policy "Users can update own reviews"
  on public.reviews for update
  using (user_id = auth.uid());

create policy "Users can delete own reviews"
  on public.reviews for delete
  using (
    user_id = auth.uid()
    or (select role from public.users where id = auth.uid()) = 'admin'
  );
