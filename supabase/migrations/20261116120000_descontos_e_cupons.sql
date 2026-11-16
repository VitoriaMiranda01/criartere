-- Descontos e cupons: cadastro de promoções aplicáveis em pedidos e orçamentos.
-- Sem código = desconto (escolhido na lista); com código = cupom (digitado pelo cliente).
create table public.descontos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  codigo text check (codigo is null or (codigo = upper(codigo) and codigo ~ '^[A-Z0-9_-]{3,30}$')),
  tipo text not null default 'percentual' check (tipo in ('percentual', 'valor')),
  valor numeric(12,2) not null check (valor > 0),
  valor_minimo numeric(12,2) not null default 0 check (valor_minimo >= 0),
  valido_de date,
  valido_ate date,
  ativo boolean not null default true,
  descricao text not null default '',
  criado_em timestamptz not null default now(),
  constraint descontos_percentual_ate_100 check (tipo <> 'percentual' or valor <= 100),
  constraint descontos_periodo_valido check (valido_de is null or valido_ate is null or valido_de <= valido_ate)
);
create unique index descontos_codigo_unico on public.descontos(codigo) where codigo is not null;

alter table public.descontos enable row level security;
create policy "admin acessa" on public.descontos for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke all on public.descontos from anon;

-- Atualização ao vivo entre aparelhos
alter publication supabase_realtime add table public.descontos;
