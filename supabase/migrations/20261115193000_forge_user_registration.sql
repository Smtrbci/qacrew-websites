-- Self-service Forge accounts. Only the Cloudflare Worker service role can read
-- password hashes or write accounts; browsers never access this table directly.
create table if not exists public.forge_users (
  email text primary key check (email = lower(btrim(email)) and length(email) between 3 and 254),
  password_salt text not null check (length(password_salt) between 16 and 128),
  password_hash text not null check (password_hash ~ '^[a-f0-9]{64}$'),
  workspace_key text not null unique check (workspace_key like 'user:%' and length(workspace_key) <= 200),
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.forge_users enable row level security;
revoke all on table public.forge_users from anon, authenticated;
grant select, insert on table public.forge_users to service_role;
