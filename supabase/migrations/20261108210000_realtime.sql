-- Atualização ao vivo: avisa os aparelhos conectados quando os dados mudam.
-- O Realtime respeita as políticas de RLS (só administradores recebem os dados).
alter publication supabase_realtime add table
  public.clientes,
  public.produtos,
  public.pedidos,
  public.pedido_itens,
  public.pedido_historico,
  public.pagamentos,
  public.orcamentos,
  public.orcamento_itens,
  public.despesas,
  public.categorias_despesa,
  public.formas_pagamento,
  public.etapas_pedido,
  public.loja_config;
