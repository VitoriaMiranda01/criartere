-- Regras de negócio no banco (estado final consolidado; já aplicado no projeto Supabase).

create or replace function public.formatar_brl(v numeric)
returns text language sql immutable set search_path = ''
as $$ select 'R$ ' || replace(to_char(coalesce(v,0), 'FM999999990.00'), '.', ','); $$;

create or replace function public.nome_status(s text)
returns text language sql immutable set search_path = ''
as $$
  select case s
    when 'novo' then 'Novo pedido'
    when 'aguardando_pagamento' then 'Aguardando pagamento'
    when 'em_preparacao' then 'Em preparação'
    when 'em_producao' then 'Em produção'
    when 'pronto_envio' then 'Pronto para envio'
    when 'enviado' then 'Enviado'
    when 'entregue' then 'Entregue'
    when 'cancelado' then 'Cancelado'
    else s end;
$$;

-- Cria ou atualiza um pedido com seus itens de forma atômica
create or replace function public.salvar_pedido(p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id uuid := coalesce(nullif(p->>'id','')::uuid, gen_random_uuid());
  v_existe boolean;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;

  select exists(select 1 from public.pedidos where id = v_id) into v_existe;

  if v_existe then
    update public.pedidos set
      cliente_id = (p->>'clienteId')::uuid,
      valor_produtos = coalesce((p->>'valorProdutos')::numeric, 0),
      valor_frete = coalesce((p->>'valorFrete')::numeric, 0),
      valor_desconto = coalesce((p->>'valorDesconto')::numeric, 0),
      valor_total = coalesce((p->>'valorTotal')::numeric, 0),
      status = coalesce(p->>'status', status),
      forma_pagamento = coalesce(p->>'formaPagamento', forma_pagamento),
      prazo_entrega = nullif(p->>'prazoEntrega','')::date,
      observacoes = nullif(p->>'observacoes','')
    where id = v_id;
    delete from public.pedido_itens where pedido_id = v_id;
  else
    insert into public.pedidos (id, cliente_id, valor_produtos, valor_frete, valor_desconto,
      valor_total, status, status_pagamento, forma_pagamento, prazo_entrega, observacoes)
    values (v_id, (p->>'clienteId')::uuid,
      coalesce((p->>'valorProdutos')::numeric, 0), coalesce((p->>'valorFrete')::numeric, 0),
      coalesce((p->>'valorDesconto')::numeric, 0), coalesce((p->>'valorTotal')::numeric, 0),
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

create or replace function public.alterar_status_pedido(p_pedido_id uuid, p_novo_status text)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare v_atual text;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  select status into v_atual from public.pedidos where id = p_pedido_id for update;
  if v_atual is null or v_atual = p_novo_status then return; end if;
  update public.pedidos set status = p_novo_status where id = p_pedido_id;
  insert into public.pedido_historico (pedido_id, tipo, descricao) values (p_pedido_id, 'status',
    'Status alterado de "' || public.nome_status(v_atual) || '" para "' || public.nome_status(p_novo_status) || '"');
end;
$$;

create or replace function public.cancelar_pedido(p_pedido_id uuid, p_motivo text default null)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  update public.pedidos set status = 'cancelado' where id = p_pedido_id;
  if not found then return; end if;
  insert into public.pedido_historico (pedido_id, tipo, descricao) values (p_pedido_id, 'cancelamento',
    'Pedido cancelado' || coalesce(': ' || nullif(p_motivo,''), '') ||
    '. Valores previstos removidos do faturamento.');
end;
$$;

create or replace function public.registrar_pagamento(
  p_pedido_id uuid, p_valor numeric, p_forma text, p_data date, p_observacoes text default null)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_total numeric;
  v_pago numeric;
  v_quitado boolean;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  select valor_total into v_total from public.pedidos where id = p_pedido_id for update;
  if v_total is null then raise exception 'Pedido não encontrado'; end if;

  insert into public.pagamentos (pedido_id, valor, data, forma_pagamento, observacoes)
  values (p_pedido_id, p_valor, coalesce(p_data, current_date), p_forma, nullif(p_observacoes,''));

  select coalesce(sum(valor),0) into v_pago from public.pagamentos where pedido_id = p_pedido_id;
  v_quitado := v_pago >= v_total - 0.01;

  update public.pedidos set status_pagamento =
    case when v_quitado then 'pago' when v_pago > 0 then 'parcial' else 'pendente' end
  where id = p_pedido_id;

  insert into public.pedido_historico (pedido_id, tipo, descricao) values (p_pedido_id, 'pagamento',
    case when v_quitado
      then 'Pagamento final de ' || public.formatar_brl(p_valor) || ' registrado (' || p_forma || '). Pedido quitado com sucesso!'
      else 'Pagamento parcial de ' || public.formatar_brl(p_valor) || ' registrado (' || p_forma || '). Saldo restante: ' || public.formatar_brl(greatest(0, v_total - v_pago))
    end);
end;
$$;

create or replace function public.renomear_categoria(p_antiga text, p_nova text)
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  p_nova := trim(p_nova);
  if p_nova = '' or p_nova = p_antiga then return; end if;
  update public.categorias_despesa set nome = p_nova where nome = p_antiga;
  update public.despesas set categoria = p_nova where categoria = p_antiga;
end;
$$;

revoke execute on function public.salvar_pedido(jsonb), public.alterar_status_pedido(uuid,text),
  public.cancelar_pedido(uuid,text), public.registrar_pagamento(uuid,numeric,text,date,text),
  public.renomear_categoria(text,text) from public, anon;
grant execute on function public.salvar_pedido(jsonb), public.alterar_status_pedido(uuid,text),
  public.cancelar_pedido(uuid,text), public.registrar_pagamento(uuid,numeric,text,date,text),
  public.renomear_categoria(text,text) to authenticated;
