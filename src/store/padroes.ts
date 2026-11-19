/* Valores padrão usados antes de os dados do servidor carregarem. */
import type { CategoriaProduto, LojaConfig, PaymentMethod } from '@/types/criartere'
import { LINHAS_CATALOGO } from '@/loja/seo-dados'

export const CONFIG_PADRAO: LojaConfig = {
  nome: 'Criartere',
  chavePix: '',
  email: '',
  telefone: '',
  whatsapp: '',
  endereco: '',
  instagram: '',
  tiktok: '',
  incluirAguardandoNoFaturamento: true,
  periodoPadraoDashboard: 'mes_atual',
  barraAvisosAtiva: false,
  barraAvisos: [],
  secoesInicio: [],
}

// Mesma divisão por aba usada pela loja (definida em um lugar só: LINHAS_CATALOGO)
export const CATEGORIAS_PRODUTO_PADRAO: CategoriaProduto[] = [
  ...(['3d', 'papelaria'] as const).flatMap((linha) =>
    LINHAS_CATALOGO[linha].categorias.map((nome) => ({ nome, linha })),
  ),
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
