/* Dados de SEO da loja, compartilhados entre o site (navegador) e o build
   (vite.config.ts, que pré-gera as páginas). Não use APIs do navegador aqui. */

export const SITE = 'https://criartere.com.br'
export const NOME_LOJA = 'Criartere'
export const SUFIXO_TITULO = 'Criartere — Impressão 3D e Gráfica'
export const IMAGEM_PADRAO = `${SITE}/og-image.png`
export const DESCRICAO_LOJA =
  'Loja virtual da Criartere: peças em impressão 3D, papelaria e personalizados feitos com carinho. ' +
  'Veja preços, salve favoritos e encomende pelo WhatsApp.'

/** Linhas da loja: cada uma é uma aba ("Catálogo 3D", "Catálogo Papelaria") com as suas categorias. */
export type LinhaCatalogo = '3d' | 'papelaria'

export const LINHAS_CATALOGO: Record<
  LinhaCatalogo,
  {
    menu: string
    caminho: string
    titulo: string
    tituloSeo: string
    descricao: string
    categorias: string[]
  }
> = {
  '3d': {
    menu: 'Catálogo 3D',
    caminho: '/impressao-3d',
    titulo: 'Catálogo 3D',
    tituloSeo: 'Catálogo de impressão 3D: decoração, miniaturas e peças',
    descricao:
      'Peças em impressão 3D feitas camada por camada: decoração, miniaturas, colecionáveis e peças técnicas.',
    categorias: ['Impressão 3D', 'Miniaturas e colecionáveis', 'Peças técnicas e protótipos'],
  },
  papelaria: {
    menu: 'Catálogo Papelaria',
    caminho: '/papelaria',
    titulo: 'Catálogo Papelaria',
    tituloSeo: 'Catálogo de papelaria: cartões, adesivos e impressos',
    descricao:
      'Papelaria personalizada: cartões, convites, adesivos, placas e impressos com acabamento caprichado.',
    categorias: ['Cartões e papelaria', 'Banners, adesivos e placas'],
  },
}

/** Página "Sobre nós" (o texto vem do painel; estes são os valores padrão). */
export const PAGINA_SOBRE = {
  menu: 'Sobre nós',
  caminho: '/sobre',
  titulo: 'Sobre nós',
  descricao:
    'Conheça a Criartere: como a loja nasceu e como criamos peças em impressão 3D e papelaria personalizada com carinho.',
}

/** Produtos de uma linha (comparação sem diferenciar maiúsculas e espaços). */
/** Categoria (em minúsculas) → aba da loja, como cadastrado no painel. */
export type MapaLinhas = Map<string, LinhaCatalogo | null>

export const mapaDeLinhas = (lista: { nome: string; linha?: string | null }[]): MapaLinhas =>
  new Map(
    lista.map((c) => [
      c.nome.trim().toLowerCase(),
      c.linha === '3d' || c.linha === 'papelaria' ? c.linha : null,
    ]),
  )

/** Tela de uma categoria: a aba dela (Catálogo 3D / Papelaria) já filtrada; categoria
 *  sem aba abre no início da loja, também filtrada. */
export function caminhoCategoria(categoria: string, mapa?: MapaLinhas) {
  const linha = mapa?.get(categoria.trim().toLowerCase())
  const base = linha ? LINHAS_CATALOGO[linha].caminho : '/'
  return `${base}?categoria=${encodeURIComponent(categoria)}`
}

/** Todas as categorias do produto: a principal e as outras. */
export const categoriasDoProduto = (p: { categoria: string; outrasCategorias?: string[] }) =>
  [p.categoria, ...(p.outrasCategorias ?? [])].map((c) => c.trim()).filter(Boolean)

/** O produto está nesta categoria (principal ou outra)? */
export const produtoTemCategoria = (
  p: { categoria: string; outrasCategorias?: string[] },
  categoria: string,
) => categoriasDoProduto(p).some((c) => c.toLowerCase() === categoria.trim().toLowerCase())

/** O produto aparece nesta aba (por qualquer uma das suas categorias)? */
export const produtoNaLinha = (
  p: { categoria: string; outrasCategorias?: string[] },
  linha: LinhaCatalogo,
  mapa?: MapaLinhas,
) => categoriasDoProduto(p).some((c) => produtoDaLinha(c, linha, mapa))

/** O produto desta categoria aparece nesta aba? Usa o cadastro do painel; se a categoria
 *  não estiver lá (ou o cadastro não carregou), usa a divisão padrão. */
export function produtoDaLinha(categoria: string, linha: LinhaCatalogo, mapa?: MapaLinhas) {
  const chave = categoria.trim().toLowerCase()
  if (mapa?.has(chave)) return mapa.get(chave) === linha
  return LINHAS_CATALOGO[linha].categorias.some((c) => c.toLowerCase() === chave)
}

