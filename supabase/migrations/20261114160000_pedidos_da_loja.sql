-- Pedidos feitos na loja virtual entram no painel como ORÇAMENTOS "aguardando".
-- A loja confirma com o cliente pelo WhatsApp (entrega e frete a combinar) e
-- usa o "Transformar em pedido" que já existe. Migração aditiva.

-- ===================== ORIGEM DOS ORÇAMENTOS =====================
alter table public.orcamentos
  add column if not exists origem text not null default 'painel'
    check (origem in ('painel', 'loja')),
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists orcamentos_user_id_idx on public.orcamentos(user_id);

-- Cliente do painel ligado à conta da loja (quando o pedido vem do site)
alter table public.clientes
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

-- ===================== CRIAR PEDIDO (CLIENTE DA LOJA) =====================
-- Usa SEMPRE os preços e produtos do banco (o navegador só informa os dados de contato).
create or replace function public.criar_pedido_loja(
  p_nome text,
  p_whatsapp text,
  p_forma_pagamento text default null,
  p_observacoes text default null
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

  -- Evita pedidos em excesso (ex.: cliques repetidos ou abuso)
  if (select count(*) from public.orcamentos
       where user_id = v_uid and origem = 'loja' and criado_em > now() - interval '1 hour') >= 5 then
    raise exception 'Você já enviou vários pedidos na última hora. Fale com a loja pelo WhatsApp.';
  end if;

  -- Itens do carrinho que continuam à venda, com o preço atual do produto
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

  -- Cliente no painel: o já ligado a esta conta, senão um com o mesmo e-mail, senão um novo
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
    insert into public.clientes (nome, telefone, whatsapp, email, observacoes, user_id)
    values (v_nome, v_whats, v_whats, coalesce(v_email, ''), 'Cadastrado pela loja virtual', v_uid)
    returning id into v_cliente;
  else
    -- Mantém o WhatsApp do cliente atualizado
    update public.clientes
       set whatsapp = v_whats,
           telefone = case when telefone = '' then v_whats else telefone end
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
      'Entrega e frete: a combinar pelo WhatsApp.',
      'Pagamento preferido: ' || v_pag,
      case when v_obs is not null then 'Observações do cliente: ' || v_obs end),
    'aguardando', 'loja', v_uid);

  insert into public.orcamento_itens (orcamento_id, produto_id, nome, quantidade, valor_unitario, subtotal, ordem)
  select v_orc, (it->>'produtoId')::uuid, it->>'nome', (it->>'quantidade')::numeric,
         (it->>'valorUnitario')::numeric, (it->>'subtotal')::numeric, ord::int
  from jsonb_array_elements(v_itens) with ordinality as e(it, ord);

  -- Pedido registrado: esvazia o carrinho
  delete from public.carrinho_itens
   where carrinho_id in (select id from public.carrinhos where user_id = v_uid);

  return jsonb_build_object('id', v_orc, 'numero', v_numero, 'total', v_total,
                            'formaPagamento', v_pag, 'itens', v_itens);
end;
$$;
revoke all on function public.criar_pedido_loja(text, text, text, text) from public, anon;
grant execute on function public.criar_pedido_loja(text, text, text, text) to authenticated;

-- ===================== MEUS PEDIDOS (CLIENTE DA LOJA) =====================
create or replace function public.meus_pedidos_loja()
returns table (
  id uuid,
  numero text,
  criado_em timestamptz,
  valor_total numeric,
  situacao text,
  situacao_tipo text,
  itens jsonb
)
language sql stable security definer
set search_path = ''
as $$
  select o.id, o.numero, o.criado_em, coalesce(pe.valor_total, o.valor_total),
    case
      when pe.id is not null then coalesce(et.nome, pe.status)
      when o.status = 'aguardando' then 'Aguardando confirmação'
      when o.status = 'aprovado' then 'Confirmado'
      when o.status = 'recusado' then 'Não confirmado'
      when o.status = 'expirado' then 'Expirado'
      else o.status
    end,
    case
      when pe.status = 'cancelado' or o.status in ('recusado', 'expirado') then 'encerrado'
      when pe.status = 'entregue' then 'concluido'
      when pe.id is not null or o.status = 'aprovado' then 'andamento'
      else 'aguardando'
    end,
    coalesce((select jsonb_agg(jsonb_build_object('nome', i.nome, 'quantidade', i.quantidade,
                'subtotal', i.subtotal) order by i.ordem)
              from public.orcamento_itens i where i.orcamento_id = o.id), '[]'::jsonb)
  from public.orcamentos o
  left join public.pedidos pe on pe.id = o.pedido_id
  left join public.etapas_pedido et on et.chave = pe.status
  where o.user_id = auth.uid() and o.origem = 'loja'
  order by o.criado_em desc
  limit 50;
$$;
revoke all on function public.meus_pedidos_loja() from public, anon;
grant execute on function public.meus_pedidos_loja() to authenticated;

-- Nome e WhatsApp do último pedido (para preencher o formulário da próxima vez)
create or replace function public.meus_dados_pedido()
returns table (nome text, whatsapp text)
language sql stable security definer
set search_path = ''
as $$
  select c.nome, c.whatsapp from public.clientes c where c.user_id = auth.uid() limit 1;
$$;
revoke all on function public.meus_dados_pedido() from public, anon;
grant execute on function public.meus_dados_pedido() to authenticated;
