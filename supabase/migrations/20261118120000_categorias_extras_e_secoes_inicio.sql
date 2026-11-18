-- 1) Produto em mais de uma categoria: "categoria" continua sendo a principal (aparece no
--    card) e "outras_categorias" lista onde mais o produto aparece (filtros, abas e seções).
-- 2) Página inicial da loja: até 3 seções escolhidas no painel (por categoria ou produtos).
-- Migração ADITIVA.

alter table public.produtos
  add column if not exists outras_categorias text[] not null default '{}';

alter table public.loja_config
  add column if not exists secoes_inicio jsonb not null default '[]'::jsonb,
  add constraint loja_config_secoes_inicio_lista check (
    jsonb_typeof(secoes_inicio) = 'array' and jsonb_array_length(secoes_inicio) <= 3
  );

-- Vitrine: devolve também as outras categorias do produto
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
  criado_em timestamptz
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
         p.criado_em
  from public.produtos p
  where p.ativo and p.publicado_loja;
$$;
revoke all on function public.vitrine_produtos() from public;
grant execute on function public.vitrine_produtos() to anon, authenticated;

-- Seções da página inicial (leitura pública, só esse campo da configuração)
create or replace function public.vitrine_inicio()
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select coalesce((select c.secoes_inicio from public.loja_config c where c.id = 1), '[]'::jsonb);
$$;
revoke all on function public.vitrine_inicio() from public;
grant execute on function public.vitrine_inicio() to anon, authenticated;

-- Renomear categoria: atualiza também as outras categorias dos produtos e as seções da home
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
    update public.produtos set outras_categorias = array_replace(outras_categorias, p_antiga, v_nome)
      where p_antiga = any (outras_categorias);
    update public.banners set destino_valor = v_nome
      where destino_tipo = 'categoria' and destino_valor = p_antiga;
    update public.loja_config set secoes_inicio = (
      select coalesce(jsonb_agg(
        case when s->>'categoria' = p_antiga then jsonb_set(s, '{categoria}', to_jsonb(v_nome)) else s end
        order by ord), '[]'::jsonb)
      from jsonb_array_elements(secoes_inicio) with ordinality as e(s, ord)
    ) where id = 1;
  end if;
end;
$$;

-- Excluir categoria: sai das outras categorias dos produtos; seções da home que usavam a
-- categoria passam a usar a categoria de destino (ou saem da home)
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

  -- A categoria excluída sai da lista de outras categorias (e a principal não se repete nela)
  update public.produtos
     set outras_categorias = array_remove(array_remove(outras_categorias, p_nome), categoria)
   where p_nome = any (outras_categorias);

  if v_destino is not null then
    update public.banners set destino_valor = v_destino
      where destino_tipo = 'categoria' and destino_valor = p_nome;
  else
    update public.banners set destino_tipo = 'nenhum', destino_valor = null
      where destino_tipo = 'categoria' and destino_valor = p_nome;
  end if;

  update public.loja_config set secoes_inicio = (
    select coalesce(jsonb_agg(
      case when s->>'categoria' = p_nome then jsonb_set(s, '{categoria}', to_jsonb(v_destino)) else s end
      order by ord), '[]'::jsonb)
    from jsonb_array_elements(secoes_inicio) with ordinality as e(s, ord)
    where not (s->>'tipo' = 'categoria' and s->>'categoria' = p_nome and v_destino is null)
  ) where id = 1;

  delete from public.categorias_produto where nome = p_nome;
  if not found then raise exception 'Categoria não encontrada'; end if;
end;
$$;