export interface ProdutoSeo {
  id: string
  nome: string
  outrasCategorias?: string[]
  descricao: string
  preco: number
  categoria: string
  imagemUrl?: string
  imagens?: string[]
  disponibilidade: 'pronta_entrega' | 'sob_encomenda'
}

export interface ContatoSeo {
  whatsapp?: string
  instagram?: string
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** "Vaso Geométrico 15cm" → "vaso-geometrico-15cm" */
export function slug(texto: string): string {
  return (
    (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '') || 'produto'
  )
}

/** Endereço amigável do produto: /produto/vaso-geometrico-<id> */
export const caminhoProduto = (p: { id: string; nome: string }) =>
  `/produto/${slug(p.nome)}-${p.id}`

/** Aceita tanto o endereço novo (nome-id) quanto o antigo (só o id). */
export function idDoCaminho(parametro: string | undefined): string {
  const m = (parametro || '').match(UUID)
  return m ? m[0].toLowerCase() : parametro || ''
}

export const formatarPrecoSeo = (v: number) =>
  'R$ ' +
  (v || 0)
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const limitar = (t: string, n: number) => {
  const limpo = (t || '').replace(/\s+/g, ' ').trim()
  return limpo.length <= n ? limpo : limpo.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}

export function descricaoProduto(p: ProdutoSeo): string {
  const base = p.descricao
    ? limitar(p.descricao, 110)
    : `${p.nome}${p.categoria ? ` — ${p.categoria}` : ''}.`
  const disp = p.disponibilidade === 'pronta_entrega' ? 'Pronta entrega' : 'Sob encomenda'
  return limitar(`${base} ${formatarPrecoSeo(p.preco)} · ${disp} · Criartere.`, 160)
}

const numeroTelefone = (bruto?: string) => {
  const d = (bruto || '').replace(/\D/g, '')
  if (!d) return undefined
  return '+' + (d.length === 10 || d.length === 11 ? '55' + d : d)
}

const linkInstagram = (bruto?: string) => {
  const i = (bruto || '').replace(/^@/, '').trim()
  if (!i) return undefined
  return i.startsWith('http') ? i : `https://instagram.com/${i}`
}

/** Dados estruturados da loja (Google: nome, logo, contatos) */
export function jsonLdLoja(contato?: ContatoSeo) {
  const telefone = numeroTelefone(contato?.whatsapp)
  const instagram = linkInstagram(contato?.instagram)
  return {
    '@type': 'Store',
    '@id': `${SITE}/#loja`,
    name: NOME_LOJA,
    description: DESCRICAO_LOJA,
    url: `${SITE}/`,
    logo: `${SITE}/logo.png`,
    image: IMAGEM_PADRAO,
    currenciesAccepted: 'BRL',
    ...(telefone ? { telephone: telefone } : {}),
    ...(instagram ? { sameAs: [instagram] } : {}),
  }
}

export function jsonLdProduto(p: ProdutoSeo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE}${caminhoProduto(p)}#produto`,
    name: p.nome,
    description: p.descricao || p.nome,
    image: p.imagens?.length ? p.imagens : [p.imagemUrl || IMAGEM_PADRAO],
    sku: p.id,
    ...(p.categoria ? { category: p.categoria } : {}),
    brand: { '@type': 'Brand', name: NOME_LOJA },
    offers: {
      '@type': 'Offer',
      url: `${SITE}${caminhoProduto(p)}`,
      priceCurrency: 'BRL',
      price: (p.preco || 0).toFixed(2),
      availability:
        p.disponibilidade === 'pronta_entrega'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/MadeToOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: NOME_LOJA, url: `${SITE}/` },
    },
  }
}

export function jsonLdCatalogo(
  produtos: ProdutoSeo[],
  contato?: ContatoSeo,
  pagina: { nome: string; caminho: string; descricao: string } = {
    nome: 'Catálogo Criartere',
    caminho: '/',
    descricao: DESCRICAO_LOJA,
  },
) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      jsonLdLoja(contato),
      {
        '@type': 'CollectionPage',
        name: pagina.nome,
        url: `${SITE}${pagina.caminho}`,
        inLanguage: 'pt-BR',
        description: pagina.descricao,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: produtos.length,
          itemListElement: produtos.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE}${caminhoProduto(p)}`,
            name: p.nome,
          })),
        },
      },
    ],
  }
}

/** JSON seguro para colocar dentro de <script type="application/ld+json"> */
export const jsonSeguro = (dados: unknown) =>
  JSON.stringify(dados).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')
