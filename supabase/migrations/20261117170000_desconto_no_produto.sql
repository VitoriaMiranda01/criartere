-- Desconto informado direto no cadastro do produto (% ou R$, com período opcional).
-- Entra no mesmo cálculo de preço promocional da loja: vale o menor preço entre o
-- desconto do próprio produto e as promoções cadastradas em Descontos e Cupons.

alter table public.produtos
  add column promo_tipo text check (promo_tipo in ('percentual', 'valor')),
  add column promo_valor numeric(12,2) check (promo_valor is null or promo_valor > 0),
  add column promo_de date,
  add column promo_ate date,
  add constraint produtos_promo_preenchida check (
    (promo_tipo is null and promo_valor is null)
    or (promo_tipo is not null and promo_valor is not null)
  ),
  add constraint produtos_promo_percentual check (promo_tipo <> 'percentual' or promo_valor <= 100),
  add constraint produtos_promo_periodo check (promo_de is null or promo_ate is null or promo_de <= promo_ate);

create or replace function private.preco_promocional(p_produto_id uuid, p_categoria text, p_preco numeric)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d)
  select least(
    p_preco,
    -- Promoções cadastradas em Descontos e Cupons (por produto ou categoria)
    coalesce((
      select min(greatest(0, round(
        case when x.tipo = 'percentual' then p_preco * (1 - x.valor / 100) else p_preco - x.valor end,
      2)))
      from public.descontos x, hoje
      where x.ativo
        and x.alcance = 'produtos'
        and x.codigo is null
        and (x.valido_de is null or x.valido_de <= hoje.d)
        and (x.valido_ate is null or x.valido_ate >= hoje.d)
        and (
          p_produto_id = any (x.produto_ids)
          or lower(btrim(coalesce(p_categoria, ''))) in (select lower(btrim(c)) from unnest(x.categorias) c)
        )
    ), p_preco),
    -- Desconto informado no cadastro do próprio produto
    coalesce((
      select greatest(0, round(
        case when pr.promo_tipo = 'percentual' then p_preco * (1 - pr.promo_valor / 100)
             else p_preco - pr.promo_valor end,
      2))
      from public.produtos pr, hoje
      where pr.id = p_produto_id
        and pr.promo_valor is not null
        and (pr.promo_de is null or pr.promo_de <= hoje.d)
        and (pr.promo_ate is null or pr.promo_ate >= hoje.d)
    ), p_preco)
  );
$$;
