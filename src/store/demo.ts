/* Modo desenvolvedor: dados fictícios para usar e testar o sistema sem ver
   nenhum dado real da loja. Nada aqui é gravado no banco; ao recarregar a
   página, tudo volta ao estado inicial. */
import type {
  Cliente,
  Despesa,
  OrderHistoryEvent,
  Orcamento,
  Pagamento,
  PaymentMethod,
  Pedido,
  Produto,
} from '@/types/criartere'
import type { CriartereState } from './types'
import { ETAPAS_PADRAO } from './etapas'
import { CATEGORIAS_DESPESA_PADRAO, CONFIG_PADRAO, FORMAS_PAGAMENTO_PADRAO } from './padroes'
import { agoraFormatado, daquiADias, hojeISO } from '@/lib/datas'

const id = (prefixo: string, n: number) =>
  `${prefixo}-0000-4000-8000-${String(n).padStart(12, '0')}`

const CLIENTES: [string, string, string][] = [
  ['Ana Exemplo', '(11) 90000-0001', 'São Paulo/SP'],
  ['Bruno Fictício', '(11) 90000-0002', 'Campinas/SP'],
  ['Carla Demonstração', '(21) 90000-0003', 'Rio de Janeiro/RJ'],
  ['Daniel Teste', '(31) 90000-0004', 'Belo Horizonte/MG'],
  ['Escola Modelo', '(11) 90000-0005', 'Santo André/SP'],
  ['Felipe Amostra', '(41) 90000-0006', 'Curitiba/PR'],
]

const PRODUTOS: [string, string, number, number][] = [
  ['Chaveiro 3D personalizado', 'Impressão 3D', 18, 4],
  ['Miniatura 3D (até 10 cm)', 'Impressão 3D', 65, 18],
  ['Suporte de celular 3D', 'Impressão 3D', 35, 9],
  ['Adesivos vinil (folha A4)', 'Gráfica', 22, 6],
  ['Cartão de visita (100 un.)', 'Gráfica', 59, 21],
  ['Banner 60x90 cm', 'Gráfica', 89, 32],
  ['Topo de bolo personalizado', 'Papelaria', 45, 12],
]

/** Pedidos de exemplo: [cliente, produto, quantidade, dias atrás, etapa, pago (0 a 1)] */
const PEDIDOS: [number, number, number, number, string, number][] = [
  [0, 0, 10, 1, 'novo', 0],
  [1, 4, 2, 2, 'aguardando_pagamento', 0],
  [2, 1, 1, 3, 'em_preparacao', 0.5],
  [3, 5, 1, 5, 'em_producao', 0.5],
  [4, 3, 15, 6, 'pronto_envio', 1],
  [5, 2, 3, 9, 'enviado', 1],
  [0, 6, 2, 14, 'entregue', 1],
  [1, 1, 2, 22, 'entregue', 1],
  [2, 0, 25, 35, 'entregue', 1],
  [3, 4, 1, 41, 'cancelado', 0],
  [4, 5, 2, 48, 'entregue', 1],
  [5, 3, 8, 63, 'entregue', 1],
]

const DESPESAS: [string, string, number, number, 'pago' | 'pendente'][] = [
  ['Filamento PLA (5 kg)', 'Matéria-prima', 420, 4, 'pago'],
  ['Papel couché e vinil', 'Matéria-prima', 185, 11, 'pago'],
  ['Embalagens kraft', 'Embalagens', 96, 18, 'pago'],
  ['Anúncios Instagram', 'Marketing e anúncios', 150, 25, 'pago'],
  ['Manutenção da impressora', 'Equipamentos', 260, 38, 'pago'],
  ['Frete fornecedor', 'Frete e envio', 48, 52, 'pago'],
  ['Tinta para impressora', 'Matéria-prima', 310, -6, 'pendente'],
  ['Taxa da maquininha', 'Taxas de plataformas', 74, -12, 'pendente'],
]

function dataHora(diasAtras: number, hora = '10:00') {
  return `${daquiADias(-diasAtras)} ${hora}`
}

