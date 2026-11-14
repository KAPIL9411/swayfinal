-- SWAY RLS Policies
-- Row Level Security for all tables

-- Enable RLS on all tables
alter table colleges enable row level security;
alter table profiles enable row level security;
alter table blocks enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table reactions enable row level security;
alter table vibes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;
alter table moderation_log enable row level security;
alter table push_tokens enable row level security;

-- ===== Colleges =====
create policy colleges_read on colleges
  for select to authenticated
  using (is_active);

-- ===== Profiles =====
-- Read: same college, discoverable, not blocked (or myself)
create policy profiles_read on profiles
  for select to authenticated
  using (
    id = auth.uid() or (
      college_id = my_college()
      and is_discoverable
      and deleted_at is null
      and status = 'active'
      and not exists (
        select 1 from blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
           or (b.blocker_id = profiles.id and b.blocked_id = auth.uid())
      )
    )
  );

-- Update: only own profile
create policy profiles_update_own on profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ===== Blocks =====
create policy blocks_own on blocks
  for all to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

-- ===== Posts =====
-- Read: same college, not hidden
create policy posts_read on posts
  for select to authenticated
  using (college_id = my_college() and not is_hidden);

-- ===== Comments =====
-- Read: post is visible and in same college
create policy comments_read on comments
  for select to authenticated
  using (
    not is_hidden
    and exists (
      select 1 from posts p
      where p.id = post_id
        and p.college_id = my_college()
        and not p.is_hidden
    )
  );

-- ===== Reactions =====
create policy reactions_own on reactions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===== Matches & Messages =====
-- Matches: only participants
create policy matches_read on matches
  for select to authenticated
  using (auth.uid() in (user_a, user_b) and is_active);

-- Messages: only participants
create policy messages_read on messages
  for select to authenticated
  using (
    exists (
      select 1 from matches m
      where m.id = match_id
        and m.is_active
        and auth.uid() in (m.user_a, m.user_b)
    )
  );

create policy messages_insert on messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from matches m
      where m.id = match_id
        and m.is_active
        and auth.uid() in (m.user_a, m.user_b)
    )
  );

-- ===== Reports =====
create policy reports_insert on reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- ===== Push Tokens =====
create policy push_own on push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ===== Column-level grants (anonymity protection) =====
-- Revoke all, then grant specific columns only
revoke all on posts, comments, vibes, profiles from authenticated;

-- Posts: no author_id column
grant select (id, college_id, category, body, image_path, image_cleared, reaction_count, comment_count, created_at) on posts to authenticated;

-- Comments: no author_id column
grant select (id, post_id, parent_id, body, created_at) on comments to authenticated;

-- Profiles: safe columns only
grant select (id, college_id, username, avatar_key, bio, year_of_study, branch, interests, looking_for, is_discoverable, created_at) on profiles to authenticated;
grant update (bio, year_of_study, branch, interests, looking_for, is_discoverable, avatar_key) on profiles to authenticated;

-- Vibes: NO direct access (use RPCs only)
