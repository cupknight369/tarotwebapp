-- Public bucket for tarot card WebP assets (served via getPublicUrl in the app)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'card-images',
  'card-images',
  true,
  52428800,
  array['image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can read objects in this public bucket (anon + authenticated)
drop policy if exists "card_images_select_anon_authenticated" on storage.objects;

create policy "card_images_select_anon_authenticated"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'card-images');
