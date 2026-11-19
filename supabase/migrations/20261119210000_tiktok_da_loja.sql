-- Link do TikTok da loja (o do Instagram já existia), informado em Configurações e
-- mostrado como ícone no cabeçalho e no rodapé da loja.
alter table public.loja_config
  add column tiktok text not null default '' check (char_length(tiktok) <= 200);

-- A vitrine pública passa a devolver também o TikTok
drop function if exists public.vitrine_contato();
create function public.vitrine_contato()
returns table (nome text, whatsapp text, instagram text, tiktok text)
language sql stable security definer
set search_path = ''
as $$
  select c.nome, c.whatsapp, c.instagram, c.tiktok from public.loja_config c where c.id = 1;
$$;
revoke all on function public.vitrine_contato() from public;
grant execute on function public.vitrine_contato() to anon, authenticated;
