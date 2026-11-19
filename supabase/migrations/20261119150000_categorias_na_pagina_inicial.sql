-- A dona da loja escolhe quais categorias aparecem nos cards da página inicial.
-- As categorias que já existem continuam aparecendo (padrão: sim).
alter table public.categorias_produto
  add column mostrar_na_inicio boolean not null default true;
