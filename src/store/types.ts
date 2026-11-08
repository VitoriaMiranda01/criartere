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
  PaymentMethod,
} from '@/types/criartere'

export interface CriartereState {
  autenticado: boolean
  sessaoVerificada: boolean // já sabemos se há sessão ativa
  carregando: boolean // carregando dados do servidor
  autorizado: boolean // usuário logado é administrador
  acessoNegado: boolean // tentou entrar sem ser administrador (mensagem no login)
  falhaVerificacao: boolean // não conseguiu confirmar o acesso (ex.: sem internet)
  modoDemo: boolean // conta de desenvolvedor(a): dados fictícios, nada é gravado
  usuarioAtual: {
    id: string
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
