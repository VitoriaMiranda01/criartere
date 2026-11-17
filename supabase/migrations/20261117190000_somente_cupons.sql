-- Simplificação: a tabela "descontos" passa a guardar só cupons (sempre com código).
-- Desconto em produto fica apenas no cadastro do produto (colunas promo_* de produtos).
-- Não havia nenhum desconto cadastrado quando esta migração foi criada.

-- Funções de categoria: deixam de mexer nas promoções por categoria (que deixam de existir)
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

  delete from public.categorias_produto where nome = p_nome;
  if not found then raise exception 'Categoria não encontrada'; end if;
end;
$$;

-- Preço promocional: só o desconto informado no cadastro do produto
create or replace function private.preco_promocional(p_produto_id uuid, p_categoria text, p_preco numeric)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select least(
    p_preco,
    coalesce((
      select greatest(0, round(
        case when pr.promo_tipo = 'percentual' then p_preco * (1 - pr.promo_valor / 100)
             else p_preco - pr.promo_valor end,
      2))
      from public.produtos pr
      where pr.id = p_produto_id
        and pr.promo_valor is not null
        and (pr.promo_de is null or pr.promo_de <= (now() at time zone 'America/Sao_Paulo')::date)
        and (pr.promo_ate is null or pr.promo_ate >= (now() at time zone 'America/Sao_Paulo')::date)
    ), p_preco)
  );
$$;

-- Tabela de cupons: código obrigatório; saem as colunas de promoção por produto/categoria
alter table public.descontos
  drop constraint if exists descontos_alcance_produtos,
  drop column alcance,
  drop column produto_ids,
  drop column categorias,
  alter column codigo set not null;
