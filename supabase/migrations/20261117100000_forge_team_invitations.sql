-- Team workspaces share one state document; invitations are single-use and tied to an email.
alter table public.forge_users
  drop constraint if exists forge_users_workspace_key_key;

alter table public.forge_users
  drop constraint if exists forge_users_role_check;

alter table public.forge_users
  add constraint forge_users_role_check
  check (role in ('admin', 'qa', 'dev', 'pm', 'pmo'));

alter table public.forge_users
  add column if not exists persona text
  check (persona is null or persona in ('qa', 'dev', 'pm', 'pmo'));

create index if not exists forge_users_workspace_key_idx
  on public.forge_users (workspace_key);

create table if not exists public.forge_team_invites (
  id uuid primary key,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  workspace_key text not null check (workspace_key like 'user:%' and length(workspace_key) <= 200),
  role text not null check (role in ('qa', 'dev', 'pm', 'pmo')),
  invited_by text not null references public.forge_users(email),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists forge_team_invites_workspace_idx
  on public.forge_team_invites (workspace_key, expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.forge_team_invites enable row level security;
revoke all on table public.forge_team_invites from anon, authenticated;
grant select, insert, update on table public.forge_team_invites to service_role;

create or replace function public.forge_create_team_invite(
  p_id uuid,
  p_token_hash text,
  p_email text,
  p_workspace_key text,
  p_role text,
  p_invited_by text
) returns setof public.forge_team_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seats integer;
begin
  if p_role not in ('qa', 'dev', 'pm', 'pmo') then
    raise exception 'invalid_role' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.forge_users
    where email = p_invited_by and workspace_key = p_workspace_key and role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workspace_key, 0));

  if exists (select 1 from public.forge_users where email = p_email and workspace_key = p_workspace_key) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.forge_team_invites
    where workspace_key = p_workspace_key and email = p_email
      and accepted_at is null and revoked_at is null and expires_at > now()
  ) then
    raise exception 'invite_exists' using errcode = '23505';
  end if;

  select count(*) into v_seats from (
    select email from public.forge_users where workspace_key = p_workspace_key
    union all
    select email from public.forge_team_invites
      where workspace_key = p_workspace_key and accepted_at is null
        and revoked_at is null and expires_at > now()
  ) seats;
  if v_seats >= 5 then
    raise exception 'team_seats_full' using errcode = '23514';
  end if;

  return query
    insert into public.forge_team_invites (id, token_hash, email, workspace_key, role, invited_by, expires_at)
    values (p_id, p_token_hash, p_email, p_workspace_key, p_role, p_invited_by, now() + interval '7 days')
    returning *;
end;
$$;

create or replace function public.forge_accept_team_invite(
  p_token_hash text,
  p_email text,
  p_persona text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.forge_team_invites%rowtype;
  v_existing public.forge_users%rowtype;
  v_state jsonb;
  v_seats integer;
  v_has_existing boolean;
begin
  select * into v_invite from public.forge_team_invites
    where token_hash = p_token_hash for update;
  if not found or v_invite.email <> p_email or v_invite.accepted_at is not null
     or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'invite_invalid_or_expired' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_invite.workspace_key, 0));

  select * into v_existing from public.forge_users where email = p_email for update;
  v_has_existing := found;
  if v_has_existing and v_existing.workspace_key = v_invite.workspace_key then
    update public.forge_team_invites set accepted_at = now() where id = v_invite.id;
    return jsonb_build_object('email', p_email, 'workspace_key', v_existing.workspace_key, 'role', v_existing.role);
  end if;
  if v_has_existing then
    select state into v_state from public.forge_workspaces where workspace_key = v_existing.workspace_key;
    if v_state is not null and jsonb_array_length(coalesce(v_state->'projects', '[]'::jsonb)) > 0 then
      raise exception 'account_has_existing_workspace' using errcode = '23514';
    end if;
  end if;

  select count(*) into v_seats from public.forge_users where workspace_key = v_invite.workspace_key;
  if v_seats >= 5 then
    raise exception 'team_seats_full' using errcode = '23514';
  end if;

  if v_has_existing then
    update public.forge_users set workspace_key = v_invite.workspace_key, role = v_invite.role,
      persona = case when p_persona in ('qa','dev','pm','pmo') then p_persona else null end
      where email = p_email;
  else
    insert into public.forge_users (email, workspace_key, role, persona)
      values (p_email, v_invite.workspace_key, v_invite.role,
        case when p_persona in ('qa','dev','pm','pmo') then p_persona else null end);
  end if;
  update public.forge_team_invites set accepted_at = now() where id = v_invite.id;
  return jsonb_build_object('email', p_email, 'workspace_key', v_invite.workspace_key, 'role', v_invite.role);
end;
$$;

revoke all on function public.forge_create_team_invite(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.forge_accept_team_invite(text, text, text) from public, anon, authenticated;
grant execute on function public.forge_create_team_invite(uuid, text, text, text, text, text) to service_role;
grant execute on function public.forge_accept_team_invite(text, text, text) to service_role;
