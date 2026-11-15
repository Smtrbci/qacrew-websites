-- Forge workspace snapshot storage. The Cloudflare Worker is the only caller;
-- the service-role key must remain a Cloudflare secret and never reach browsers.
create table if not exists public.forge_workspaces (
  workspace_key text primary key check (length(workspace_key) between 1 and 200),
  revision bigint not null default 0 check (revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now(),
  constraint forge_workspaces_state_revision check ((state ->> 'revision')::bigint = revision)
);

alter table public.forge_workspaces enable row level security;
revoke all on table public.forge_workspaces from anon, authenticated;
grant select, insert, update, delete on table public.forge_workspaces to service_role;

create or replace function public.forge_save_workspace(
  p_workspace_key text,
  p_expected_revision bigint,
  p_state jsonb
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision bigint;
begin
  if p_workspace_key is null or length(p_workspace_key) < 1 or length(p_workspace_key) > 200
     or p_state is null or jsonb_typeof(p_state) <> 'object' then
    raise exception 'invalid workspace payload' using errcode = '22023';
  end if;
  next_revision := (p_state ->> 'revision')::bigint;
  if p_expected_revision is null then
    if next_revision < 0 then
      raise exception 'invalid initial revision' using errcode = '22023';
    end if;
    insert into public.forge_workspaces(workspace_key, revision, state)
    values (p_workspace_key, next_revision, p_state)
    on conflict (workspace_key) do nothing;
    return found;
  end if;
  if next_revision <> p_expected_revision + 1 then
    raise exception 'revision must increment by one' using errcode = '22023';
  end if;
  update public.forge_workspaces
     set revision = next_revision, state = p_state, updated_at = now()
   where workspace_key = p_workspace_key and revision = p_expected_revision;
  return found;
end;
$$;

revoke all on function public.forge_save_workspace(text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.forge_save_workspace(text, bigint, jsonb) to service_role;
