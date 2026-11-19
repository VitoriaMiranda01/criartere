-- Avaliações de produtos feitas por clientes reais, com moderação no painel.
-- Regras (valem no banco, não só na tela):
--   * só avalia quem está logada e tem um pedido ENTREGUE com aquele produto
--     (pedidos.status = 'entregue', ligado à conta por clientes.user_id);
--   * uma avaliação por produto por cliente (sem edição depois de enviada);
--   * toda avaliação nasce pendente; dona, status e nome exibido são definidos pelo gatilho;
--   * nome exibido abreviado: "Maria Souza Lima" vira "Maria L." (sem nome: "Cliente");
--   * visitantes veem só as publicadas; a autora vê as suas; a administradora vê todas.

create table public.avaliacoes_produto (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  autor_nome text not null default '',
  nota smallint not null check (nota between 1 and 5),
  comentario text not null default '' check (char_length(comentario) <= 1500),
  status text not null default 'pendente' check (status in ('pendente', 'publicada', 'recusada')),
  destaque boolean not null default false, -- depoimento em destaque na página inicial
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (produto_id, user_id)
);
create index avaliacoes_produto_produto_idx on public.avaliacoes_produto (produto_id, status);
create index avaliacoes_produto_status_idx on public.avaliacoes_produto (status, criado_em desc);
create index avaliacoes_produto_user_idx on public.avaliacoes_produto (user_id);
alter table public.avaliacoes_produto enable row level security;

-- A cliente logada recebeu (pedido entregue) este produto?
create or replace function private.recebeu_produto(p_produto uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pedidos pe
    join public.clientes c on c.id = pe.cliente_id
    join public.pedido_itens pi on pi.pedido_id = pe.id
    where c.user_id = (select auth.uid())
      and pe.status = 'entregue'
      and pi.produto_id = p_produto
  );
$$;
revoke all on function private.recebeu_produto(uuid) from public, anon;
grant execute on function private.recebeu_produto(uuid) to authenticated;

-- Para a tela do produto saber se mostra o formulário
create or replace function public.recebi_produto(p_produto uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select private.recebeu_produto(p_produto);
$$;
revoke all on function public.recebi_produto(uuid) from public, anon;
grant execute on function public.recebi_produto(uuid) to authenticated;

-- Na inserção: dona = quem está logada, sempre pendente, sem destaque e nome "Maria L."
create or replace function private.avaliacoes_antes_de_inserir()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_nome text;
  v_partes text[];
begin
  new.user_id := (select auth.uid());
  new.status := 'pendente';
  new.destaque := false;
  new.comentario := left(btrim(coalesce(new.comentario, '')), 1500);
  new.criado_em := now();
  new.atualizado_em := now();

  select coalesce(nullif(btrim(p.nome), ''), nullif(btrim(c.nome), ''))
    into v_nome
    from (select 1) x
    left join public.perfis p on p.user_id = new.user_id
    left join public.clientes c on c.user_id = new.user_id;
  v_partes := regexp_split_to_array(coalesce(v_nome, 'Cliente'), '\s+');
  new.autor_nome := v_partes[1]
    || case when array_length(v_partes, 1) > 1
         then ' ' || upper(left(v_partes[array_length(v_partes, 1)], 1)) || '.'
         else '' end;
  return new;
end;
$$;
create trigger avaliacoes_antes_de_inserir before insert on public.avaliacoes_produto
  for each row execute function private.avaliacoes_antes_de_inserir();

-- Na moderação: só o status e o destaque mudam; destaque só vale para publicadas
create or replace function private.avaliacoes_antes_de_alterar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.produto_id := old.produto_id;
  new.user_id := old.user_id;
  new.autor_nome := old.autor_nome;
  new.nota := old.nota;
  new.comentario := old.comentario;
  new.criado_em := old.criado_em;
  if new.status <> 'publicada' then new.destaque := false; end if;
  new.atualizado_em := now();
  return new;
end;
$$;
create trigger avaliacoes_antes_de_alterar before update on public.avaliacoes_produto
  for each row execute function private.avaliacoes_antes_de_alterar();

create policy "avaliacoes: visitantes veem as publicadas"
  on public.avaliacoes_produto for select to anon
  using (status = 'publicada');
create policy "avaliacoes: publicadas, as da autora e todas para a admin"
  on public.avaliacoes_produto for select to authenticated
  using (status = 'publicada' or user_id = (select auth.uid()) or (select private.is_admin()));
create policy "avaliacoes: só quem recebeu o produto avalia"
  on public.avaliacoes_produto for insert to authenticated
  with check ((select private.recebeu_produto(produto_id)));
create policy "avaliacoes: admin modera"
  on public.avaliacoes_produto for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "avaliacoes: admin apaga"
  on public.avaliacoes_produto for delete to authenticated
  using ((select private.is_admin()));

revoke all on public.avaliacoes_produto from anon, authenticated;
grant select on public.avaliacoes_produto to anon;
grant select, insert, update, delete on public.avaliacoes_produto to authenticated;
revoke all on function private.avaliacoes_antes_de_inserir() from public, anon, authenticated;
revoke all on function private.avaliacoes_antes_de_alterar() from public, anon, authenticated;
