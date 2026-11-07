-- Foto de perfil e edição do próprio nome (já aplicado no projeto Supabase).
alter table public.perfis add column avatar_url text;

-- Bucket público de fotos de perfil (até 2 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuário só envia/troca/apaga arquivos na própria pasta: avatares/<id do usuário>/...
create policy "avatar: enviar na propria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: atualizar na propria pasta" on storage.objects for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: apagar na propria pasta" on storage.objects for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatar: listar a propria pasta" on storage.objects for select to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- O próprio usuário atualiza nome e foto (o papel continua só com admins)
create or replace function public.atualizar_meu_perfil(p_nome text, p_avatar_url text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nome text := nullif(trim(p_nome), '');
  v_prefixo text := 'https://kitarrykwoaxlrydethm.supabase.co/storage/v1/object/public/avatares/' || v_uid::text || '/';
begin
  if v_uid is null then raise exception 'É preciso estar logado'; end if;
  if v_nome is null then raise exception 'Informe o seu nome'; end if;
  if length(v_nome) > 80 then raise exception 'O nome pode ter no máximo 80 caracteres'; end if;
  if p_avatar_url is not null and p_avatar_url <> '' and left(p_avatar_url, length(v_prefixo)) <> v_prefixo then
    raise exception 'Foto de perfil inválida';
  end if;
  update public.perfis
     set nome = v_nome,
         avatar_url = nullif(p_avatar_url, '')
   where user_id = v_uid;
end;
$$;
revoke all on function public.atualizar_meu_perfil(text, text) from public, anon;
grant execute on function public.atualizar_meu_perfil(text, text) to authenticated;
