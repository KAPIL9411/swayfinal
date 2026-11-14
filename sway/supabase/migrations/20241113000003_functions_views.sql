-- SWAY Functions, Views, and Triggers

-- ===== Comment Alias Generator =====
-- Generates stable anonymous aliases per post+author combination
create or replace function comment_alias(p_post uuid, p_author uuid) returns text
language sql immutable as $$
  with h as (
    select ('x'||substr(md5(p_post::text||p_author::text),1,8))::bit(32)::int as n
  )
  select (array['Curious','Sleepy','Brave','Sneaky','Cosmic','Chill','Witty','Mellow','Spicy','Dreamy'])[1+abs(n)%10]
      || ' ' ||
      (array['Otter','Panda','Fox','Owl','Koala','Tiger','Lynx','Gecko','Falcon','Llama'])[1+abs(n/10)%10]
  from h
$$;

-- ===== Views (hide author_id) =====
-- Comments feed with anonymous aliases
create or replace view comments_feed with (security_invoker = off) as
select
  c.id,
  c.post_id,
  c.parent_id,
  c.body,
  c.created_at,
  comment_alias(c.post_id, c.author_id) as alias,
  (c.author_id = p.author_id) as is_op,
  (c.author_id = auth.uid()) as is_mine
from comments c
join posts p on p.id = c.post_id
where not c.is_hidden
  and not p.is_hidden
  and p.college_id = my_college();

grant select on comments_feed to authenticated;

-- Posts feed (no author exposed)
create or replace view posts_feed with (security_invoker = off) as
select
  p.id,
  p.category,
  p.body,
  case when p.image_cleared then p.image_path end as image_path,
  p.reaction_count,
  p.comment_count,
  p.created_at,
  (p.author_id = auth.uid()) as is_mine
from posts p
where not p.is_hidden
  and p.college_id = my_college();

grant select on posts_feed to authenticated;

-- ===== RPC: Create Post =====
create or replace function create_post(p_category post_category, p_body text, p_image text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_recent int;
  v_status user_status;
begin
  -- Check user status
  select status into v_status from profiles where id = auth.uid();
  if v_status <> 'active' then
    raise exception 'account_restricted';
  end if;

  -- Rate limit: 5 posts per hour
  select count(*) into v_recent
  from posts
  where author_id = auth.uid()
    and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'rate_limited';
  end if;

  -- Insert post
  insert into posts (college_id, author_id, category, body, image_path)
  values (my_college(), auth.uid(), p_category, p_body, p_image)
  returning id into v_id;

  return v_id;
end
$$;

-- ===== RPC: Create Comment =====
create or replace function create_comment(p_post uuid, p_body text, p_parent uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Verify post exists and is visible
  if not exists (
    select 1 from posts
    where id = p_post
      and college_id = my_college()
      and not is_hidden
  ) then
    raise exception 'not_found';
  end if;

  -- Rate limit: 20 comments per 10 minutes
  if (select count(*) from comments where author_id = auth.uid() and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited';
  end if;

  -- Insert comment
  insert into comments (post_id, parent_id, author_id, body)
  values (p_post, p_parent, auth.uid(), p_body)
  returning id into v_id;

  -- Update post comment count
  update posts set comment_count = comment_count + 1 where id = p_post;

  return v_id;
end
$$;

-- ===== RPC: Send Vibe =====
create or replace function send_vibe(p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  v_today int;
  v_match uuid;
  a uuid;
  b uuid;
begin
  -- Prevent self-vibe
  if me = p_target then
    raise exception 'invalid';
  end if;

  -- Verify target exists and is same college
  if not exists (
    select 1 from profiles t
    where t.id = p_target
      and t.college_id = my_college()
      and t.status='active'
      and t.deleted_at is null
  ) then
    raise exception 'not_found';
  end if;

  -- Check blocks
  if exists (
    select 1 from blocks
    where (blocker_id = me and blocked_id = p_target)
       or (blocker_id = p_target and blocked_id = me)
  ) then
    raise exception 'not_found';
  end if;

  -- Daily limit: 5 vibes (free tier)
  select count(*) into v_today
  from vibes
  where sender_id = me
    and created_at > now() - interval '24 hours';

  if v_today >= 5 then
    raise exception 'daily_limit';
  end if;

  -- Insert vibe (or ignore if already sent)
  insert into vibes (sender_id, receiver_id, college_id)
  values (me, p_target, my_college())
  on conflict (sender_id, receiver_id) do nothing;

  -- Check for mutual vibe = match
  if exists (
    select 1 from vibes
    where sender_id = p_target
      and receiver_id = me
      and status = 'pending'
  ) then
    -- Create match (deterministic order)
    a := least(me, p_target);
    b := greatest(me, p_target);

    insert into matches (user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do update set is_active = true
    returning id into v_match;

    -- Mark vibes as matched
    update vibes set status = 'matched'
    where (sender_id = me and receiver_id = p_target)
       or (sender_id = p_target and receiver_id = me);

    return jsonb_build_object('matched', true, 'match_id', v_match);
  end if;

  return jsonb_build_object('matched', false);
end
$$;

-- ===== RPC: Withdraw Vibe =====
create or replace function withdraw_vibe(p_target uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update vibes
  set status='withdrawn'
  where sender_id = auth.uid()
    and receiver_id = p_target
    and status='pending'
$$;

-- ===== RPC: My Secret Vibe Count =====
create or replace function my_secret_vibe_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from vibes
  where receiver_id = auth.uid()
    and status = 'pending'
    and created_at > now() - interval '30 days'
$$;

-- ===== RPC: My Sent Vibes =====
create or replace function my_sent_vibes()
returns table (receiver_id uuid, status vibe_status, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select receiver_id, status, created_at
  from vibes
  where sender_id = auth.uid()
  order by created_at desc
$$;

-- ===== RPC: Unmatch =====
create or replace function unmatch(p_match uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update matches
  set is_active = false
  where id = p_match
    and auth.uid() in (user_a, user_b)
$$;

-- ===== Trigger: Auto-hide on reports =====
create or replace function on_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  -- Count reports for this target
  select count(*) into n
  from reports
  where target_type = new.target_type
    and target_id = new.target_id;

  -- Auto-hide if 3+ reports or critical reason
  if n >= 3 or new.reason in ('threat_or_self_harm','minor_safety') then
    if new.target_type = 'post' then
      update posts set is_hidden = true where id = new.target_id;
    elsif new.target_type = 'comment' then
      update comments set is_hidden = true where id = new.target_id;
    end if;
  end if;

  return new;
end
$$;

create trigger trg_report
  after insert on reports
  for each row
  execute function on_report_insert();
