-- Foto de cada categoria de produto: aparece nos cards de categoria da página inicial
-- da loja. Opcional: sem foto, a loja usa a foto do produto mais recente da categoria.

alter table public.categorias_produto
  add column imagem_url text
    check (imagem_url is null or (imagem_url ~ '^https://' and length(imagem_url) <= 500));

-- Armazenamento das fotos (leitura pública, só administradores enviam/apagam)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('categorias', 'categorias', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "categorias: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'categorias' and (select private.is_admin()));
create policy "categorias: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'categorias' and (select private.is_admin()))
  with check (bucket_id = 'categorias' and (select private.is_admin()));
create policy "categorias: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'categorias' and (select private.is_admin()));
create policy "categorias: admin lista" on storage.objects for select to authenticated
  using (bucket_id = 'categorias' and (select private.is_admin()));
