-- Etapas (colunas do Kanban) editáveis (já aplicado no projeto Supabase).
create table public.etapas_pedido (
  chave text primary key check (chave ~ '^[a-z0-9_]+$'),
  nome text not null check (length(trim(nome)) > 0),
  cor text not null default '#C48864' check (cor ~* '^#[0-9a-f]{6}$'),
  ordem integer not null default 0,
  fixa boolean not null default false,   -- usada pelas regras do sistema: não pode ser excluída
  criado_em timestamptz not null default now()
);

insert into public.etapas_pedido (chave, nome, cor, ordem, fixa) values
  ('novo', 'Novo pedido', '#C48864', 1, true),
  ('aguardando_pagamento', 'Aguardando pagamento', '#D9A441', 2, true),
  ('em_preparacao', 'Em preparação', '#8A5A3B', 3, false),
  ('em_producao', 'Em produção', '#B0764F', 4, false),
  ('pronto_envio', 'Pronto para envio', '#4C8A5A', 5, false),
  ('enviado', 'Enviado', '#5A7D8A', 6, false),
  ('entregue', 'Entregue', '#3D6F48', 7, true),
  ('cancelado', 'Cancelado', '#B5533C', 99, true);

alter table public.etapas_pedido enable row level security;
create policy "membros acessam" on public.etapas_pedido for all to authenticated
  using ((select private.is_membro())) with check ((select private.is_membro()));

-- Etapas fixas não podem ser excluídas nem ter a chave alterada
create or replace function private.proteger_etapa_fixa()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.fixa then
    raise exception 'A etapa "%" é usada pelo sistema e não pode ser excluída', old.nome;
  end if;
  if tg_op = 'UPDATE' and old.fixa and (new.chave <> old.chave or not new.fixa) then
    raise exception 'A etapa "%" é usada pelo sistema', old.nome;
  end if;
  return coalesce(new, old);
end;
$$;
create trigger proteger_etapa_fixa before update or delete on public.etapas_pedido
  for each row execute function private.proteger_etapa_fixa();

-- pedidos.status passa a apontar para a tabela de etapas
alter table public.pedidos drop constraint pedidos_status_check;
alter table public.pedidos add constraint pedidos_status_fkey
  foreign key (status) references public.etapas_pedido(chave) on update cascade on delete restrict;
create index pedidos_status_idx on public.pedidos(status);

-- Nome da etapa vem da tabela (usado no histórico)
create or replace function public.nome_status(s text)
returns text language sql stable set search_path = ''
as $$ select coalesce((select nome from public.etapas_pedido where chave = s), s); $$;

-- Exclui uma etapa movendo os pedidos dela para outra
create or replace function public.excluir_etapa(p_chave text, p_mover_para text default null)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare r record;
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  if exists (select 1 from public.pedidos where status = p_chave) then
    if p_mover_para is null or p_mover_para = p_chave
       or not exists (select 1 from public.etapas_pedido where chave = p_mover_para) then
      raise exception 'Escolha para qual etapa os pedidos desta coluna devem ir';
    end if;
    for r in select id from public.pedidos where status = p_chave loop
      update public.pedidos set status = p_mover_para where id = r.id;
      insert into public.pedido_historico (pedido_id, tipo, descricao) values (r.id, 'status',
        'Status alterado de "' || public.nome_status(p_chave) || '" para "' ||
        public.nome_status(p_mover_para) || '" (etapa excluída)');
    end loop;
  end if;
  delete from public.etapas_pedido where chave = p_chave;
end;
$$;

-- Salva a nova ordem das colunas
create or replace function public.reordenar_etapas(p_chaves text[])
returns void
language plpgsql security invoker set search_path = ''
as $$
begin
  if not private.is_membro() then raise exception 'Acesso negado'; end if;
  update public.etapas_pedido e set ordem = x.pos
  from unnest(p_chaves) with ordinality as x(chave, pos)
  where e.chave = x.chave;
end;
$$;

revoke execute on function public.excluir_etapa(text, text), public.reordenar_etapas(text[]) from public, anon;
grant execute on function public.excluir_etapa(text, text), public.reordenar_etapas(text[]) to authenticated;
