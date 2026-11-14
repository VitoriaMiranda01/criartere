/** Chave da etapa do pedido (coluna do Kanban). Etapas usadas pelas regras do sistema:
 *  'novo', 'aguardando_pagamento', 'entregue' e 'cancelado'. As demais são criadas pela loja. */
export type OrderStatus = string

export interface EtapaPedido {
  chave: string
  nome: string
  cor: string // #RRGGBB
  ordem: number
  fixa: boolean // usada pelas regras do sistema: não pode ser excluída
}

export type PaymentStatus = 'pendente' | 'parcial' | 'pago'

export type PaymentMethod =
  | 'Pix'
  | 'Dinheiro'
  | 'Cartão de crédito'
  | 'Cartão de débito'
  | 'Transferência bancária'
  | 'Outros'

export interface Cliente {
  id: string
  nome: string
  telefone: string
  whatsapp: string
  email: string
  endereco: string
  cidadeUf: string
  observacoes?: string
  criadoEm: string
}

export interface Produto {
  id: string
  nome: string
  descricao: string
  precoVenda: number
  custo: number
  categoria: string
  imagemUrl?: string
  ativo: boolean
  publicadoLoja?: boolean // aparece na loja virtual (padrão: sim)
  estoqueAproximado?: number
}

export interface PedidoItem {
  id: string
  produtoId?: string
  nome: string
  quantidade: number
  valorUnitario: number
  subtotal: number
}

export interface Pagamento {
  id: string
  pedidoId: string
  valor: number
  data: string // YYYY-MM-DD
  formaPagamento: PaymentMethod
  observacoes?: string
}

export interface OrderHistoryEvent {
  id: string
  pedidoId: string
  dataHora: string
  tipo: 'criacao' | 'status' | 'pagamento' | 'edicao' | 'cancelamento'
  descricao: string
}

export interface Pedido {
  id: string
  codigo: string // número sequencial, ex: 0024
  clienteId: string
  itens: PedidoItem[]
  valorProdutos: number
  valorFrete: number
  valorDesconto: number
  valorTotal: number
  status: OrderStatus
  statusPagamento: PaymentStatus
  formaPagamento: PaymentMethod
  prazoEntrega: string // YYYY-MM-DD
  dataCriacao: string // YYYY-MM-DD
  observacoes?: string
}

export interface Despesa {
  id: string
  descricao: string
  categoria: string
  valor: number
  data: string // YYYY-MM-DD
  vencimento?: string // YYYY-MM-DD
  formaPagamento: PaymentMethod
  status: 'pago' | 'pendente'
  observacoes?: string
}

export interface MovimentacaoCaixa {
  id: string
  data: string // YYYY-MM-DD
  descricao: string
  categoria: string
  tipo: 'entrada' | 'saida'
  valor: number
  status: 'realizado' | 'pendente'
  pedidoId?: string
  despesaId?: string
  formaPagamento?: PaymentMethod
}

export type OrcamentoStatus = 'aguardando' | 'aprovado' | 'recusado' | 'expirado'

export interface OrcamentoItem {
  id: string
  produtoId?: string
  nome: string
  quantidade: number
  valorUnitario: number
  subtotal: number
}

export interface Orcamento {
  id: string
  numero: string // gerado pelo banco a partir da data: DDMMAA (ex.: 051126, 051126-2)
  data: string // YYYY-MM-DD
  clienteId?: string
  clienteNome: string
  clienteTelefone: string
  disponibilidade: string // ex.: Pronta entrega, Sob encomenda (7 dias úteis)
  formasPagamento: string // ex.: Pix • Cartão • Dinheiro
  tipoPagamento: 'integral' | 'sinal'
  percentualSinal: number
  itens: OrcamentoItem[]
  valorProdutos: number
  valorFrete: number
  valorDesconto: number
  valorTotal: number
  observacoes: string // uma observação por linha
  status: OrcamentoStatus
  pedidoId?: string
}

export interface LojaConfig {
  nome: string
  chavePix: string
  email: string
  telefone: string
  whatsapp: string
  endereco: string
  instagram: string
  incluirAguardandoNoFaturamento: boolean
  periodoPadraoDashboard: PeriodoFiltro
}

export type PeriodoFiltro = 'hoje' | 'ultimos_7' | 'mes_atual' | 'mes_anterior' | 'personalizado'

export interface DataRange {
  inicio: string // YYYY-MM-DD
  fim: string // YYYY-MM-DD
}
