-- Página "Sobre nós" da loja: texto e fotos editáveis pelo painel.
-- Migração apenas ADITIVA. Uma única linha (id = 1).
create table public.pagina_sobre (
  id smallint primary key default 1 check (id = 1),
  titulo text not null default 'Sobre nós',
  introducao text not null default '',
  texto text not null default '', -- parágrafos separados por linha em branco
  fotos jsonb not null default '[]'::jsonb, -- [{ "url": "...", "legenda": "..." }]
  atualizado_em timestamptz not null default now(),
  constraint pagina_sobre_fotos_lista check (jsonb_typeof(fotos) = 'array' and jsonb_array_length(fotos) <= 12)
);

insert into public.pagina_sobre (id, titulo, introducao, texto) values (
  1,
  'Sobre nós',
  'A Criartere nasceu da vontade de transformar ideias em peças feitas com carinho, camada por camada.',
  E'Tudo começou com uma paixão por criar: pegar uma ideia, um desenho ou um desejo e transformar em algo que dá para segurar nas mãos.\n\n'
  'Hoje unimos a impressão 3D e a papelaria personalizada para criar decoração, lembranças, presentes e impressos únicos. Cada pedido é pensado nos detalhes, do acabamento à embalagem.\n\n'
  'Gostou de algo ou tem uma ideia diferente? Fale com a gente pelo WhatsApp: vamos adorar criar junto com você.'
) on conflict (id) do nothing;

alter table public.pagina_sobre enable row level security;
create policy "loja le a pagina sobre" on public.pagina_sobre for select to anon, authenticated
  using (true);
create policy "admin edita a pagina sobre" on public.pagina_sobre for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
revoke insert, update, delete, truncate, references, trigger on public.pagina_sobre from anon;
revoke insert, delete, truncate, references, trigger on public.pagina_sobre from authenticated;
grant select on public.pagina_sobre to anon;

-- Bucket público das fotos (até 5 MB). Só administradores enviam e apagam.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sobre', 'sobre', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "sobre: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'sobre' and (select private.is_admin()));
create policy "sobre: admin atualiza" on storage.objects for update to authenticated
  using (bucket_id = 'sobre' and (select private.is_admin()))
  with check (bucket_id = 'sobre' and (select private.is_admin()));
create policy "sobre: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'sobre' and (select private.is_admin()));
create policy "sobre: admin lista" on storage.objects for select to authenticated
  using (bucket_id = 'sobre' and (select private.is_admin()));
