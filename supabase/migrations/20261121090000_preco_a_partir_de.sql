-- Preço "a partir de": para produtos cujo valor varia (tamanho, personalização...).
-- O preço cadastrado vira o valor mínimo e a loja mostra "a partir de R$ ...".
alter table public.produtos
  add column preco_a_partir_de boolean not null default false;

-- A vitrine pública passa a devolver também essa marcação
drop function if exists public.vitrine_produtos();
create function public.vitrine_produtos()
returns table (
  id uuid,
  nome text,
  descricao text,
  preco numeric,
  preco_original numeric,
  categoria text,
  outras_categorias text[],
  imagem_url text,
  imagens text[],
  disponibilidade text,
  criado_em timestamptz,
  preco_a_partir_de boolean
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nome, p.descricao,
         private.preco_promocional(p.id, p.categoria, p.preco_venda),
         p.preco_venda,
         p.categoria, p.outras_categorias, p.imagem_url, p.imagens,
         case when coalesce(p.estoque_aproximado, 0) > 0 then 'pronta_entrega'
              else 'sob_encomenda' end,
         p.criado_em,
         p.preco_a_partir_de
  from public.produtos p
  where p.ativo and p.publicado_loja;
$$;
revoke all on function public.vitrine_produtos() from public;
grant execute on function public.vitrine_produtos() to anon, authenticated;