export function dadosDemo(): Partial<CriartereState> {
  const clientes: Cliente[] = CLIENTES.map(([nome, tel, cidade], i) => ({
    id: id('d0c11e00', i + 1),
    nome,
    telefone: tel,
    whatsapp: tel,
    email: `${nome.split(' ')[0].toLowerCase()}@exemplo.com`,
    endereco: `Rua Exemplo, ${100 + i * 15}`,
    cidadeUf: cidade,
    criadoEm: daquiADias(-90 + i * 5),
  }))

  const produtos: Produto[] = PRODUTOS.map(([nome, categoria, preco, custo], i) => ({
    id: id('d0c22e00', i + 1),
    nome,
    descricao: 'Produto de demonstração',
    precoVenda: preco,
    custo,
    categoria,
    ativo: true,
    estoqueAproximado: 10 + i * 3,
  }))

  const pedidos: Pedido[] = []
  const pagamentos: Pagamento[] = []
  const historico: OrderHistoryEvent[] = []
  PEDIDOS.forEach(([c, p, qtd, dias, status, pago], i) => {
    const produto = produtos[p]
    const subtotal = produto.precoVenda * qtd
    const frete = i % 3 === 0 ? 15 : 0
    const total = subtotal + frete
    const pedidoId = id('d0c33e00', i + 1)
    const forma = FORMAS_PAGAMENTO_PADRAO[i % 3]
    pedidos.push({
      id: pedidoId,
      codigo: String(i + 1).padStart(4, '0'),
      clienteId: clientes[c].id,
      itens: [
        {
          id: `item-${i}`,
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: qtd,
          valorUnitario: produto.precoVenda,
          subtotal,
        },
      ],
      valorProdutos: subtotal,
      valorFrete: frete,
      valorDesconto: 0,
      valorTotal: total,
      status,
      statusPagamento: pago >= 1 ? 'pago' : pago > 0 ? 'parcial' : 'pendente',
      formaPagamento: forma,
      prazoEntrega: daquiADias(-dias + 7),
      dataCriacao: daquiADias(-dias),
    })
    historico.push({
      id: `h-${i}`,
      pedidoId,
      dataHora: dataHora(dias, '09:30'),
      tipo: 'criacao',
      descricao: 'Pedido cadastrado (demonstração)',
    })
    if (pago > 0) {
      pagamentos.push({
        id: `pg-${i}`,
        pedidoId,
        valor: Math.round(total * pago * 100) / 100,
        data: daquiADias(-Math.max(0, dias - 1)),
        formaPagamento: forma,
      })
    }
  })

  const despesas: Despesa[] = DESPESAS.map(([descricao, categoria, valor, dias, status], i) => ({
    id: id('d0c44e00', i + 1),
    descricao,
    categoria,
    valor,
    data: daquiADias(-dias),
    vencimento: status === 'pendente' ? daquiADias(-dias) : undefined,
    formaPagamento: FORMAS_PAGAMENTO_PADRAO[i % 3],
    status,
  }))

  const orcamentos: Orcamento[] = [
    orcamentoDemo('d0c55e00-0000-4000-8000-000000000001', 'Gabriela Exemplo', produtos[1], 2, 1),
    orcamentoDemo('d0c55e00-0000-4000-8000-000000000002', 'Henrique Teste', produtos[5], 3, 4),
  ]

  return {
    clientes,
    produtos,
    pedidos,
    pagamentos,
    historico,
    despesas,
    orcamentos,
    etapas: ETAPAS_PADRAO,
    categoriasDespesa: CATEGORIAS_DESPESA_PADRAO,
    formasPagamento: FORMAS_PAGAMENTO_PADRAO,
    config: {
      ...CONFIG_PADRAO,
      nome: 'Loja Demonstração',
      chavePix: 'pix@exemplo.com',
      email: 'contato@exemplo.com',
      telefone: '(11) 90000-0000',
      whatsapp: '(11) 90000-0000',
      instagram: '@exemplo',
    },
  }
}

