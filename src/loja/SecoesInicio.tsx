/* Página inicial da loja: até 3 seções escolhidas no painel (Loja virtual → Página inicial).
   Cada seção é uma faixa horizontal de produtos: desliza com o dedo no celular e tem setas
   no computador. Seção por categoria termina com "Ver todos" (abre a categoria completa). */
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { OrdemSecao, SecaoInicio } from '@/types/criartere'
import type { ProdutoVitrine } from './api'
import { CardProduto } from './componentes'
import { FaixaComSetas } from './FaixaComSetas'
import { caminhoCategoria, produtoTemCategoria } from './seo-dados'

const MAX_POR_SECAO = 12

interface SecaoMontada {
  chave: string
  titulo: string
  produtos: ProdutoVitrine[]
  verTodos?: string // endereço da categoria completa
}

function ordenar(lista: ProdutoVitrine[], ordem: OrdemSecao = 'novidades') {
  const desconto = (p: ProdutoVitrine) =>
    p.precoOriginal > p.preco ? 1 - p.preco / p.precoOriginal : 0
  return [...lista].sort((a, b) => {
    if (ordem === 'menor_preco') return a.preco - b.preco
    if (ordem === 'maior_preco') return b.preco - a.preco
    if (ordem === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR')
    if (ordem === 'promocao') {
      const d = desconto(b) - desconto(a)
      if (d !== 0) return d
    }
    return b.criadoEm.localeCompare(a.criadoEm)
  })
}

/** Transforma a configuração em seções prontas (as vazias não aparecem). Sem configuração,
 *  mostra as 3 categorias com mais produtos. */
export function montarSecoes(secoes: SecaoInicio[], produtos: ProdutoVitrine[]): SecaoMontada[] {
  let config = secoes.slice(0, 3)
  if (config.length === 0) {
    const contagem = new Map<string, number>()
    for (const p of produtos) contagem.set(p.categoria, (contagem.get(p.categoria) ?? 0) + 1)
    config = [...contagem.entries()]
      .filter(([c]) => c.trim())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([categoria]) => ({ tipo: 'categoria', categoria, ordem: 'novidades' }))
  }

  return config
    .map((s, i): SecaoMontada | null => {
      if (s.tipo === 'produtos') {
        const porId = new Map(produtos.map((p) => [p.id, p]))
        const lista = (s.produtoIds ?? [])
          .map((id) => porId.get(id))
          .filter((p): p is ProdutoVitrine => Boolean(p))
          .slice(0, MAX_POR_SECAO)
        return lista.length
          ? { chave: `s${i}`, titulo: s.titulo?.trim() || 'Destaques', produtos: lista }
          : null
      }
      if (!s.categoria) return null
      const daCategoria = produtos.filter((p) => produtoTemCategoria(p, s.categoria!))
      if (daCategoria.length === 0) return null
      return {
        chave: `s${i}`,
        titulo: s.titulo?.trim() || s.categoria,
        produtos: ordenar(daCategoria, s.ordem).slice(0, MAX_POR_SECAO),
        verTodos: caminhoCategoria(s.categoria),
      }
    })
    .filter((s): s is SecaoMontada => s !== null)
}

export function SecoesInicio({
  secoes,
  produtos,
}: {
  secoes: SecaoInicio[]
  produtos: ProdutoVitrine[]
}) {
  // Se as seções escolhidas ficarem todas vazias (ex.: produtos despublicados),
  // mostra as categorias com mais produtos em vez de deixar a página sem nada
  const escolhidas = montarSecoes(secoes, produtos)
  const montadas = escolhidas.length ? escolhidas : montarSecoes([], produtos)
  return (
    <div className="space-y-10 sm:space-y-12">
      {montadas.map((s) => (
        <FaixaProdutos key={s.chave} {...s} />
      ))}
    </div>
  )
}

/** Faixa horizontal de produtos com setas (computador) e arraste (celular). */
function FaixaProdutos({ chave, titulo, produtos, verTodos }: SecaoMontada) {
  const idTitulo = `secao-inicio-${chave}`
  return (
    <section aria-labelledby={idTitulo} className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id={idTitulo} className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C1014]">
          {titulo}
        </h2>
        {verTodos && (
          <Link
            to={verTodos}
            aria-label={`Ver todos os produtos de ${titulo}`}
            className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-[#A5683F] hover:text-[#8C5636] hover:underline underline-offset-4"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      <FaixaComSetas
        quantidade={produtos.length}
        rotuloVoltar={`Produtos anteriores de ${titulo}`}
        rotuloAvancar={`Mais produtos de ${titulo}`}
        alturaSetas="top-[38%]"
      >
        {produtos.map((p) => (
          <div
            key={p.id}
            className="shrink-0 snap-start w-[72%] min-[440px]:w-[46%] sm:w-[260px] xl:w-[280px] flex"
          >
            <div className="w-full flex flex-col [&>article]:flex-1">
              <CardProduto produto={p} />
            </div>
          </div>
        ))}
      </FaixaComSetas>
    </section>
  )
}
