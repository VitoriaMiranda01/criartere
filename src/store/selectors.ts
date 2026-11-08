import { CriartereState, FinancialSummary, FluxoResumo } from './types'
import { PeriodoFiltro, DataRange, MovimentacaoCaixa } from '@/types/criartere'
import { getIntervaloPeriodo, estaNoPeriodo } from './periodUtils'

/**
 * Seletores que calculam números DERIVADOS diretamente do estado.
 * Respeitam rigorosamente as 10 regras financeiras:
 * 1. Pedido cadastrado = receita PREVISTA (faturamentoTotal)
 * 2. Só o efetivamente recebido entra como realizado (totalRecebido)
 * 3. Pagamentos parciais deixam saldo como "a receber"
 * 4. Despesa cadastrada aparece como saída prevista/pendente
 * 5. Despesa marcada como paga = saída realizada
 * 6. Cancelamento de pedido não conta como receita prevista e zera pagamentos futuros
 * 7. Saldo de caixa = somente realizados (recebidos - despesas pagas)
 * 8. Nunca duplicar contabilidade
 */

export function selectFinancialSummary(
  state: CriartereState,
  periodo: PeriodoFiltro,
  personalizado?: DataRange,
): FinancialSummary {
  const { inicio, fim } = getIntervaloPeriodo(periodo, personalizado)

  // Pedidos ativos no período (não cancelados)
  const pedidosNoPeriodo = state.pedidos.filter(
    (p) => p.status !== 'cancelado' && estaNoPeriodo(p.dataCriacao, inicio, fim),
  )

  // Faturamento total (receita prevista). A opção "Faturamento Previsto" em Configurações
  // decide se pedidos na etapa "Aguardando pagamento" entram nesta soma.
  const faturamentoTotal = pedidosNoPeriodo
    .filter(
      (p) => state.config.incluirAguardandoNoFaturamento || p.status !== 'aguardando_pagamento',
    )
    .reduce((sum, p) => sum + p.valorTotal, 0)

  // Pagamentos efetivamente recebidos no período (apenas de pedidos que não foram cancelados)
  // Caso o pedido tenha sido cancelado, seus pagamentos são desconsiderados do faturamento
  const pedidosValidosIds = new Set(
    state.pedidos.filter((p) => p.status !== 'cancelado').map((p) => p.id),
  )

  const pagamentosNoPeriodo = state.pagamentos.filter(
    (pag) => pedidosValidosIds.has(pag.pedidoId) && estaNoPeriodo(pag.data, inicio, fim),
  )

  const totalRecebido = pagamentosNoPeriodo.reduce((sum, p) => sum + p.valor, 0)

  // Despesas no período
  const despesasNoPeriodo = state.despesas.filter((d) => estaNoPeriodo(d.data, inicio, fim))

  const despesasPagas = despesasNoPeriodo
    .filter((d) => d.status === 'pago')
    .reduce((sum, d) => sum + d.valor, 0)

  const despesasPendentes = despesasNoPeriodo
    .filter((d) => d.status === 'pendente')
    .reduce((sum, d) => sum + d.valor, 0)

  // Total a receber dos pedidos do período:
  // Para cada pedido do período, total do pedido menos o que já foi pago nele
  const totalAReceber = pedidosNoPeriodo.reduce((sum, pedido) => {
    const pagosNessePedido = state.pagamentos
      .filter((pag) => pag.pedidoId === pedido.id)
      .reduce((s, p) => s + p.valor, 0)
    const saldo = Math.max(0, pedido.valorTotal - pagosNessePedido)
    return sum + saldo
  }, 0)

  // Resultado financeiro realizado (lucro realizado)
  const resultadoFinanceiro = totalRecebido - despesasPagas

  // Saldo de caixa (soma de todas as entradas realizadas menos todas as saídas realizadas até o final do período)
  // Para ter um saldo contínuo fiel:
  const todasEntradasAteFim = state.pagamentos
    .filter((pag) => pedidosValidosIds.has(pag.pedidoId) && pag.data <= fim)
    .reduce((s, p) => s + p.valor, 0)

  const todasSaidasAteFim = state.despesas
    .filter((d) => d.status === 'pago' && d.data <= fim)
    .reduce((s, d) => s + d.valor, 0)

  const saldoDeCaixa = todasEntradasAteFim - todasSaidasAteFim

  const quantidadeVendas = pedidosNoPeriodo.length
  const ticketMedio = quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0

  return {
    faturamentoTotal,
    totalRecebido,
    totalAReceber,
    despesasPagas,
    despesasPendentes,
    resultadoFinanceiro,
    saldoDeCaixa,
    quantidadeVendas,
    ticketMedio,
  }
}