function orcamentoDemo(
  orcId: string,
  cliente: string,
  produto: Produto,
  qtd: number,
  diasAtras: number,
): Orcamento {
  const data = daquiADias(-diasAtras)
  const total = produto.precoVenda * qtd
  return {
    id: orcId,
    numero: numeroOrcamento(data, []),
    data,
    clienteNome: cliente,
    clienteTelefone: '(11) 90000-0099',
    disponibilidade: 'Sob encomenda (7 dias úteis)',
    formasPagamento: 'Pix • Cartão',
    tipoPagamento: 'sinal',
    percentualSinal: 50,
    itens: [
      {
        id: `${orcId}-1`,
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: qtd,
        valorUnitario: produto.precoVenda,
        subtotal: total,
      },
    ],
    valorProdutos: total,
    valorFrete: 0,
    valorDesconto: 0,
    valorTotal: total,
    observacoes: 'Orçamento de demonstração',
    status: 'aguardando',
  }
}

/** Mesmo formato do banco: DDMMAA, e -2, -3... para mais de um no mesmo dia. */
function numeroOrcamento(data: string, existentes: Orcamento[]): string {
  const [a, m, d] = data.split('-')
  const base = `${d}${m}${a.slice(2)}`
  const doDia = existentes.filter((o) => o.numero === base || o.numero.startsWith(`${base}-`))
  return doDia.length === 0 ? base : `${base}-${doDia.length + 1}`
}

/**
 * Faz localmente o que o banco faria depois de uma ação (numerar orçamento,
 * transformar orçamento em pedido...), para o modo desenvolvedor se comportar
 * como o sistema real.
 */
export function simularServidor(
  action: { type: string; payload?: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  s: CriartereState,
): CriartereState {
  switch (action.type) {
    case 'SALVAR_ORCAMENTO': {
      const orc = s.orcamentos.find((o) => o.id === action.payload.id)
      if (!orc || orc.numero) return s
      const numero = numeroOrcamento(orc.data || hojeISO(), s.orcamentos)
      return {
        ...s,
        orcamentos: s.orcamentos.map((o) => (o.id === orc.id ? { ...o, numero } : o)),
      }
    }

    case 'CONVERTER_ORCAMENTO': {
      const orc = s.orcamentos.find((o) => o.id === action.payload.id)
      if (!orc || orc.pedidoId) return s
      let clientes = s.clientes
      let clienteId = orc.clienteId
      if (!clienteId) {
        clienteId = crypto.randomUUID()
        clientes = [
          {
            id: clienteId,
            nome: orc.clienteNome,
            telefone: orc.clienteTelefone,
            whatsapp: orc.clienteTelefone,
            email: '',
            endereco: '',
            cidadeUf: '',
            criadoEm: hojeISO(),
          },
          ...clientes,
        ]
      }
      const maior = Math.max(0, ...s.pedidos.map((p) => parseInt(p.codigo, 10) || 0))
      const pedidoId = crypto.randomUUID()
      const pedido: Pedido = {
        id: pedidoId,
        codigo: String(maior + 1).padStart(4, '0'),
        clienteId,
        itens: orc.itens.map((it) => ({ ...it, id: crypto.randomUUID() })),
        valorProdutos: orc.valorProdutos,
        valorFrete: orc.valorFrete,
        valorDesconto: orc.valorDesconto,
        valorTotal: orc.valorTotal,
        status: 'novo',
        statusPagamento: 'pendente',
        formaPagamento: (orc.formasPagamento.split('•')[0]?.trim() || 'Pix') as PaymentMethod,
        prazoEntrega: action.payload.prazoEntrega || daquiADias(7),
        dataCriacao: hojeISO(),
        observacoes: `Gerado a partir do orçamento Nº ${orc.numero}.`,
      }
      return {
        ...s,
        clientes,
        pedidos: [pedido, ...s.pedidos],
        orcamentos: s.orcamentos.map((o) =>
          o.id === orc.id ? { ...o, status: 'aprovado', pedidoId, clienteId } : o,
        ),
        historico: [
          {
            id: crypto.randomUUID(),
            pedidoId,
            dataHora: agoraFormatado(),
            tipo: 'edicao',
            descricao: `Pedido gerado a partir do orçamento Nº ${orc.numero}`,
          },
          ...s.historico,
        ],
      }
    }

    default:
      return s
  }
}

/** Contas de exemplo exibidas em "Usuários e permissões" no modo desenvolvedor. */
export const USUARIOS_DEMO = [
  { nome: 'Administradora Exemplo', email: 'admin@exemplo.com', papel: 'admin' as const },
  { nome: 'Pessoa Cliente', email: 'cliente@exemplo.com', papel: 'cliente' as const },
]
