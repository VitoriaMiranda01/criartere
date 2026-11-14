/* Dados de SEO da loja, compartilhados entre o site (navegador) e o build
   (vite.config.ts, que pré-gera as páginas). Não use APIs do navegador aqui. */

export const SITE = 'https://criartere.com.br'
export const NOME_LOJA = 'Criartere'
export const SUFIXO_TITULO = 'Criartere — Impressão 3D e Gráfica'
export const IMAGEM_PADRAO = `${SITE}/og-image.png`
export const DESCRICAO_LOJA =
  'Loja virtual da Criartere: peças em impressão 3D, papelaria e personalizados feitos com carinho. ' +
  'Veja preços, salve favoritos e encomende pelo WhatsApp.'

export interface ProdutoSeo {
  id: string
  nome: string
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

export function jsonLdCatalogo(produtos: ProdutoSeo[], contato?: ContatoSeo) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      jsonLdLoja(contato),
      {
        '@type': 'CollectionPage',
        name: 'Catálogo Criartere',
        url: `${SITE}/`,
        inLanguage: 'pt-BR',
        description: DESCRICAO_LOJA,
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
