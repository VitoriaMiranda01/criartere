-- Papel "desenvolvedor": entra no sistema, mas NÃO lê nenhum dado da loja.
-- O site mostra dados fictícios para essa conta. Como private.is_admin() só
-- aceita 'admin', todas as políticas de RLS continuam bloqueando o acesso.
alter table public.perfis drop constraint perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check
  check (papel in ('admin', 'desenvolvedor', 'cliente'));

create or replace function public.definir_papel(p_user_id uuid, p_papel text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not private.is_admin() then
    raise exception 'Somente administradores podem alterar permissões';
  end if;
  if p_papel not in ('admin', 'desenvolvedor', 'cliente') then
    raise exception 'Papel inválido';
  end if;
  if p_papel <> 'admin'
     and exists (select 1 from public.perfis where user_id = p_user_id and papel = 'admin')
     and (select count(*) from public.perfis where papel = 'admin') <= 1 then
    raise exception 'O sistema precisa ter pelo menos um administrador';
  end if;
  update public.perfis set papel = p_papel where user_id = p_user_id;
  if not found then raise exception 'Usuário não encontrado'; end if;
end;
$function$;
