-- Banners da loja: slides com novidades e promoções no topo do catálogo.
-- Migração apenas ADITIVA. Cada banner tem uma imagem para computador e outra
-- (opcional) para celular, e pode levar a uma categoria ou a um produto.
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0), -- texto alternativo e identificação no painel
  imagem_computador text not null,
  imagem_celular text,
  destino_tipo text not null default 'nenhum' check (destino_tipo in ('nenhum', 'categoria', 'produto')),
  destino_valor text,
  ordem integer not null default 0,
  ativo boolean not null default true,
  valido_de date,
  valido_ate date,
  criado_em timestamptz not null default now(),
  constraint banners_destino_preenchido check (destino_tipo = 'nenhum' or length(trim(coalesce(destino_valor, ''))) > 0),
  constraint banners_periodo_valido check (valido_de is null or valido_ate is null or valido_de <= valido_ate)
);
create index banners_ordem_idx on public.banners(ordem);

alter table public.banners enable row level security;
-- Administradores gerenciam tudo
create policy "admin gerencia banners" on public.banners for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- Visitantes e clientes veem só os banners ativos e dentro do período
create policy "loja ve banners ativos" on public.banners for select to anon, authenticated
  using (
    ativo
    and (valido_de is null or valido_de <= (now() at time zone 'America/Sao_Paulo')::date)
    and (valido_ate is null or valido_ate >= (now() at time zone 'America/Sao_Paulo')::date)
  );
revoke insert, update, delete, truncate, references, trigger on public.banners from anon;
grant select on public.banners to anon;

-- Bucket público das imagens dos banners (até 5 MB). Só administradores enviam e apagam.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "banners: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (select private.is_admin()));
create policy "banners: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (select private.is_admin()))
  with check (bucket_id = 'banners' and (select private.is_admin()));
create policy "banners: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (select private.is_admin()));
create policy "banners: admin lista" on storage.objects for select to authenticated
  using (bucket_id = 'banners' and (select private.is_admin()));

-- Atualização ao vivo no painel
alter publication supabase_realtime add table public.banners;
