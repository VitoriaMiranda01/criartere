-- Banners: a imagem para celular passa a ser obrigatória, como a de computador.
-- (Nenhum banner cadastrado até aqui ficou sem ela.)
alter table public.banners
  alter column imagem_celular set not null,
  add constraint banners_imagens_preenchidas check (
    length(trim(imagem_computador)) > 0 and length(trim(imagem_celular)) > 0
  );
