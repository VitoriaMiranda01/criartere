-- Categorias de produto cadastráveis pelo painel. Migração apenas ADITIVA.
-- Cada categoria pode pertencer a uma aba da loja: Catálogo 3D ('3d') ou
-- Catálogo Papelaria ('papelaria'). Sem aba, os produtos aparecem só no início da loja.
create table public.categorias_produto (
  nome text primary key check (length(trim(nome)) between 1 and 60),
  linha text check (linha in ('3d', 'papelaria')),
  criado_em timestamptz not null default now()
);

-- Categorias que já existiam no sistema (mesma divisão das abas da loja)
insert into public.categorias_produto (nome, linha, criado_em) values
  ('Impressão 3D', '3d', now() - interval '7 seconds'),
  ('Miniaturas e colecionáveis', '3d', now() - interval '6 seconds'),
  ('Peças técnicas e protótipos', '3d', now() - interval '5 seconds'),
  ('Cartões e papelaria', 'papelaria', now() - interval '4 seconds'),
  ('Banners, adesivos e placas', 'papelaria', now() - interval '3 seconds'),
  ('Brindes personalizados', null, now() - interval '2 seconds'),
  ('Outros', null, now() - interval '1 second')
on conflict (nome) do nothing;

-- Qualquer outra categoria já usada em produtos também entra na lista
insert into public.categorias_produto (nome)
select distinct trim(categoria) from public.produtos
where trim(coalesce(categoria, '')) <> ''
on conflict (nome) do nothing;

alter table public.categorias_produto enable row level security;
-- A loja (visitantes e clientes) lê as categorias para montar as abas
create policy "todos leem categorias de produto" on public.categorias_produto
  for select to anon, authenticated using (true);
create policy "admin gerencia categorias de produto" on public.categorias_produto
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke insert, update, delete, truncate, references, trigger on public.categorias_produto from anon;
grant select on public.categorias_produto to anon;

alter publication supabase_realtime add table public.categorias_produto;
