-- Pedido da loja: o cliente escolhe retirada ou entrega (com endereço).
-- O frete continua a combinar pelo WhatsApp. O endereço também atualiza o cadastro do cliente.

-- A assinatura muda (novos parâmetros), por isso a função é recriada.
-- Os parâmetros novos têm valor padrão: chamadas antigas continuam funcionando.
drop function if exists public.criar_pedido_loja(text, text, text, text);
drop function if exists public.criar_pedido_loja(text, text, text, text, text, text, text);
create function public.criar_pedido_loja(
  p_nome text,
  p_whatsapp text,
  p_forma_pagamento text default null,
  p_observacoes text default null,
  p_entrega text default null,      -- 'retirada' | 'entrega' (null = a combinar)
  p_endereco text default null,     -- rua, número, complemento, bairro
  p_cidade_uf text default null     -- ex.: Rio de Janeiro/RJ
)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
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
           'valorUnitario', p.preco_venda, 'subtotal', round(p.preco_venda * ci.quantidade, 2))
         order by ci.criado_em), '[]'::jsonb),
         coalesce(sum(round(p.preco_venda * ci.quantidade, 2)), 0),
         coalesce(bool_and(coalesce(p.estoque_aproximado, 0) > 0), false)
    into v_itens, v_total, v_todos_prontos
  from public.carrinhos c
  join public.carrinho_itens ci on ci.carrinho_id = c.id
  join public.produtos p on p.id = ci.produto_id and p.ativo and p.publicado_loja
  where c.user_id = v_uid;

  if jsonb_array_length(v_itens) = 0 then
    raise exception 'Seu carrinho está vazio';
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
    valor_produtos, valor_frete, valor_desconto, valor_total, observacoes, status, origem, user_id)
  values (v_orc, v_numero, current_date, v_cliente, v_nome, v_whats,
    case when v_todos_prontos then 'Pronta entrega' else 'Sob encomenda (prazo a combinar)' end,
    v_pag, 'integral', 50,
    v_total, 0, 0, v_total,
    concat_ws(E'\n',
      'Pedido feito pela loja virtual.',
      case when v_entrega = 'entrega' then v_entrega_texto else 'Entrega: ' || v_entrega_texto end || '.',
      'Pagamento preferido: ' || v_pag,
      case when v_obs is not null then 'Observações do cliente: ' || v_obs end),
    'aguardando', 'loja', v_uid);

  insert into public.orcamento_itens (orcamento_id, produto_id, nome, quantidade, valor_unitario, subtotal, ordem)
  select v_orc, (it->>'produtoId')::uuid, it->>'nome', (it->>'quantidade')::numeric,
         (it->>'valorUnitario')::numeric, (it->>'subtotal')::numeric, ord::int
  from jsonb_array_elements(v_itens) with ordinality as e(it, ord);

  delete from public.carrinho_itens
   where carrinho_id in (select id from public.carrinhos where user_id = v_uid);

  return jsonb_build_object('id', v_orc, 'numero', v_numero, 'total', v_total,
                            'formaPagamento', v_pag, 'entrega', v_entrega_texto, 'itens', v_itens);
end;
$$;
revoke all on function public.criar_pedido_loja(text, text, text, text, text, text, text) from public, anon;
grant execute on function public.criar_pedido_loja(text, text, text, text, text, text, text) to authenticated;

-- Dados do último pedido agora incluem o endereço (para preencher o formulário)
drop function if exists public.meus_dados_pedido();
create function public.meus_dados_pedido()
returns table (nome text, whatsapp text, endereco text, cidade_uf text)
language sql stable security definer
set search_path = ''
as $$
  select c.nome, c.whatsapp, c.endereco, c.cidade_uf
  from public.clientes c where c.user_id = auth.uid() limit 1;
$$;
revoke all on function public.meus_dados_pedido() from public, anon;
grant execute on function public.meus_dados_pedido() to authenticated;
