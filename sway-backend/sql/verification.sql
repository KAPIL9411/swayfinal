-- SWAY: student ID verification
-- Run this once in the Supabase SQL editor (service role / postgres).

-- 1. Admins ---------------------------------------------------------------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Make yourself an admin (run after you have signed up once):
-- update public.profiles p
-- set is_admin = true
-- from auth.users u
-- where u.id = p.id and u.email = 'you@college.edu';

-- 2. Verification requests ------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  college_id uuid not null references public.colleges (id) on delete cascade,
  image_path text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  note text,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists verification_requests_user_idx
  on public.verification_requests (user_id, created_at desc);

create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at);

-- Only the Worker (service role) touches this table, so no RLS policies are
-- needed. RLS stays on so the anon/public API can never read ID records.
alter table public.verification_requests enable row level security;

-- 3. Private storage bucket for the ID photos -----------------------------
insert into storage.buckets (id, name, public)
values ('id-cards', 'id-cards', false)
on conflict (id) do nothing;

-- No storage policies: uploads/reads/deletes happen through the Worker with
-- the service role key. Photos are deleted as soon as an admin decides.
