-- SWAY Initial Schema Migration
-- Creates core tables, enums, and RLS policies

create extension if not exists pgcrypto;

-- ===== Enums =====
create type user_status as enum ('active','muted','suspended','banned');
create type looking_for as enum ('friends','dating','both');
create type post_category as enum ('confession','question','opinion','event','meme','lost_found');
create type vibe_status as enum ('pending','matched','expired','withdrawn');
create type report_target as enum ('post','comment','profile','message');
create type report_status as enum ('open','reviewing','actioned','dismissed');

-- ===== Colleges =====
create table colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  email_domains text[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== Profiles =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  college_id uuid not null references colleges(id),
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  avatar_key text not null,
  bio text check (char_length(bio) <= 160),
  year_of_study smallint check (year_of_study between 1 and 7),
  branch text,
  interests text[] not null default '{}' check (cardinality(interests) <= 10),
  looking_for looking_for not null default 'friends',
  is_discoverable boolean not null default true,
  status user_status not null default 'active',
  strikes smallint not null default 0,
  is_admin boolean not null default false,
  is_18_confirmed boolean not null default false,
  guidelines_accepted_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index on profiles (college_id, is_discoverable) where deleted_at is null;
create index on profiles using gin (interests);

-- Helper function: get current user's college
create or replace function my_college() returns uuid
language sql stable security definer set search_path = public as
$$ select college_id from profiles where id = auth.uid() $$;

-- ===== Blocks =====
create table blocks (
  blocker_id uuid references profiles(id) on delete cascade,
  blocked_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);

-- ===== Posts (author hidden by column grants) =====
create table posts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references colleges(id),
  author_id uuid not null references profiles(id) on delete cascade,
  category post_category not null,
  body text not null check (char_length(body) between 1 and 500),
  image_path text,
  image_cleared boolean not null default false,
  is_hidden boolean not null default false,
  reaction_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now()
);

create index on posts (college_id, created_at desc) where is_hidden = false;

create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index on comments (post_id, created_at);

create table reactions (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  kind text not null check (kind in ('fire','heart','laugh','wow','sad')),
  primary key (post_id, user_id)
);

-- ===== Vibes & Matches =====
create table vibes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  college_id uuid not null references colleges(id),
  status vibe_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);

create index on vibes (receiver_id, status);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references profiles(id) on delete cascade,
  user_b uuid not null references profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index on messages (match_id, created_at desc);

-- ===== Reports & Moderation =====
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type report_target not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table moderation_log (
  id bigserial primary key,
  actor_id uuid,
  action text not null,
  target_type text,
  target_id uuid,
  note text,
  created_at timestamptz default now()
);

create table push_tokens (
  user_id uuid references profiles(id) on delete cascade,
  token text primary key,
  platform text,
  created_at timestamptz default now()
);
