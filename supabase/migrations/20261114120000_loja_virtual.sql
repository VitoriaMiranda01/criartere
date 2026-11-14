-- Loja virtual: catálogo público, favoritos e carrinho dos clientes.
-- Migração apenas ADITIVA: não altera nem apaga dados ou permissões existentes.
--
-- Papéis (tabela public.perfis, já existente):
--   admin          → painel administrativo + gerenciamento completo
--   desenvolvedor  → painel com dados fictícios (sem acesso aos dados reais)
--   cliente        → catálogo, favoritos e carrinho próprios
--   visitante      → (sem login / anon) só a vitrine pública

-- ===================== PRODUTOS: PUBLICAÇÃO NA LOJA =====================
-- O cadastro de produtos continua único. Este campo só decide se o produto
-- aparece na loja virtual (além de precisar estar "ativo").
alter table public.produtos
  add column if not exists publicado_loja boolean not null default true;

-- ===================== VITRINE PÚBLICA =====================
-- O visitante NÃO lê a tabela de produtos (ela tem custo e estoque).
-- A vitrine expõe só os campos de venda, e só de produtos ativos e publicados.
create or replace function public.vitrine_produtos()
returns table (
  id uuid,
  nome text,
  descricao text,
  preco numeric,
  categoria text,
  imagem_url text,
  disponibilidade text,
  criado_em timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nome, p.descricao, p.preco_venda, p.categoria, p.imagem_url,
         case when coalesce(p.estoque_aproximado, 0) > 0 then 'pronta_entrega'
              else 'sob_encomenda' end,
         p.criado_em
  from public.produtos p
  where p.ativo and p.publicado_loja;
$$;
revoke all on function public.vitrine_produtos() from public;
grant execute on function public.vitrine_produtos() to anon, authenticated;

-- Contatos públicos da loja (para o botão do WhatsApp e o rodapé)
create or replace function public.vitrine_contato()
returns table (nome text, whatsapp text, instagram text)
language sql stable security definer
set search_path = ''
as $$
  select c.nome, c.whatsapp, c.instagram from public.loja_config c where c.id = 1;
$$;
revoke all on function public.vitrine_contato() from public;
grant execute on function public.vitrine_contato() to anon, authenticated;

-- Usado pelas políticas: o produto está à venda na loja?
create or replace function private.produto_na_vitrine(p_produto_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.produtos p
    where p.id = p_produto_id and p.ativo and p.publicado_loja
  );
$$;
revoke all on function private.produto_na_vitrine(uuid) from public, anon;
grant execute on function private.produto_na_vitrine(uuid) to authenticated;

-- ===================== FAVORITOS =====================
create table if not exists public.favoritos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, produto_id)
);
create index if not exists favoritos_produto_id_idx on public.favoritos(produto_id);

alter table public.favoritos enable row level security;
create policy "cliente ve os proprios favoritos" on public.favoritos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "cliente adiciona favorito" on public.favoritos
  for insert to authenticated
  with check (user_id = (select auth.uid()) and private.produto_na_vitrine(produto_id));
create policy "cliente remove favorito" on public.favoritos
  for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.favoritos from anon;
revoke update, truncate, references, trigger on public.favoritos from authenticated;

-- ===================== CARRINHOS =====================
create table if not exists public.carrinhos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  carrinho_id uuid not null references public.carrinhos(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  quantidade integer not null default 1 check (quantidade between 1 and 999),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (carrinho_id, produto_id)
);
create index if not exists carrinho_itens_produto_id_idx on public.carrinho_itens(produto_id);

alter table public.carrinhos enable row level security;
create policy "cliente ve o proprio carrinho" on public.carrinhos
  for select to authenticated using (user_id = (select auth.uid()));
create policy "cliente cria o proprio carrinho" on public.carrinhos
  for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.carrinhos from anon;
revoke update, delete, truncate, references, trigger on public.carrinhos from authenticated;

-- O carrinho é do usuário logado?
create or replace function private.meu_carrinho(p_carrinho_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.carrinhos c
    where c.id = p_carrinho_id and c.user_id = auth.uid()
  );
$$;
revoke all on function private.meu_carrinho(uuid) from public, anon;
grant execute on function private.meu_carrinho(uuid) to authenticated;

alter table public.carrinho_itens enable row level security;
create policy "cliente ve itens do proprio carrinho" on public.carrinho_itens
  for select to authenticated using ((select private.meu_carrinho(carrinho_id)));
create policy "cliente adiciona itens ao proprio carrinho" on public.carrinho_itens
  for insert to authenticated
  with check ((select private.meu_carrinho(carrinho_id)) and private.produto_na_vitrine(produto_id));
create policy "cliente altera itens do proprio carrinho" on public.carrinho_itens
  for update to authenticated
  using ((select private.meu_carrinho(carrinho_id)))
  with check ((select private.meu_carrinho(carrinho_id)));
create policy "cliente remove itens do proprio carrinho" on public.carrinho_itens
  for delete to authenticated using ((select private.meu_carrinho(carrinho_id)));
revoke all on public.carrinho_itens from anon;
revoke truncate, references, trigger on public.carrinho_itens from authenticated;

-- Só a quantidade pode ser alterada num item (não dá para trocar o produto nem o carrinho)
revoke update on public.carrinho_itens from authenticated;
grant update (quantidade, atualizado_em) on public.carrinho_itens to authenticated;

-- Adiciona um produto ao carrinho do usuário logado (soma à quantidade se já estiver lá).
-- Roda com as permissões de quem chama: as políticas acima continuam valendo.
create or replace function public.adicionar_ao_carrinho(p_produto_id uuid, p_quantidade integer default 1)
returns void
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_carrinho uuid;
begin
  if v_uid is null then raise exception 'Entre na sua conta para usar o carrinho'; end if;
  if coalesce(p_quantidade, 0) < 1 or p_quantidade > 999 then
    raise exception 'Quantidade inválida';
  end if;
  if not private.produto_na_vitrine(p_produto_id) then
    raise exception 'Este produto não está disponível na loja';
  end if;

  insert into public.carrinhos (user_id) values (v_uid)
  on conflict (user_id) do nothing;
  select id into v_carrinho from public.carrinhos where user_id = v_uid;

  insert into public.carrinho_itens (carrinho_id, produto_id, quantidade)
  values (v_carrinho, p_produto_id, p_quantidade)
  on conflict (carrinho_id, produto_id) do update
    set quantidade = least(999, public.carrinho_itens.quantidade + excluded.quantidade),
        atualizado_em = now();
end;
$$;
revoke all on function public.adicionar_ao_carrinho(uuid, integer) from public, anon;
grant execute on function public.adicionar_ao_carrinho(uuid, integer) to authenticated;
