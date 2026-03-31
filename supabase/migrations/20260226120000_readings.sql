-- App configuration table for dynamic config values
create table public.app_configuration (
  key text primary key,
  value text not null
);

alter table public.app_configuration enable row level security;

-- Only authenticated users can read app config; no insert/update/delete for app roles
create policy "Authenticated can read app_configuration"
  on public.app_configuration
  as permissive
  for select
  to authenticated
  using (true);

grant select on table public.app_configuration to authenticated;
grant select on table public.app_configuration to anon;

insert into public.app_configuration (key, value) values ('SavedStateLimit', '500');

-- Readings table for saved canvas states
create table public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text default 'Untitled Reading',
  state bytea not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index readings_user_id_updated_at_idx on public.readings (user_id, updated_at desc);

alter table public.readings enable row level security;

create policy "Users can select own readings"
  on public.readings
  as permissive
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own readings"
  on public.readings
  as permissive
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own readings"
  on public.readings
  as permissive
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own readings"
  on public.readings
  as permissive
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on table public.readings to authenticated;

-- Trigger to enforce saved state limit on insert
create or replace function public.check_readings_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limit_val int;
  current_count int;
begin
  select (ac.value)::int into limit_val
  from public.app_configuration ac
  where ac.key = 'SavedStateLimit'
  limit 1;

  if limit_val is null then
    return new;
  end if;

  select count(*) into current_count
  from public.readings
  where user_id = new.user_id;

  if current_count >= limit_val then
    raise exception 'Saved readings limit of % reached', limit_val;
  end if;

  return new;
end;
$$;

create trigger readings_limit_trigger
  before insert on public.readings
  for each row
  execute function public.check_readings_limit();
