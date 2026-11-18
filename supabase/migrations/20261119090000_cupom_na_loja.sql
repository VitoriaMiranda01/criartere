-- Cupom de desconto na finalização do pedido da loja.
-- O cliente informa o código; o banco confere o cupom e calcula o desconto
-- (a tela só mostra a prévia, o valor gravado é sempre o calculado aqui).
-- Regras iguais às do painel (src/lib/descontos.ts):
--   * cupom ativo e dentro do período (datas no horário de Brasília);
--   * subtotal dos produtos >= valor mínimo;
--   * percentual sobre o subtotal ou valor fixo, nunca maior que o subtotal.
-- O pedido da loja (orçamento) grava desconto_id, então o uso entra na contagem do cupom.

-- Confere o cupom para um subtotal e devolve o desconto em R$ (ou explica o problema)
create or replace function private.cupom_para_subtotal(p_codigo text, p_subtotal numeric)
returns table (id uuid, codigo text, desconto numeric)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9_-]', '', 'g'));
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  d public.descontos%rowtype;
begin
  if v_codigo = '' then raise exception 'Informe o código do cupom'; end if;

  select * into d from public.descontos x where x.codigo = v_codigo;
  -- Cupom desligado no painel é tratado como inexistente
  if not found or not d.ativo then
    raise exception 'Cupom não encontrado. Confira o código digitado.';
  end if;
  if d.valido_de is not null and v_hoje < d.valido_de then
    raise exception 'Este cupom ainda não está valendo.';
  end if;
  if d.valido_ate is not null and v_hoje > d.valido_ate then
    raise exception 'Este cupom expirou.';
  end if;
  if p_subtotal <= 0 or p_subtotal < d.valor_minimo then
    raise exception 'Este cupom vale para compras a partir de %.', public.formatar_brl(d.valor_minimo);
  end if;

  return query select d.id, d.codigo,
    round(least(case when d.tipo = 'percentual' then p_subtotal * d.valor / 100 else d.valor end,
                p_subtotal), 2);
end;
$$;
revoke all on function private.cupom_para_subtotal(text, numeric) from public, anon, authenticated;

-- Subtotal do carrinho de quem está logado (mesmos preços do pedido)
create or replace function private.subtotal_carrinho(p_uid uuid)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select coalesce(sum(round(private.preco_promocional(p.id, p.categoria, p.preco_venda) * ci.quantidade, 2)), 0)
  from public.carrinhos c
  join public.carrinho_itens ci on ci.carrinho_id = c.id
  join public.produtos p on p.id = ci.produto_id and p.ativo and p.publicado_loja
  where c.user_id = p_uid;
$$;
revoke all on function private.subtotal_carrinho(uuid) from public, anon, authenticated;

-- Prévia para a tela: confere o cupom contra o carrinho atual
create or replace function public.validar_cupom_loja(p_codigo text)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_subtotal numeric;
  c record;
begin
  if v_uid is null then raise exception 'Entre na sua conta para usar o cupom'; end if;
  v_subtotal := private.subtotal_carrinho(v_uid);
  if v_subtotal <= 0 then raise exception 'Seu carrinho está vazio'; end if;
  select * into c from private.cupom_para_subtotal(p_codigo, v_subtotal);
  return jsonb_build_object('codigo', c.codigo, 'desconto', c.desconto,
                            'subtotal', v_subtotal, 'total', v_subtotal - c.desconto);
end;
$$;
revoke all on function public.validar_cupom_loja(text) from public, anon;
grant execute on function public.validar_cupom_loja(text) to authenticated;

-- Pedido da loja: mesma função de antes, agora com o cupom (último parâmetro, opcional)
drop function if exists public.criar_pedido_loja(text, text, text, text, text, text, text);

