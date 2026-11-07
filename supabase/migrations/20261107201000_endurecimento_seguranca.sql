-- Endurecimento de segurança (já aplicado no projeto Supabase).

-- 1) Visitante sem login (anon) não tem nenhum acesso às tabelas; logados não podem TRUNCATE
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;

-- 2) Lista de membros: só leitura do próprio cadastro (alterações apenas pelo painel/SQL)
revoke insert, update, delete on public.membros from authenticated;

-- 3) Histórico e pagamentos são registros de auditoria: não podem ser alterados nem apagados pela API
drop policy "membros acessam" on public.pedido_historico;
create policy "membros leem" on public.pedido_historico for select to authenticated
  using ((select private.is_membro()));
create policy "membros registram" on public.pedido_historico for insert to authenticated
  with check ((select private.is_membro()));
revoke update, delete on public.pedido_historico from authenticated;

drop policy "membros acessam" on public.pagamentos;
create policy "membros leem" on public.pagamentos for select to authenticated
  using ((select private.is_membro()));
create policy "membros registram" on public.pagamentos for insert to authenticated
  with check ((select private.is_membro()));
revoke update, delete on public.pagamentos from authenticated;

-- 4) Cadastro restrito: só e-mails da lista de membros conseguem criar conta
create or replace function private.confirmar_email_novo_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.membros m where m.email = lower(coalesce(new.email, ''))) then
    raise exception 'Este e-mail não está autorizado a criar conta na Criartere'
      using errcode = 'P0001';
  end if;
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

-- 5) Funções internas não executáveis pela API
revoke all on function private.proteger_etapa_fixa() from public, anon, authenticated;
revoke all on function public.formatar_brl(numeric), public.nome_status(text) from public, anon;
grant execute on function public.formatar_brl(numeric), public.nome_status(text) to authenticated;
