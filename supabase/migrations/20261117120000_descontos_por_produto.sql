-- Descontos por produto: além do desconto no pedido inteiro (escolhido no pedido/orçamento),
-- um desconto pode valer para produtos e/ou categorias. Esses aparecem na loja com a
-- etiqueta de desconto e o preço antigo riscado, e já entram com o preço promocional
-- no carrinho e no pedido feito pelo site.

alter table public.descontos
  add column alcance text not null default 'pedido' check (alcance in ('pedido', 'produtos')),
  add column produto_ids uuid[] not null default '{}',
  add column categorias text[] not null default '{}',
  -- Cupom é sempre no pedido; desconto por produto precisa ter ao menos um produto ou categoria
  add constraint descontos_alcance_produtos check (
    alcance = 'pedido'
    or (codigo is null and (cardinality(produto_ids) > 0 or cardinality(categorias) > 0))
  );

-- Preço com o melhor desconto por produto válido hoje (ou o preço normal, se não houver).
-- Fica em "private": a loja usa o resultado, mas não lê a tabela de descontos.
create or replace function private.preco_promocional(p_produto_id uuid, p_categoria text, p_preco numeric)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select least(
    p_preco,
    coalesce(min(greatest(0, round(
      case when d.tipo = 'percentual' then p_preco * (1 - d.valor / 100) else p_preco - d.valor end,
    2))), p_preco)
  )
  from public.descontos d
  where d.ativo
    and d.alcance = 'produtos'
    and d.codigo is null
    and (d.valido_de is null or d.valido_de <= (now() at time zone 'America/Sao_Paulo')::date)
    and (d.valido_ate is null or d.valido_ate >= (now() at time zone 'America/Sao_Paulo')::date)
    and (
      p_produto_id = any (d.produto_ids)
      or lower(btrim(coalesce(p_categoria, ''))) in (select lower(btrim(c)) from unnest(d.categorias) c)
    );
$$;
revoke all on function private.preco_promocional(uuid, text, numeric) from public, anon;
grant execute on function private.preco_promocional(uuid, text, numeric) to authenticated;

-- Vitrine: "preco" passa a ser o preço a pagar (com desconto) e "preco_original" o preço cheio.
-- (A lista de colunas muda, por isso a função é recriada.)
drop function if exists public.vitrine_produtos();
create function public.vitrine_produtos()
returns table (
  id uuid,
  nome text,
  descricao text,
  preco numeric,
  preco_original numeric,
  categoria text,
  imagem_url text,
  imagens text[],
  disponibilidade text,
  criado_em timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nome, p.descricao,
         private.preco_promocional(p.id, p.categoria, p.preco_venda),
         p.preco_venda,
         p.categoria, p.imagem_url, p.imagens,
         case when coalesce(p.estoque_aproximado, 0) > 0 then 'pronta_entrega'
              else 'sob_encomenda' end,
         p.criado_em
  from public.produtos p
  where p.ativo and p.publicado_loja;
$$;
revoke all on function public.vitrine_produtos() from public;
grant execute on function public.vitrine_produtos() to anon, authenticated;

-- Pedido feito pelo site: itens com o mesmo preço promocional que o cliente viu na loja.
-- (Mesma função de antes; só o cálculo do preço dos itens mudou.)
create or replace function public.criar_pedido_loja(
  p_nome text,
  p_whatsapp text,
  p_forma_pagamento text default null,
  p_observacoes text default null,
  p_entrega text default null,
  p_endereco text default null,
  p_cidade_uf text default null
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

-- Renomear/excluir categoria também atualiza os descontos que usam a categoria
create or replace function public.salvar_categoria_produto(p_antiga text, p_nome text, p_linha text)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_linha text := nullif(btrim(coalesce(p_linha, '')), '');
begin
  if not private.is_admin() then raise exception 'Acesso negado'; end if;
  if v_nome = '' then raise exception 'Informe o nome da categoria'; end if;
  if length(v_nome) > 60 then raise exception 'Use até 60 caracteres no nome da categoria'; end if;
  if v_linha is not null and v_linha not in ('3d', 'papelaria') then
    raise exception 'Aba da loja inválida';
  end if;
  if exists (
    select 1 from public.categorias_produto
    where lower(nome) = lower(v_nome) and nome is distinct from nullif(p_antiga, '')
  ) then
    raise exception 'Já existe uma categoria com esse nome';
  end if;

  if nullif(p_antiga, '') is null then
    insert into public.categorias_produto (nome, linha) values (v_nome, v_linha);
    return;
  end if;

  update public.categorias_produto set nome = v_nome, linha = v_linha where nome = p_antiga;
  if not found then raise exception 'Categoria não encontrada'; end if;

  if v_nome <> p_antiga then
    update public.produtos set categoria = v_nome where categoria = p_antiga;
    update public.banners set destino_valor = v_nome
      where destino_tipo = 'categoria' and destino_valor = p_antiga;
    update public.descontos set categorias = array_replace(categorias, p_antiga, v_nome)
      where p_antiga = any (categorias);
  end if;
end;
$$;

create or replace function public.excluir_categoria_produto(p_nome text, p_mover_para text default null)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_destino text := nullif(btrim(coalesce(p_mover_para, '')), '');
begin
  if not private.is_admin() then raise exception 'Acesso negado'; end if;
  if v_destino = p_nome then raise exception 'Escolha outra categoria para os produtos'; end if;
  if v_destino is not null
     and not exists (select 1 from public.categorias_produto where nome = v_destino) then
    raise exception 'Categoria de destino não encontrada';
  end if;

  if exists (select 1 from public.produtos where categoria = p_nome) then
    if v_destino is null then
      raise exception 'Esta categoria tem produtos: escolha para qual categoria movê-los';
    end if;
    update public.produtos set categoria = v_destino where categoria = p_nome;
  end if;

  if v_destino is not null then
    update public.banners set destino_valor = v_destino
      where destino_tipo = 'categoria' and destino_valor = p_nome;
  else
    update public.banners set destino_tipo = 'nenhum', destino_valor = null
      where destino_tipo = 'categoria' and destino_valor = p_nome;
  end if;

  -- Descontos por categoria: a categoria sai da lista (ou vira a de destino). Se o desconto
  -- ficar sem produto nem categoria, é desativado e volta a ser um desconto de pedido.
  update public.descontos d
     set categorias = n.cats,
         alcance = case when cardinality(n.cats) = 0 and cardinality(d.produto_ids) = 0
                        then 'pedido' else d.alcance end,
         ativo = case when cardinality(n.cats) = 0 and cardinality(d.produto_ids) = 0
                      then false else d.ativo end
    from (
      select x.id,
             case when v_destino is null or v_destino = any (x.categorias)
                  then array_remove(x.categorias, p_nome)
                  else array_replace(x.categorias, p_nome, v_destino) end as cats
        from public.descontos x
       where p_nome = any (x.categorias)
    ) n
   where n.id = d.id;

  delete from public.categorias_produto where nome = p_nome;
  if not found then raise exception 'Categoria não encontrada'; end if;
end;
$$;
