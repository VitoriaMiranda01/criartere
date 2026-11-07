-- Orçamentos: registro, PDF e conversão em pedido (já aplicado no projeto Supabase).

-- Chave Pix exibida nos orçamentos
alter table public.loja_config add column chave_pix text not null default '';
update public.loja_config set chave_pix = 'criarterepapelaria3d@gmail.com' where id = 1 and chave_pix = '';

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  data date not null default current_date,
  cliente_id uuid references public.clientes(id) on delete set null,
  cliente_nome text not null,
  cliente_telefone text not null default '',
  disponibilidade text not null default 'Pronta entrega',
  formas_pagamento text not null default 'Pix • Cartão • Dinheiro',
  tipo_pagamento text not null default 'integral' check (tipo_pagamento in ('integral','sinal')),
  percentual_sinal numeric(5,2) not null default 50 check (percentual_sinal > 0 and percentual_sinal < 100),
  valor_produtos numeric(12,2) not null default 0,
  valor_frete numeric(12,2) not null default 0,
  valor_desconto numeric(12,2) not null default 0,
  valor_total numeric(12,2) not null default 0,
  observacoes text not null default '',
  status text not null default 'aguardando' check (status in ('aguardando','aprovado','recusado','expirado')),
  pedido_id uuid references public.pedidos(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index orcamentos_cliente_id_idx on public.orcamentos(cliente_id);
create index orcamentos_pedido_id_idx on public.orcamentos(pedido_id);

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  quantidade numeric(12,3) not null default 1,
  valor_unitario numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  ordem integer not null default 0
);
create index orcamento_itens_orcamento_id_idx on public.orcamento_itens(orcamento_id);
create index orcamento_itens_produto_id_idx on public.orcamento_itens(produto_id);

alter table public.orcamentos enable row level security;
alter table public.orcamento_itens enable row level security;
create policy "membros acessam" on public.orcamentos for all to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));
create policy "membros acessam" on public.orcamento_itens for all to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

-- Número no formato DDMMAA da data (ex.: 051126); se já existir no dia: 051126-2, 051126-3...
create or replace function public.gerar_numero_orcamento(p_data date)
returns text language plpgsql security invoker set search_path = ''
as $$
declare
  v_base text := to_char(p_data, 'DDMMYY');
  v_num text := v_base;
  n int := 1;
begin
  while exists (select 1 from public.orcamentos where numero = v_num) loop
    n := n + 1;
    v_num := v_base || '-' || n;
  end loop;
  return v_num;
end;
$$;

