-- Contas novas já nascem com o e-mail confirmado (sem link de confirmação).
-- O acesso aos dados continua restrito à tabela public.membros.
create or replace function private.confirmar_email_novo_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.confirmar_email_novo_usuario() from public, anon, authenticated;

create trigger confirmar_email_ao_criar
  before insert on auth.users
  for each row execute function private.confirmar_email_novo_usuario();
