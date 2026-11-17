-- Pedidos e orçamentos guardam qual desconto/cupom foi aplicado: o painel recalcula o
-- valor quando os itens mudam e conta quantas vezes cada desconto/cupom foi usado.
-- Migração ADITIVA: as funções abaixo são as mesmas de antes, só passam a gravar desconto_id.

alter table public.pedidos
  add column desconto_id uuid references public.descontos(id) on delete set null;
alter table public.orcamentos
  add column desconto_id uuid references public.descontos(id) on delete set null;
create index pedidos_desconto_id_idx on public.pedidos(desconto_id);
create index orcamentos_desconto_id_idx on public.orcamentos(desconto_id);

-- Desconto informado no JSON, se existir (um desconto já excluído vira null)
create or replace function private.desconto_do_json(p jsonb)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select d.id from public.descontos d
  where (p->>'descontoId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and d.id = (p->>'descontoId')::uuid;
$$;
revoke all on function private.desconto_do_json(jsonb) from public, anon;
grant execute on function private.desconto_do_json(jsonb) to authenticated;

create or replace function public.salvar_pedido(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := coalesce(nullif(p->>'id','')::uuid, gen_random_uuid());
  v_existe boolean;
  v_desconto uuid := private.desconto_do_json(p);
begin
  if not private.is_admin() then raise exception 'Acesso negado'; end if;

  select exists(select 1 from public.pedidos where id = v_id) into v_existe;

  if v_existe then
    update public.pedidos set
      cliente_id = (p->>'clienteId')::uuid,
      valor_produtos = coalesce((p->>'valorProdutos')::numeric, 0),
      valor_frete = coalesce((p->>'valorFrete')::numeric, 0),
      valor_desconto = coalesce((p->>'valorDesconto')::numeric, 0),
      desconto_id = v_desconto,
      valor_total = coalesce((p->>'valorTotal')::numeric, 0),
      status = coalesce(p->>'status', status),
      forma_pagamento = coalesce(p->>'formaPagamento', forma_pagamento),
      prazo_entrega = nullif(p->>'prazoEntrega','')::date,
      observacoes = nullif(p->>'observacoes','')
    where id = v_id;
    delete from public.pedido_itens where pedido_id = v_id;
  else
    insert into public.pedidos (id, cliente_id, valor_produtos, valor_frete, valor_desconto, desconto_id,
      valor_total, status, status_pagamento, forma_pagamento, prazo_entrega, observacoes)
    values (v_id, (p->>'clienteId')::uuid,
      coalesce((p->>'valorProdutos')::numeric, 0), coalesce((p->>'valorFrete')::numeric, 0),
      coalesce((p->>'valorDesconto')::numeric, 0), v_desconto, coalesce((p->>'valorTotal')::numeric, 0),
      coalesce(p->>'status','novo'), 'pendente', coalesce(p->>'formaPagamento','Pix'),
      nullif(p->>'prazoEntrega','')::date, nullif(p->>'observacoes',''));
  end if;

  insert into public.pedido_itens (pedido_id, produto_id, nome, quantidade, valor_unitario, subtotal, ordem)
  select v_id,
    case when (it->>'produtoId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         then (it->>'produtoId')::uuid end,
    coalesce(it->>'nome',''),
    coalesce((it->>'quantidade')::numeric, 1),
    coalesce((it->>'valorUnitario')::numeric, 0),
    coalesce((it->>'subtotal')::numeric, 0),
    ord::int
  from jsonb_array_elements(coalesce(p->'itens','[]'::jsonb)) with ordinality as e(it, ord);

  insert into public.pedido_historico (pedido_id, tipo, descricao)
  select v_id,
    case when v_existe then 'edicao' else 'criacao' end,
    case when v_existe then 'Dados do pedido foram atualizados'
         else 'Pedido cadastrado no valor de ' || public.formatar_brl(valor_total) end
  from public.pedidos where id = v_id;

  -- Recalcula o status de pagamento caso o valor total tenha mudado
  if v_existe then
    update public.pedidos pe set status_pagamento = case
        when pg.total >= pe.valor_total - 0.01 and pg.total > 0 then 'pago'
        when pg.total > 0 then 'parcial' else 'pendente' end
    from (select coalesce(sum(valor),0) total from public.pagamentos where pedido_id = v_id) pg
    where pe.id = v_id;
  end if;

  return v_id;
end;
$$;

create or replace function public.salvar_orcamento(p jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := coalesce(nullif(p->>'id','')::uuid, gen_random_uuid());
  v_data date := coalesce(nullif(p->>'data','')::date, current_date);
  v_cliente uuid := case when (p->>'clienteId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                         then (p->>'clienteId')::uuid end;
  v_desconto uuid := private.desconto_do_json(p);
begin
  if not private.is_admin() then raise exception 'Acesso negado'; end if;

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
      desconto_id = v_desconto,
      valor_total = coalesce((p->>'valorTotal')::numeric, 0),
      observacoes = coalesce(p->>'observacoes',''),
      status = coalesce(p->>'status', status)
    where id = v_id;
    delete from public.orcamento_itens where orcamento_id = v_id;
  else
    insert into public.orcamentos (id, numero, data, cliente_id, cliente_nome, cliente_telefone,
      disponibilidade, formas_pagamento, tipo_pagamento, percentual_sinal,
      valor_produtos, valor_frete, valor_desconto, desconto_id, valor_total, observacoes, status)
    values (v_id, public.gerar_numero_orcamento(v_data), v_data, v_cliente,
      coalesce(nullif(trim(p->>'clienteNome'),''), 'Cliente'), coalesce(p->>'clienteTelefone',''),
      coalesce(p->>'disponibilidade','Pronta entrega'), coalesce(p->>'formasPagamento',''),
      coalesce(p->>'tipoPagamento','integral'), coalesce((p->>'percentualSinal')::numeric, 50),
      coalesce((p->>'valorProdutos')::numeric, 0), coalesce((p->>'valorFrete')::numeric, 0),
      coalesce((p->>'valorDesconto')::numeric, 0), v_desconto, coalesce((p->>'valorTotal')::numeric, 0),
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

-- Orçamento virando pedido: o pedido herda o desconto/cupom aplicado
create or replace function public.converter_orcamento_em_pedido(p_orcamento_id uuid, p_prazo date default null)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  o public.orcamentos%rowtype;
  v_cliente uuid;
  v_pedido uuid := gen_random_uuid();
  v_forma text;
  v_itens jsonb;
begin
  if not private.is_admin() then raise exception 'Acesso negado'; end if;
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
    'valorDesconto', o.valor_desconto, 'descontoId', o.desconto_id, 'valorTotal', o.valor_total,
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