-- Cria ou atualiza um orçamento e seus itens
create or replace function public.salvar_orcamento(p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid := coalesce(nullif(p->>'id','')::uuid, gen_random_uuid());
  v_data date := coalesce(nullif(p->>'data','')::date, current_date);
  v_cliente uuid := case when (p->>'clienteId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                         then (p->>'clienteId')::uuid end;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;

  if exists (select 1 from public.orcamentos where id = v_id) then
    update public.orcamentos set
      data = v_data,
      cliente_id = v_cliente,
      cliente_nome = coalesce(nullif(trim(p->>'clienteNome'),''), cliente_nome),
      cliente_telefone = coalesce(p->>'clienteTelefone',''),
      disponibilidade = coalesce(p->>'disponibilidade',''),
      formas_pagamento = coalesce(p->>'formasPagamento',''),
      tipo_pagamento = coalesce(p->>'tipoPagamento','integral'),
      percentual_sinal = coalesce((p->>'percentualSinal')::numeric, 50),
      valor_produtos = coalesce((p->>'valorProdutos')::numeric, 0),
      valor_frete = coalesce((p->>'valorFrete')::numeric, 0),
      valor_desconto = coalesce((p->>'valorDesconto')::numeric, 0),
      valor_total = coalesce((p->>'valorTotal')::numeric, 0),
      observacoes = coalesce(p->>'observacoes',''),
      status = coalesce(p->>'status', status)
    where id = v_id;
    delete from public.orcamento_itens where orcamento_id = v_id;
  else
    insert into public.orcamentos (id, numero, data, cliente_id, cliente_nome, cliente_telefone,
      disponibilidade, formas_pagamento, tipo_pagamento, percentual_sinal,
      valor_produtos, valor_frete, valor_desconto, valor_total, observacoes, status)
    values (v_id, public.gerar_numero_orcamento(v_data), v_data, v_cliente,
      coalesce(nullif(trim(p->>'clienteNome'),''), 'Cliente'), coalesce(p->>'clienteTelefone',''),
      coalesce(p->>'disponibilidade','Pronta entrega'), coalesce(p->>'formasPagamento',''),
      coalesce(p->>'tipoPagamento','integral'), coalesce((p->>'percentualSinal')::numeric, 50),
      coalesce((p->>'valorProdutos')::numeric, 0), coalesce((p->>'valorFrete')::numeric, 0),
      coalesce((p->>'valorDesconto')::numeric, 0), coalesce((p->>'valorTotal')::numeric, 0),
      coalesce(p->>'observacoes',''), coalesce(p->>'status','aguardando'));
  end if;

  insert into public.orcamento_itens (orcamento_id, produto_id, nome, quantidade, valor_unitario, subtotal, ordem)
  select v_id,
    case when (it->>'produtoId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (it->>'produtoId')::uuid end,
    coalesce(it->>'nome',''), coalesce((it->>'quantidade')::numeric, 1),
    coalesce((it->>'valorUnitario')::numeric, 0), coalesce((it->>'subtotal')::numeric, 0), ord::int
  from jsonb_array_elements(coalesce(p->'itens','[]'::jsonb)) with ordinality as e(it, ord);

  return v_id;
end;
$$;

-- Transforma um orçamento aprovado em pedido (cria o cliente se ainda não existir)
create or replace function public.converter_orcamento_em_pedido(p_orcamento_id uuid, p_prazo date default null)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  o public.orcamentos%rowtype;
  v_cliente uuid;
  v_pedido uuid := gen_random_uuid();
  v_forma text;
  v_itens jsonb;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  select * into o from public.orcamentos where id = p_orcamento_id for update;
  if o.id is null then raise exception 'Orçamento não encontrado'; end if;
  if o.pedido_id is not null then raise exception 'Este orçamento já foi transformado em pedido'; end if;

  v_cliente := o.cliente_id;
  if v_cliente is null then
    insert into public.clientes (nome, telefone, whatsapp)
    values (o.cliente_nome, o.cliente_telefone, o.cliente_telefone)
    returning id into v_cliente;
  end if;

  v_forma := nullif(trim(split_part(o.formas_pagamento, '•', 1)), '');

  select coalesce(jsonb_agg(jsonb_build_object(
      'produtoId', produto_id, 'nome', nome, 'quantidade', quantidade,
      'valorUnitario', valor_unitario, 'subtotal', subtotal) order by ordem), '[]'::jsonb)
    into v_itens from public.orcamento_itens where orcamento_id = o.id;

  perform public.salvar_pedido(jsonb_build_object(
    'id', v_pedido, 'clienteId', v_cliente,
    'valorProdutos', o.valor_produtos, 'valorFrete', o.valor_frete,
    'valorDesconto', o.valor_desconto, 'valorTotal', o.valor_total,
    'status', 'novo', 'formaPagamento', coalesce(v_forma, 'Pix'),
    'prazoEntrega', coalesce(p_prazo, current_date + 7),
    'observacoes', trim(both E'\n' from 'Gerado a partir do orçamento Nº ' || o.numero || E'.\n' || o.observacoes),
    'itens', v_itens));

  insert into public.pedido_historico (pedido_id, tipo, descricao)
  values (v_pedido, 'edicao', 'Pedido gerado a partir do orçamento Nº ' || o.numero);

  update public.orcamentos set status = 'aprovado', pedido_id = v_pedido, cliente_id = v_cliente
  where id = o.id;

  return v_pedido;
end;
$$;

revoke execute on function public.gerar_numero_orcamento(date), public.salvar_orcamento(jsonb),
  public.converter_orcamento_em_pedido(uuid, date) from public, anon;
grant execute on function public.gerar_numero_orcamento(date), public.salvar_orcamento(jsonb),
  public.converter_orcamento_em_pedido(uuid, date) to authenticated;
