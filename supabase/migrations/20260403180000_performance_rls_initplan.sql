-- Performance: auth_rls_initplan (Supabase linter 0003)
-- Wrap auth.uid() in SELECT so it is evaluated once (initplan) instead of per row.
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- public.profiles
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles
  as permissive
  for update
  to public
  using ((select auth.uid()) = id);

create policy "Users can view own profile"
  on public.profiles
  as permissive
  for select
  to public
  using ((select auth.uid()) = id);

-- public.readings
drop policy if exists "Users can select own readings" on public.readings;
drop policy if exists "Users can insert own readings" on public.readings;
drop policy if exists "Users can update own readings" on public.readings;
drop policy if exists "Users can delete own readings" on public.readings;

create policy "Users can select own readings"
  on public.readings
  as permissive
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own readings"
  on public.readings
  as permissive
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own readings"
  on public.readings
  as permissive
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own readings"
  on public.readings
  as permissive
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Performance: unused duplicate index on public.card
-- UNIQUE (deck_id, number) already provides a left-prefix index usable for deck_id lookups.
drop index if exists public.card_deck_id_idx;