export function selectFluxoCaixa(
  state: CriartereState,
  periodo: PeriodoFiltro,
  personalizado?: DataRange,
): {
  resumo: FluxoResumo
  movimentacoes: MovimentacaoCaixa[]
} {
  const { inicio, fim } = getIntervaloPeriodo(periodo, personalizado)

  const pedidosValidos = new Map(
    state.pedidos.filter((p) => p.status !== 'cancelado').map((p) => [p.id, p]),
  )

  // Saldo inicial (antes do início do período)
  const entradasAntes = state.pagamentos
    .filter((p) => pedidosValidos.has(p.pedidoId) && p.data < inicio)
    .reduce((s, p) => s + p.valor, 0)
  const saidasAntes = state.despesas
    .filter((d) => d.status === 'pago' && d.data < inicio)
    .reduce((s, d) => s + d.valor, 0)
  const saldoInicial = entradasAntes - saidasAntes

  const movimentacoes: MovimentacaoCaixa[] = []

  // 1. Entradas realizadas (pagamentos)
  state.pagamentos.forEach((pag) => {
    const pedido = pedidosValidos.get(pag.pedidoId)
    if (pedido && estaNoPeriodo(pag.data, inicio, fim)) {
      movimentacoes.push({
        id: `mov-pag-${pag.id}`,
        data: pag.data,
        descricao: `Recebimento pedido ${pedido.codigo}`,
        categoria: 'Vendas de produtos',
        tipo: 'entrada',
        valor: pag.valor,
        status: 'realizado',
        pedidoId: pedido.id,
        formaPagamento: pag.formaPagamento,
      })
    }
  })

  // 2. Entradas previstas (saldos restantes de pedidos ativos no período que ainda não foram pagos)
  state.pedidos.forEach((ped) => {
    if (ped.status !== 'cancelado' && estaNoPeriodo(ped.dataCriacao, inicio, fim)) {
      const totalPago = state.pagamentos
        .filter((pag) => pag.pedidoId === ped.id)
        .reduce((s, pag) => s + pag.valor, 0)
      const restante = ped.valorTotal - totalPago
      if (restante > 0.01) {
        movimentacoes.push({
          id: `mov-prev-ped-${ped.id}`,
          data: ped.prazoEntrega || ped.dataCriacao,
          descricao: `A receber: pedido ${ped.codigo}`,
          categoria: 'Vendas a receber',
          tipo: 'entrada',
          valor: restante,
          status: 'pendente',
          pedidoId: ped.id,
          formaPagamento: ped.formaPagamento,
        })
      }
    }
  })

  // 3. Saídas (despesas pagas ou pendentes)
  state.despesas.forEach((desp) => {
    if (estaNoPeriodo(desp.data, inicio, fim)) {
      movimentacoes.push({
        id: `mov-desp-${desp.id}`,
        data: desp.data,
        descricao: desp.descricao,
        categoria: desp.categoria,
        tipo: 'saida',
        valor: desp.valor,
        status: desp.status === 'pago' ? 'realizado' : 'pendente',
        despesaId: desp.id,
        formaPagamento: desp.formaPagamento,
      })
    }
  })

  // Ordena por data decrescente
  movimentacoes.sort((a, b) => b.data.localeCompare(a.data))

  // Totais do período
  const entradasRealizadas = movimentacoes
    .filter((m) => m.tipo === 'entrada' && m.status === 'realizado')
    .reduce((s, m) => s + m.valor, 0)

  const saidasRealizadas = movimentacoes
    .filter((m) => m.tipo === 'saida' && m.status === 'realizado')
    .reduce((s, m) => s + m.valor, 0)

  const entradasPrevistas = movimentacoes
    .filter((m) => m.tipo === 'entrada' && m.status === 'pendente')
    .reduce((s, m) => s + m.valor, 0)

  const saidasPrevistas = movimentacoes
    .filter((m) => m.tipo === 'saida' && m.status === 'pendente')
    .reduce((s, m) => s + m.valor, 0)

  const saldoFinal = saldoInicial + entradasRealizadas - saidasRealizadas

  return {
    resumo: {
      saldoInicial,
      entradasRealizadas,
      saidasRealizadas,
      saldoFinal,
      entradasPrevistas,
      saidasPrevistas,
    },
    movimentacoes,
  }
}

export function selectPagamentosDoPedido(state: CriartereState, pedidoId: string) {
  return state.pagamentos.filter((p) => p.pedidoId === pedidoId)
}

export function selectTotalPagoDoPedido(state: CriartereState, pedidoId: string): number {
  return selectPagamentosDoPedido(state, pedidoId).reduce((s, p) => s + p.valor, 0)
}

export function selectHistoricoDoPedido(state: CriartereState, pedidoId: string) {
  return state.historico
    .filter((h) => h.pedidoId === pedidoId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
}

export function selectClientePorId(state: CriartereState, clienteId: string) {
  return state.clientes.find((c) => c.id === clienteId)
}

export function selectPedidosDoCliente(state: CriartereState, clienteId: string) {
  return state.pedidos.filter((p) => p.clienteId === clienteId)
}

export function selectResumoCliente(state: CriartereState, clienteId: string) {
  const pedidos = selectPedidosDoCliente(state, clienteId)
  const pedidosValidos = pedidos.filter((p) => p.status !== 'cancelado')
  const totalComprado = pedidosValidos.reduce((s, p) => s + p.valorTotal, 0)
  const totalPago = pedidosValidos.reduce((s, p) => {
    return s + selectTotalPagoDoPedido(state, p.id)
  }, 0)
  const valoresPendentes = Math.max(0, totalComprado - totalPago)

  return {
    quantidadePedidos: pedidos.length,
    pedidosValidosCount: pedidosValidos.length,
    totalComprado,
    totalPago,
    valoresPendentes,
  }
}
