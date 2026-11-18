-- Barra de avisos (letreiro) no topo da loja: frases que passam em sequência.
-- Migração apenas ADITIVA. Fica na configuração da loja (linha única, id = 1).
alter table public.loja_config
  add column if not exists barra_avisos_ativa boolean not null default false,
  add column if not exists barra_avisos jsonb not null default '[]'::jsonb,
  add constraint loja_config_barra_avisos_lista check (
    jsonb_typeof(barra_avisos) = 'array' and jsonb_array_length(barra_avisos) <= 20
  );

-- A loja (visitantes e clientes) lê só os avisos, não o resto da configuração
create or replace function public.vitrine_avisos()
returns table (ativa boolean, frases jsonb)
language sql stable security definer
set search_path = ''
as $$
  select c.barra_avisos_ativa, c.barra_avisos from public.loja_config c where c.id = 1;
$$;
revoke all on function public.vitrine_avisos() from public;
grant execute on function public.vitrine_avisos() to anon, authenticated;
