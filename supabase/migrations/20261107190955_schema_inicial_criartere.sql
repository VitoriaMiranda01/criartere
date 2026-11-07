-- Schema inicial do Criartere (estado final consolidado; já aplicado no projeto Supabase).

-- ===================== ACESSO =====================
-- Lista de e-mails autorizados a acessar os dados da loja.
create table public.membros (
  email text primary key check (email = lower(email)),
  nome text,
  papel text not null default 'Administradora',
  criado_em timestamptz not null default now()
);

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_membro()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function private.is_membro() from public, anon;
grant execute on function private.is_membro() to authenticated;

-- ===================== CADASTROS =====================
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  endereco text not null default '',
  cidade_uf text not null default '',
  observacoes text,
  criado_em date not null default current_date
);

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text not null default '',
  preco_venda numeric(12,2) not null default 0,
  custo numeric(12,2) not null default 0,
  categoria text not null default '',
  imagem_url text,
  ativo boolean not null default true,
  estoque_aproximado integer,
  criado_em timestamptz not null default now()
);

-- ===================== PEDIDOS =====================
create sequence public.pedidos_numero_seq;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique default nextval('public.pedidos_numero_seq'),
  codigo text generated always as (lpad(numero::text, 4, '0')) stored,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  valor_produtos numeric(12,2) not null default 0,
  valor_frete numeric(12,2) not null default 0,
  valor_desconto numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  status text not null default 'novo' check (status in
    ('novo','aguardando_pagamento','em_preparacao','em_producao','pronto_envio','enviado','entregue','cancelado')),
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente','parcial','pago')),
  forma_pagamento text not null default 'Pix',
  prazo_entrega date,
  data_criacao date not null default current_date,
  observacoes text,
  criado_em timestamptz not null default now()
);
alter sequence public.pedidos_numero_seq owned by public.pedidos.numero;
create index pedidos_cliente_id_idx on public.pedidos(cliente_id);
create index pedidos_data_criacao_idx on public.pedidos(data_criacao);

create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  quantidade numeric(12,3) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  ordem integer not null default 0
);
create index pedido_itens_pedido_id_idx on public.pedido_itens(pedido_id);
create index pedido_itens_produto_id_idx on public.pedido_itens(produto_id);

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  valor numeric(12,2) not null check (valor > 0),
  data date not null default current_date,
  forma_pagamento text not null,
  observacoes text,
  criado_em timestamptz not null default now()
);
create index pagamentos_pedido_id_idx on public.pagamentos(pedido_id);

create table public.pedido_historico (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  data_hora timestamptz not null default now(),
  tipo text not null check (tipo in ('criacao','status','pagamento','edicao','cancelamento')),
  descricao text not null
);
create index pedido_historico_pedido_id_idx on public.pedido_historico(pedido_id);

-- ===================== FINANCEIRO =====================
create table public.categorias_despesa (
  nome text primary key,
  criado_em timestamptz not null default clock_timestamp()
);

create table public.formas_pagamento (
  nome text primary key,
  criado_em timestamptz not null default clock_timestamp()
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'Outros',
  valor numeric(12,2) not null default 0,
  data date not null default current_date,
  vencimento date,
  forma_pagamento text not null default 'Pix',
  status text not null default 'pendente' check (status in ('pago','pendente')),
  observacoes text,
  criado_em timestamptz not null default now()
);
create index despesas_data_idx on public.despesas(data);

create table public.loja_config (
  id smallint primary key default 1 check (id = 1),
  nome text not null default 'Criartere',
  email text not null default '',
  telefone text not null default '',
  whatsapp text not null default '',
  endereco text not null default '',
  instagram text not null default '',
  incluir_aguardando_no_faturamento boolean not null default true,
  periodo_padrao_dashboard text not null default 'mes_atual'
    check (periodo_padrao_dashboard in ('hoje','ultimos_7','mes_atual','mes_anterior','personalizado'))
);

-- ===================== RLS =====================
alter table public.membros enable row level security;
create policy "membro ve o proprio cadastro" on public.membros
  for select to authenticated
  using (email = lower(coalesce((select auth.jwt()) ->> 'email', '')));

do $$
declare t text;
begin
  foreach t in array array['clientes','produtos','pedidos','pedido_itens','pagamentos',
    'pedido_historico','categorias_despesa','formas_pagamento','despesas','loja_config']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "membros acessam" on public.%I for all to authenticated
         using ((select private.is_membro())) with check ((select private.is_membro()))', t);
  end loop;
end $$;

-- ===================== DADOS PADRÃO =====================
insert into public.loja_config (id) values (1);
insert into public.categorias_despesa (nome) values
  ('Compra de mercadorias'),('Matéria-prima'),('Embalagens'),('Frete e envio'),
  ('Marketing e anúncios'),('Taxas de plataformas'),('Fornecedores'),('Equipamentos'),('Outros');
insert into public.formas_pagamento (nome) values
  ('Pix'),('Dinheiro'),('Cartão de crédito'),('Cartão de débito'),('Transferência bancária'),('Outros');
insert into public.membros (email, nome) values ('vitoriamiranda01@gmail.com', 'Vitoria Miranda');
