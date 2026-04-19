-- ============================================================
-- Superplot — Supabase schema (complete)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. User profiles (extends Supabase auth.users)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text not null,
  image text,
  role text not null default 'admin'
    check (role in ('admin', 'family_view', 'family_contributor')),
  google_access_token  text,
  google_refresh_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Properties
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  zip_code text not null default '',
  google_maps_url text not null default '',
  latitude double precision,
  longitude double precision,
  size_sq_ft integer,
  size_acres double precision,
  purchase_date date,
  ownership_status text not null default 'owned'
    check (ownership_status in ('owned','jointly_owned','leased','inherited','under_dispute')),
  is_rented boolean not null default false,
  monthly_rent numeric,
  rentee_contact text,
  purchase_price numeric,
  current_price numeric,
  g_drive_folder_id text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  type text not null,
  file_name text not null,
  g_drive_file_id text not null default '',
  view_url text not null default '',
  uploaded_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Account members — RBAC for multi-account access
create table if not exists public.account_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('family_contributor', 'family_view', 'non_family_view')),
  created_at timestamptz not null default now(),
  unique(owner_id, email)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.user_profiles    enable row level security;
alter table public.properties       enable row level security;
alter table public.documents        enable row level security;
alter table public.account_members  enable row level security;

-- user_profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- properties: owner has full access
create policy "Owner can select properties"
  on public.properties for select
  using (auth.uid() = owner_id);

create policy "Owner can insert properties"
  on public.properties for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update properties"
  on public.properties for update
  using (auth.uid() = owner_id);

create policy "Owner can delete properties"
  on public.properties for delete
  using (auth.uid() = owner_id);

-- documents: access through property ownership
create policy "Owner can select documents"
  on public.documents for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can insert documents"
  on public.documents for insert
  with check (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = auth.uid()
    )
  );

create policy "Owner can delete documents"
  on public.documents for delete
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.owner_id = auth.uid()
    )
  );

-- account_members: owner can manage their own members
create policy "Owner can select members"
  on public.account_members for select
  using (auth.uid() = owner_id);

create policy "Owner can insert members"
  on public.account_members for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update members"
  on public.account_members for update
  using (auth.uid() = owner_id);

create policy "Owner can delete members"
  on public.account_members for delete
  using (auth.uid() = owner_id);

-- Members can see their own membership
create policy "Member can see own membership"
  on public.account_members for select
  using (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists idx_properties_owner on public.properties(owner_id);
create index if not exists idx_documents_property on public.documents(property_id);
create index if not exists idx_account_members_owner on public.account_members(owner_id);
create index if not exists idx_account_members_email on public.account_members(email);
create index if not exists idx_account_members_user on public.account_members(user_id);

-- ============================================================
-- Auto-create user profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, name, email, image)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: fires after a new auth.users row is inserted
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Auto-update updated_at columns
-- ============================================================

create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_properties_updated_at
  before update on public.properties
  for each row execute function public.update_updated_at();

create trigger trg_documents_updated_at
  before update on public.documents
  for each row execute function public.update_updated_at();

create trigger trg_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute function public.update_updated_at();

-- 5. Subscriptions (Razorpay)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'monthly', 'annual')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  razorpay_subscription_id text,
  razorpay_payment_id text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);
create index if not exists idx_subscriptions_razorpay on public.subscriptions(razorpay_subscription_id);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (user_id = auth.uid());

create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();
