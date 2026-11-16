/* Valores padrão usados antes de os dados do servidor carregarem. */
import type { CategoriaProduto, LojaConfig, PaymentMethod } from '@/types/criartere'

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

export const CATEGORIAS_PRODUTO_PADRAO: CategoriaProduto[] = [
  { nome: 'Impressão 3D', linha: '3d' },
  { nome: 'Miniaturas e colecionáveis', linha: '3d' },
  { nome: 'Peças técnicas e protótipos', linha: '3d' },
  { nome: 'Cartões e papelaria', linha: 'papelaria' },
  { nome: 'Banners, adesivos e placas', linha: 'papelaria' },
  { nome: 'Brindes personalizados' },
  { nome: 'Outros' },
]

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
