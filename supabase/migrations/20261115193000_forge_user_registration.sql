-- Forge account profiles are created only after Supabase Auth confirms email.
-- The Cloudflare Worker service role is the only caller; Auth stores passwords.
create table if not exists public.forge_users (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  workspace_key text not null unique check (workspace_key like 'user:%' and length(workspace_key) <= 200),
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.forge_users enable row level security;
revoke all on table public.forge_users from anon, authenticated;
grant select, insert on table public.forge_users to service_role;
