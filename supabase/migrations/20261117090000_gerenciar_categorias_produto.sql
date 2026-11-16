-- Gerenciar categorias de produto pelo painel (tela Loja virtual → Categorias).
-- Renomear atualiza os produtos e os banners que usam a categoria; excluir pode
-- mover os produtos para outra categoria. Tudo numa transação só.

-- Cria (p_antiga vazia) ou edita uma categoria: nome e aba da loja
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

-- Exclui uma categoria. Se houver produtos nela, é preciso informar para onde movê-los.
-- Banners que abriam essa categoria passam a abrir a nova (ou ficam sem link).
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

revoke execute on function public.salvar_categoria_produto(text, text, text),
  public.excluir_categoria_produto(text, text) from public, anon;
grant execute on function public.salvar_categoria_produto(text, text, text),
  public.excluir_categoria_produto(text, text) to authenticated;
