-- Perfis de usuário com papel: 'admin' acessa o sistema de gestão; 'cliente' (padrão) não.
-- (Já aplicado no projeto Supabase.)
create table public.perfis (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  papel text not null default 'cliente' check (papel in ('admin', 'cliente')),
  criado_em timestamptz not null default now()
);
create index perfis_papel_idx on public.perfis(papel);

-- Perfis para contas já existentes (quem estava na lista de membros vira admin)
insert into public.perfis (user_id, email, nome, papel, criado_em)
select u.id, lower(u.email),
  coalesce(m.nome, u.raw_user_meta_data->>'nome'),
  case when m.email is not null then 'admin' else 'cliente' end,
  u.created_at
from auth.users u left join public.membros m on m.email = lower(u.email);

-- Verificação de admin pelo ID do usuário (não pelo e-mail)
alter function private.is_membro() rename to is_admin;
create or replace function private.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfis p where p.user_id = auth.uid() and p.papel = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- RPCs passam a usar o novo nome
do $$
declare r record;
begin
  for r in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosrc like '%private.is_membro()%'
  loop
    execute replace(pg_get_functiondef(r.oid), 'private.is_membro()', 'private.is_admin()');
  end loop;
end $$;

-- RLS dos perfis: cada um lê o próprio; admin lê todos; ninguém altera direto pela API
alter table public.perfis enable row level security;
create policy "le o proprio perfil" on public.perfis for select to authenticated
  using (user_id = (select auth.uid()));
create policy "admin le todos" on public.perfis for select to authenticated
  using ((select private.is_admin()));
revoke all on public.perfis from anon;
revoke insert, update, delete, truncate, references, trigger on public.perfis from authenticated;

-- Cadastro aberto: toda conta nova nasce confirmada e com papel 'cliente'
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

create or replace function private.criar_perfil_novo_usuario()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.perfis (user_id, email, nome, papel)
  values (new.id, lower(coalesce(new.email, '')), nullif(trim(new.raw_user_meta_data->>'nome'), ''), 'cliente')
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.criar_perfil_novo_usuario() from public, anon, authenticated;
create trigger criar_perfil_ao_criar
  after insert on auth.users
  for each row execute function private.criar_perfil_novo_usuario();

-- Mantém o e-mail do perfil igual ao da conta
create or replace function private.sincronizar_email_perfil()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.perfis set email = lower(coalesce(new.email, '')) where user_id = new.id;
  return new;
end;
$$;
revoke all on function private.sincronizar_email_perfil() from public, anon, authenticated;
create trigger sincronizar_email_perfil
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sincronizar_email_perfil();

-- Somente admin muda o papel de alguém; nunca deixa o sistema sem administrador
create or replace function public.definir_papel(p_user_id uuid, p_papel text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Somente administradores podem alterar permissões';
  end if;
  if p_papel not in ('admin', 'cliente') then
    raise exception 'Papel inválido';
  end if;
  if p_papel = 'cliente'
     and exists (select 1 from public.perfis where user_id = p_user_id and papel = 'admin')
     and (select count(*) from public.perfis where papel = 'admin') <= 1 then
    raise exception 'O sistema precisa ter pelo menos um administrador';
  end if;
  update public.perfis set papel = p_papel where user_id = p_user_id;
  if not found then raise exception 'Usuário não encontrado'; end if;
end;
$$;
revoke all on function public.definir_papel(uuid, text) from public, anon;
grant execute on function public.definir_papel(uuid, text) to authenticated;

-- A lista de e-mails autorizados foi substituída pelos perfis
drop table public.membros;
