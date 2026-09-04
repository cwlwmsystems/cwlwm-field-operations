begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active'
    check (status in ('active','suspended','archived')),
  timezone text not null default 'America/New_York',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer'
    check (role in (
      'organization_owner','organization_admin','operations_manager',
      'team_manager','representative','analyst','viewer'
    )),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  team_type text not null default 'internal'
    check (team_type in ('internal','vendor','partner','contractor','other')),
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,slug)
);

create table public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_role text not null default 'member'
    check (team_role in ('manager','member','viewer')),
  created_at timestamptz not null default now(),
  unique (team_id,user_id)
);

create index organization_memberships_user_idx on public.organization_memberships(user_id, organization_id);
create index team_memberships_user_idx on public.team_memberships(user_id, organization_id, team_id);

commit;
