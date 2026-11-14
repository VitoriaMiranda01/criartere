-- Várias fotos por produto. Migração aditiva.
-- produtos.imagens guarda todas as fotos em ordem; a primeira é a principal.
-- produtos.imagem_url continua existindo e sempre igual à foto principal
-- (compatibilidade com o que já usa esse campo).
alter table public.produtos
  add column if not exists imagens text[] not null default '{}';

-- Fotos já cadastradas viram a primeira (e única) foto da lista
update public.produtos
   set imagens = array[imagem_url]
 where cardinality(imagens) = 0
   and imagem_url is not null
   and imagem_url <> ''
   and imagem_url not like '%/placeholder.svg';

alter table public.produtos
  drop constraint if exists produtos_imagens_limite,
  add constraint produtos_imagens_limite check (cardinality(imagens) <= 10);

-- Vitrine pública: passa a devolver também a lista de fotos.
-- (A lista de colunas mudou, por isso a função é recriada.)
drop function if exists public.vitrine_produtos();
create function public.vitrine_produtos()
returns table (
  id uuid,
  nome text,
  descricao text,
  preco numeric,
  categoria text,
  imagem_url text,
  imagens text[],
  disponibilidade text,
  criado_em timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select p.id, p.nome, p.descricao, p.preco_venda, p.categoria, p.imagem_url, p.imagens,
         case when coalesce(p.estoque_aproximado, 0) > 0 then 'pronta_entrega'
              else 'sob_encomenda' end,
         p.criado_em
  from public.produtos p
  where p.ativo and p.publicado_loja;
$$;
revoke all on function public.vitrine_produtos() from public;
grant execute on function public.vitrine_produtos() to anon, authenticated;
