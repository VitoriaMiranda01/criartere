import {
  Cliente,
  Produto,
  Pedido,
  EtapaPedido,
  Orcamento,
  Despesa,
  Pagamento,
  OrderHistoryEvent,
  LojaConfig,
  PeriodoFiltro,
  DataRange,
  MovimentacaoCaixa,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
} from '@/types/criartere'

export interface CriartereState {
  autenticado: boolean
  sessaoVerificada: boolean // já sabemos se há sessão ativa
  carregando: boolean // carregando dados do servidor
  autorizado: boolean // e-mail consta na lista de membros da loja
  usuarioAtual: {
    nome: string
    email: string
    papel: string
    avatarUrl?: string
  }
  clientes: Cliente[]
  produtos: Produto[]
  pedidos: Pedido[]
  etapas: EtapaPedido[]
  orcamentos: Orcamento[]
  pagamentos: Pagamento[]
  despesas: Despesa[]
  categoriasDespesa: string[]
  formasPagamento: PaymentMethod[]
  historico: OrderHistoryEvent[]
  config: LojaConfig
}

export interface FinancialSummary {
  faturamentoTotal: number // Receita prevista: soma de todos os pedidos ativos (não cancelados)
  totalRecebido: number // Efetivamente recebido via pagamentos
  totalAReceber: number // Saldo devedor de pedidos não cancelados (faturamentoTotal - totalRecebido)
  despesasPagas: number // Saídas realizadas
  despesasPendentes: number // Saídas previstas
  resultadoFinanceiro: number // totalRecebido - despesasPagas (lucro realizado)
  saldoDeCaixa: number // Somente valores realizados: totalRecebido - despesasPagas
  quantidadeVendas: number // Número de pedidos ativos no período
  ticketMedio: number
}

export interface FluxoResumo {
  saldoInicial: number
  entradasRealizadas: number
  saidasRealizadas: number
  saldoFinal: number
  entradasPrevistas: number
  saidasPrevistas: number
}
