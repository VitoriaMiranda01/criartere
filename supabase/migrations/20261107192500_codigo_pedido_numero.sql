-- Código do pedido passa a ser só o número com zeros à esquerda (0001, 0002...).
-- (O schema inicial já reflete esse formato; esta migração registra a alteração aplicada no projeto.)
alter table public.pedidos alter column codigo set expression as (lpad(numero::text, 4, '0'));
