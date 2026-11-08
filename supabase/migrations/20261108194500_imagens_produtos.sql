-- Bucket público de imagens de produtos (até 5 MB, só imagens). Só administradores enviam/apagam.
-- (Já aplicado no projeto Supabase.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "produtos: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and (select private.is_admin()));
create policy "produtos: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and (select private.is_admin()))
  with check (bucket_id = 'produtos' and (select private.is_admin()));
create policy "produtos: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and (select private.is_admin()));
create policy "produtos: admin lista" on storage.objects for select to authenticated
  using (bucket_id = 'produtos' and (select private.is_admin()));
