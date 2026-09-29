-- Private Storage bucket for Speaking Lab recordings. Objects are stored at
-- "<user_id>/<uuid>.<ext>" — the RLS policies below key off that first path
-- segment so a user can only read/write their own recordings, the same
-- ownership model as every other table in this schema.
insert into storage.buckets (id, name, public, file_size_limit)
values ('speaking-audio', 'speaking-audio', false, 20971520) -- 20MB, matching Gemini's inline audio limit
on conflict (id) do nothing;

create policy "speaking_audio_select_own"
  on storage.objects for select
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "speaking_audio_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "speaking_audio_delete_own"
  on storage.objects for delete
  using (bucket_id = 'speaking-audio' and (storage.foldername(name))[1] = auth.uid()::text);
