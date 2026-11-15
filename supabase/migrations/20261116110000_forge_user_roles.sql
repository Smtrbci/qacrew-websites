-- Persist the role selected during registration after email verification.
alter table public.forge_users
  drop constraint if exists forge_users_role_check;

alter table public.forge_users
  add constraint forge_users_role_check
  check (role in ('admin', 'qa', 'dev', 'pm', 'pmo'));

