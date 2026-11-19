-- Run once in Supabase → SQL Editor
create table if not exists public.travel_photos (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, trip_title text not null, place text not null, caption text, image_url text not null, storage_path text not null, created_at timestamptz not null default now());
alter table public.travel_photos enable row level security;
drop policy if exists "Public can view travel photos" on public.travel_photos;
create policy "Public can view travel photos" on public.travel_photos for select using (true);
drop policy if exists "Signed-in owner can add travel photos" on public.travel_photos;
create policy "Signed-in owner can add travel photos" on public.travel_photos for insert to authenticated with check (auth.uid() = user_id);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types) values ('travel-photos','travel-photos',true,18874368,array['image/jpeg','image/png','image/webp','image/heic','image/heif']) on conflict (id) do update set public=true,file_size_limit=18874368;
drop policy if exists "Public can view travel photo files" on storage.objects;
create policy "Public can view travel photo files" on storage.objects for select using (bucket_id='travel-photos');
drop policy if exists "Users can upload to own travel folder" on storage.objects;
create policy "Users can upload to own travel folder" on storage.objects for insert to authenticated with check (bucket_id='travel-photos' and (storage.foldername(name))[1]=auth.uid()::text);
