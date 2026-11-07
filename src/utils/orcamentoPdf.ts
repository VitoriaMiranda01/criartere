/* Gera o PDF do orçamento no modelo da Criartere (A4, mesmas seções e cores do modelo enviado). */
import { jsPDF } from 'jspdf'
import type { Orcamento, OrcamentoStatus } from '@/types/criartere'

// Paleta do modelo
const COR_TEXTO: [number, number, number] = [58, 53, 51]
const COR_CINZA: [number, number, number] = [112, 104, 100]
const COR_DESTAQUE: [number, number, number] = [192, 112, 96]
const COR_FUNDO: [number, number, number] = [248, 239, 236]
const COR_FUNDO_CLARO: [number, number, number] = [252, 248, 246]
const COR_BORDA: [number, number, number] = [237, 217, 210]

const MARGEM_ESQ = 19
const MARGEM_DIR = 192.2
const LARGURA = MARGEM_DIR - MARGEM_ESQ
const LIMITE_PAGINA = 276

export const NOMES_STATUS_ORCAMENTO: Record<OrcamentoStatus, string> = {
  aguardando: 'Aguardando confirmação',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
}

const brl = (v: number) =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const dataBR = (iso: string) => {
  const [a, m, d] = iso.split('-')
  return d && m && a ? `${d}/${m}/${a}` : iso
}

const qtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

/** Nome do arquivo no padrão: ORCAMENTO_CARLA_CRIARTERE_051126_PRONTA_ENTREGA_SEM_SINAL.pdf */
export function nomeArquivoOrcamento(o: Orcamento): string {
  const limpar = (t: string) =>
    t
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase()
  const partes = [
    'ORCAMENTO',
    limpar(o.clienteNome.split(' ')[0] || 'CLIENTE'),
    'CRIARTERE',
    limpar(o.numero),
    limpar(o.disponibilidade).slice(0, 30),
    o.tipoPagamento === 'sinal' ? 'COM_SINAL' : 'SEM_SINAL',
  ].filter(Boolean)
  return `${partes.join('_')}.pdf`
}