create or replace function public.criar_pedido_loja(
  p_nome text,
  p_whatsapp text,
  p_forma_pagamento text default null,
  p_observacoes text default null,
  p_entrega text default null,
  p_endereco text default null,
  p_cidade_uf text default null,
  p_cupom text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_nome text := left(nullif(trim(p_nome), ''), 80);
  v_whats text := left(nullif(trim(p_whatsapp), ''), 30);
  v_pag text := left(coalesce(nullif(trim(p_forma_pagamento), ''), 'A combinar'), 40);
  v_obs text := left(nullif(trim(p_observacoes), ''), 1000);
  v_entrega text := nullif(trim(p_entrega), '');
  v_endereco text := left(nullif(trim(p_endereco), ''), 300);
  v_cidade text := left(nullif(trim(p_cidade_uf), ''), 80);
  v_entrega_texto text;
  v_cliente uuid;
  v_orc uuid := gen_random_uuid();
  v_numero text;
  v_total numeric(12,2);
  v_itens jsonb;
  v_todos_prontos boolean;
  v_cupom_id uuid;
  v_cupom text;
  v_desconto numeric(12,2) := 0;
begin
  if v_uid is null then raise exception 'Entre na sua conta para fazer o pedido'; end if;
  if v_nome is null then raise exception 'Informe seu nome'; end if;
  if v_whats is null or length(regexp_replace(v_whats, '\D', '', 'g')) < 10 then
    raise exception 'Informe um WhatsApp válido com DDD';
  end if;
  if v_entrega is not null and v_entrega not in ('retirada', 'entrega') then
    raise exception 'Escolha retirada ou entrega';
  end if;
  if v_entrega = 'entrega' and (v_endereco is null or v_cidade is null) then
    raise exception 'Informe o endereço e a cidade para a entrega';
  end if;

  v_entrega_texto := case v_entrega
    when 'retirada' then 'Retirada na loja'
    when 'entrega' then 'Entrega em ' || v_endereco || ' — ' || v_cidade || ' (frete a combinar)'
    else 'A combinar'
  end;

  if (select count(*) from public.orcamentos
       where user_id = v_uid and origem = 'loja' and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'Você já enviou vários pedidos na última hora. Fale com a loja pelo WhatsApp.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'produtoId', p.id, 'nome', p.nome, 'quantidade', ci.quantidade,
           'valorUnitario', pp.preco, 'subtotal', round(pp.preco * ci.quantidade, 2))
         order by ci.criado_em), '[]'::jsonb),
         coalesce(sum(round(pp.preco * ci.quantidade, 2)), 0),
         coalesce(bool_and(coalesce(p.estoque_aproximado, 0) > 0), false)
    into v_itens, v_total, v_todos_prontos
  from public.carrinhos c
  join public.carrinho_itens ci on ci.carrinho_id = c.id
  join public.produtos p on p.id = ci.produto_id and p.ativo and p.publicado_loja
  cross join lateral (
    select private.preco_promocional(p.id, p.categoria, p.preco_venda) as preco
  ) pp
  where c.user_id = v_uid;

  if jsonb_array_length(v_itens) = 0 then
    raise exception 'Seu carrinho está vazio';
  end if;

  -- Cupom: conferido de novo aqui (o carrinho ou o cupom podem ter mudado desde a prévia)
  if nullif(trim(p_cupom), '') is not null then
    select cp.id, cp.codigo, cp.desconto into v_cupom_id, v_cupom, v_desconto
      from private.cupom_para_subtotal(p_cupom, v_total) cp;
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;

  select id into v_cliente from public.clientes where user_id = v_uid;
  if v_cliente is null and v_email is not null then
    select id into v_cliente from public.clientes
     where user_id is null and lower(email) = v_email
     order by criado_em limit 1;
    if v_cliente is not null then
      update public.clientes set user_id = v_uid where id = v_cliente;
    end if;
  end if;
  if v_cliente is null then
    insert into public.clientes (nome, telefone, whatsapp, email, endereco, cidade_uf, observacoes, user_id)
    values (v_nome, v_whats, v_whats, coalesce(v_email, ''),
            coalesce(case when v_entrega = 'entrega' then v_endereco end, ''),
            coalesce(case when v_entrega = 'entrega' then v_cidade end, ''),
            'Cadastrado pela loja virtual', v_uid)
    returning id into v_cliente;
  else
    update public.clientes
       set whatsapp = v_whats,
           telefone = case when telefone = '' then v_whats else telefone end,
           endereco = case when v_entrega = 'entrega' then v_endereco else endereco end,
           cidade_uf = case when v_entrega = 'entrega' then v_cidade else cidade_uf end
     where id = v_cliente;
  end if;

  v_numero := public.gerar_numero_orcamento(current_date);

  insert into public.orcamentos (id, numero, data, cliente_id, cliente_nome, cliente_telefone,
    disponibilidade, formas_pagamento, tipo_pagamento, percentual_sinal,
    valor_produtos, valor_frete, valor_desconto, desconto_id, valor_total, observacoes, status, origem, user_id)
  values (v_orc, v_numero, current_date, v_cliente, v_nome, v_whats,
    case when v_todos_prontos then 'Pronta entrega' else 'Sob encomenda (prazo a combinar)' end,
    v_pag, 'integral', 50,
    v_total, 0, v_desconto, v_cupom_id, v_total - v_desconto,
    concat_ws(E'\n',
      'Pedido feito pela loja virtual.',
      case when v_entrega = 'entrega' then v_entrega_texto else 'Entrega: ' || v_entrega_texto end || '.',
      'Pagamento preferido: ' || v_pag,
      case when v_cupom is not null
           then 'Cupom ' || v_cupom || ': desconto de ' || public.formatar_brl(v_desconto) end,
      case when v_obs is not null then 'Observações do cliente: ' || v_obs end),
    'aguardando', 'loja', v_uid);

  insert into public.orcamento_itens (orcamento_id, produto_id, nome, quantidade, valor_unitario, subtotal, ordem)
  select v_orc, (it->>'produtoId')::uuid, it->>'nome', (it->>'quantidade')::numeric,
         (it->>'valorUnitario')::numeric, (it->>'subtotal')::numeric, ord::int
  from jsonb_array_elements(v_itens) with ordinality as e(it, ord);

  delete from public.carrinho_itens
   where carrinho_id in (select id from public.carrinhos where user_id = v_uid);

  return jsonb_build_object('id', v_orc, 'numero', v_numero,
                            'subtotal', v_total, 'desconto', v_desconto, 'cupom', v_cupom,
                            'total', v_total - v_desconto,
                            'formaPagamento', v_pag, 'entrega', v_entrega_texto, 'itens', v_itens);
end;
$function$;

revoke all on function public.criar_pedido_loja(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.criar_pedido_loja(text, text, text, text, text, text, text, text) to authenticated;
