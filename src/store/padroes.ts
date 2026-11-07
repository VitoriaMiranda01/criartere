/* Valores padrão usados antes de os dados do servidor carregarem. */
import type { LojaConfig, PaymentMethod } from '@/types/criartere'

export const CONFIG_PADRAO: LojaConfig = {
  nome: 'Criartere',
  chavePix: '',
  email: '',
  telefone: '',
  whatsapp: '',
  endereco: '',
  instagram: '',
  incluirAguardandoNoFaturamento: true,
  periodoPadraoDashboard: 'mes_atual',
}

export const CATEGORIAS_DESPESA_PADRAO: string[] = [
  'Compra de mercadorias',
  'Matéria-prima',
  'Embalagens',
  'Frete e envio',
  'Marketing e anúncios',
  'Taxas de plataformas',
  'Fornecedores',
  'Equipamentos',
  'Outros',
]

export const FORMAS_PAGAMENTO_PADRAO: PaymentMethod[] = [
  'Pix',
  'Dinheiro',
  'Cartão de crédito',
  'Cartão de débito',
  'Transferência bancária',
  'Outros',
]