export function gerarPdfOrcamento(o: Orcamento, opcoes: { chavePix?: string } = {}): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const cor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const fonte = (estilo: 'normal' | 'bold' | 'italic', tamanho: number) => {
    doc.setFont('helvetica', estilo)
    doc.setFontSize(tamanho)
  }
  const caixa = (x: number, yTopo: number, w: number, h: number, fundo = COR_FUNDO) => {
    doc.setFillColor(fundo[0], fundo[1], fundo[2])
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2])
    doc.setLineWidth(0.25)
    doc.rect(x, yTopo, w, h, 'FD')
  }
  const linhaH = (x1: number, x2: number, yy: number) => {
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2])
    doc.setLineWidth(0.25)
    doc.line(x1, yy, x2, yy)
  }
  const linhaV = (x: number, y1: number, y2: number) => {
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2])
    doc.setLineWidth(0.25)
    doc.line(x, y1, x, y2)
  }
  const tituloSecao = (texto: string) => {
    fonte('bold', 10)
    cor(COR_DESTAQUE)
    doc.text(texto, MARGEM_ESQ + 2.3, y)
    y += 3.4
  }
  const novaPaginaSePreciso = (altura: number) => {
    if (y + altura > LIMITE_PAGINA) {
      rodape()
      doc.addPage()
      y = 22
      return true
    }
    return false
  }
  const rodape = () => {
    linhaH(MARGEM_ESQ, MARGEM_DIR, 285.6)
    fonte('normal', 7.5)
    cor(COR_CINZA)
    doc.text('CRIARTERE  •  3D  •  PAPELARIA  •  PERSONALIZADOS', 105, 290.6, { align: 'center' })
  }

  // ---------- Cabeçalho ----------
  fonte('bold', 26)
  cor(COR_TEXTO)
  doc.text('CRIARTERE', 75.7, 29.7, { align: 'center' })

  fonte('bold', 10)
  doc.text(`ORÇAMENTO Nº ${o.numero}`, 133.8, 24.3)
  fonte('normal', 10)
  cor(COR_CINZA)
  doc.text(dataBR(o.data), 133.8, 29)

  fonte('normal', 8.5)
  cor(COR_DESTAQUE)
  doc.text('ORÇAMENTO • PERSONALIZADOS & CRIATIVIDADE', MARGEM_ESQ + 2.3, 36.4)
  doc.setDrawColor(COR_DESTAQUE[0], COR_DESTAQUE[1], COR_DESTAQUE[2])
  doc.setLineWidth(0.35)
  doc.line(MARGEM_ESQ, 40, MARGEM_DIR, 40)

  // ---------- Dados do pedido ----------
  y = 53
  tituloSecao('DADOS DO PEDIDO')
  const meio = 105.7
  const alturaLinha = 17.2
  const campos: [string, string][] = [
    ['Cliente', o.clienteNome],
    ['Disponibilidade', o.disponibilidade || '—'],
    ['Status', NOMES_STATUS_ORCAMENTO[o.status]],
    ['Pagamento', o.formasPagamento || '—'],
  ]
  caixa(MARGEM_ESQ, y, LARGURA, alturaLinha * 2)
  linhaV(meio, y, y + alturaLinha * 2)
  linhaH(MARGEM_ESQ, MARGEM_DIR, y + alturaLinha)
  campos.forEach(([rotulo, valor], i) => {
    const x = i % 2 === 0 ? MARGEM_ESQ + 3.2 : meio + 3.2
    const yy = y + Math.floor(i / 2) * alturaLinha
    fonte('bold', 10)
    cor(COR_TEXTO)
    doc.text(rotulo, x, yy + 7.1)
    fonte('normal', 10)
    const texto = doc.splitTextToSize(valor, meio - MARGEM_ESQ - 6)[0] as string
    doc.text(texto, x, yy + 11.9)
  })
  y += alturaLinha * 2 + 9.2

  // ---------- Itens ----------
  tituloSecao('ITENS DO ORÇAMENTO')
  const col = [MARGEM_ESQ, 101.6, 119.7, 155.8, MARGEM_DIR]
  const pad = 3
  const cabecalhoTabela = () => {
    const h = 11.7
    caixa(MARGEM_ESQ, y, LARGURA, h)
    col.slice(1, 4).forEach((x) => linhaV(x, y, y + h))
    fonte('bold', 10)
    cor(COR_TEXTO)
    ;['Descrição', 'Qtd.', 'Valor unitário', 'Subtotal'].forEach((t, i) =>
      doc.text(t, col[i] + pad, y + 7.2),
    )
    y += h
  }
  cabecalhoTabela()
  const itens = o.itens.length ? o.itens : []
  itens.forEach((it) => {
    fonte('normal', 10)
    const linhas = doc.splitTextToSize(it.nome || '—', col[1] - col[0] - pad * 2) as string[]
    const h = Math.max(11.7, linhas.length * 4.6 + 7.1)
    if (novaPaginaSePreciso(h)) cabecalhoTabela()
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(COR_BORDA[0], COR_BORDA[1], COR_BORDA[2])
    doc.rect(MARGEM_ESQ, y, LARGURA, h, 'FD')
    col.slice(1, 4).forEach((x) => linhaV(x, y, y + h))
    fonte('normal', 10)
    cor(COR_TEXTO)
    doc.text(linhas, col[0] + pad, y + 7.2)
    cor(COR_CINZA)
    doc.text(qtd(it.quantidade), col[1] + pad, y + 7.2)
    cor(COR_TEXTO)
    doc.text(brl(it.valorUnitario), col[2] + pad, y + 7.2)
    fonte('bold', 10)
    doc.text(brl(it.subtotal), col[3] + pad, y + 7.2)
    y += h
  })
  y += 11

  // ---------- Pagamento ----------
  const linhasPagamento: { rotulo: string; valor: string; destaque?: boolean }[] = []
  if (o.valorFrete > 0 || o.valorDesconto > 0) {
    linhasPagamento.push({ rotulo: 'Subtotal dos itens', valor: brl(o.valorProdutos) })
    if (o.valorFrete > 0)
      linhasPagamento.push({ rotulo: 'Frete / entrega', valor: brl(o.valorFrete) })
    if (o.valorDesconto > 0)
      linhasPagamento.push({ rotulo: 'Desconto', valor: '- ' + brl(o.valorDesconto) })
  }
  if (o.tipoPagamento === 'sinal') {
    const sinal = Math.round(o.valorTotal * o.percentualSinal) / 100
    const pct = o.percentualSinal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
    linhasPagamento.push({ rotulo: 'Total do orçamento', valor: brl(o.valorTotal) })
    linhasPagamento.push({
      rotulo: `Sinal (${pct}%) para confirmar o pedido`,
      valor: brl(sinal),
      destaque: true,
    })
    linhasPagamento.push({ rotulo: 'Restante na entrega', valor: brl(o.valorTotal - sinal) })
  } else {
    linhasPagamento.push({ rotulo: 'Pagamento integral', valor: brl(o.valorTotal), destaque: true })
  }
  const alturasPag = linhasPagamento.map((l) => (l.destaque ? 12.1 : 9))
  novaPaginaSePreciso(3.4 + alturasPag.reduce((a, b) => a + b, 0))
  tituloSecao('PAGAMENTO')
  caixa(
    MARGEM_ESQ,
    y,
    LARGURA,
    alturasPag.reduce((a, b) => a + b, 0),
  )
  linhasPagamento.forEach((l, i) => {
    const h = alturasPag[i]
    if (i > 0) linhaH(MARGEM_ESQ, MARGEM_DIR, y)
    fonte(l.destaque ? 'bold' : 'normal', 10)
    cor(COR_TEXTO)
    doc.text(l.rotulo, MARGEM_ESQ + 3.2, y + h / 2 + 1.3)
    fonte('bold', l.destaque ? 15 : 10)
    doc.text(l.valor, MARGEM_DIR - 3.2, y + h / 2 + (l.destaque ? 2 : 1.3), { align: 'right' })
    y += h
  })
  y += 11

  // ---------- Observações ----------
  const obs = o.observacoes
    .split('\n')
    .map((l) => l.trim().replace(/^[•\-*]\s*/, ''))
    .filter(Boolean)
  if (opcoes.chavePix && !obs.some((l) => /^chave pix/i.test(l))) {
    obs.push(`Chave Pix: ${opcoes.chavePix}`)
  }
  if (obs.length) {
    fonte('normal', 10)
    const blocos = obs.map((l) => doc.splitTextToSize(`• ${l}`, LARGURA - 6) as string[])
    const alturaObs = blocos.reduce((s, b) => s + b.length * 4.8, 0) + 6
    novaPaginaSePreciso(3.4 + alturaObs)
    tituloSecao('OBSERVAÇÕES')
    caixa(MARGEM_ESQ, y, LARGURA, alturaObs, COR_FUNDO_CLARO)
    let yy = y + 6.2
    obs.forEach((linha, i) => {
      const pix = linha.match(/^(chave pix:\s*)(.+)$/i)
      cor(COR_TEXTO)
      if (pix && blocos[i].length === 1) {
        fonte('normal', 10)
        const prefixo = `• ${pix[1].trim()}`
        doc.text(prefixo, MARGEM_ESQ + 1.5, yy)
        const largura = doc.getTextWidth(prefixo + ' ')
        fonte('bold', 10)
        doc.text(pix[2], MARGEM_ESQ + 1.5 + largura, yy)
        yy += 4.8
      } else {
        fonte('normal', 10)
        doc.text(blocos[i], MARGEM_ESQ + 1.5, yy)
        yy += blocos[i].length * 4.8
      }
    })
    y += alturaObs + 12
  } else {
    y += 2
  }

  // ---------- Agradecimento ----------
  novaPaginaSePreciso(8)
  fonte('italic', 9.5)
  cor(COR_CINZA)
  doc.text(
    'Obrigada por escolher a Criartere. Feito com carinho, papel, criatividade e detalhes que tornam cada pedido único.',
    105,
    y,
    { align: 'center', maxWidth: LARGURA },
  )

  rodape()
  doc.setProperties({
    title: `Orçamento Nº ${o.numero} — Criartere`,
    subject: `Orçamento para ${o.clienteNome}`,
    author: 'Criartere',
  })
  return doc
}

/** Baixa o PDF no aparelho. */
export function baixarPdfOrcamento(o: Orcamento, chavePix?: string) {
  gerarPdfOrcamento(o, { chavePix }).save(nomeArquivoOrcamento(o))
}

/** Abre o compartilhamento do celular/computador (WhatsApp, e-mail...). Retorna false se não suportado. */
export async function compartilharPdfOrcamento(o: Orcamento, chavePix?: string): Promise<boolean> {
  const blob = gerarPdfOrcamento(o, { chavePix }).output('blob')
  const arquivo = new File([blob], nomeArquivoOrcamento(o), { type: 'application/pdf' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (!nav.share || !nav.canShare?.({ files: [arquivo] })) return false
  try {
    await nav.share({
      files: [arquivo],
      title: `Orçamento Nº ${o.numero} — Criartere`,
      text: `Olá, ${o.clienteNome.split(' ')[0]}! Segue o orçamento Nº ${o.numero} da Criartere.`,
    })
  } catch {
    // Usuário cancelou o compartilhamento
  }
  return true
}
