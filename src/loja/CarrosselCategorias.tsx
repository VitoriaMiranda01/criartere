/* Cards de categoria da página inicial: foto em pé com o nome por cima.
   Aparecem as categorias marcadas no painel ("Mostrar nos cards da página inicial"),
   na ordem do cadastro, e só se tiverem produtos na loja. A foto é a cadastrada no
   painel; sem ela, a do produto mais recente da categoria. */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { ProdutoVitrine } from './api'
import { FaixaComSetas } from './FaixaComSetas'
import { caminhoCategoria, produtoTemCategoria } from './seo-dados'

interface CardCategoria {
  nome: string
  foto?: string
  quantidade: number
}

export function montarCardsCategorias(
  categoriasLoja: { nome: string; imagemUrl?: string; mostrarNaInicio: boolean }[],
  produtos: ProdutoVitrine[],
): CardCategoria[] {
  const recentes = [...produtos].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
  return categoriasLoja
    .filter((c) => c.mostrarNaInicio && c.nome.trim())
    .map((c) => {
      const nome = c.nome.trim()
      const daCategoria = recentes.filter((p) => produtoTemCategoria(p, nome))
      return {
        nome,
        foto: c.imagemUrl || daCategoria.find((p) => p.imagemUrl)?.imagemUrl,
        quantidade: daCategoria.length,
      }
    })
    .filter((c) => c.quantidade > 0)
}

export function CarrosselCategorias({
  categoriasLoja,
  produtos,
}: {
  categoriasLoja: { nome: string; imagemUrl?: string; mostrarNaInicio: boolean }[]
  produtos: ProdutoVitrine[]
}) {
  const cards = useMemo(
    () => montarCardsCategorias(categoriasLoja, produtos),
    [categoriasLoja, produtos],
  )
  if (cards.length === 0) return null

  return (
    <section aria-labelledby="titulo-categorias" className="space-y-4">
      <h2
        id="titulo-categorias"
        className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C1014]"
      >
        Categorias
      </h2>
      <FaixaComSetas
        quantidade={cards.length}
        rotuloVoltar="Categorias anteriores"
        rotuloAvancar="Mais categorias"
      >
        {cards.map((c) => (
          <Link
            key={c.nome}
            to={caminhoCategoria(c.nome)}
            className="group shrink-0 snap-start w-[44%] min-[440px]:w-[31%] sm:w-[200px] lg:w-[220px] rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F3EA]"
          >
            <CardFoto {...c} />
          </Link>
        ))}
      </FaixaComSetas>
    </section>
  )
}

function CardFoto({ nome, foto, quantidade }: CardCategoria) {
  const [falhou, setFalhou] = useState(false)
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-[#DFC3AE]/60 bg-[#F1E6DC] shadow-xs transition-shadow group-hover:shadow-[0_10px_30px_rgba(12,16,20,0.12)]"
      // (o plugin de proporção do Tailwind desativa as classes aspect-*)
      style={{ aspectRatio: '3 / 4' }}
    >
      {foto && !falhou ? (
        <img
          src={foto}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFalhou(true)}
          className="absolute inset-0 w-full h-full object-cover select-none transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        // Sem foto: fundo nas cores da marca com a inicial
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#DFC3AE] via-[#C48864] to-[#A5683F]"
          aria-hidden="true"
        >
          <span className="font-serif text-6xl font-semibold text-white/35">
            {nome.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      {/* Escurece a parte de baixo para o nome ficar legível sobre qualquer foto */}
      <div
        className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0C1014]/85 via-[#0C1014]/35 to-transparent"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
        <p className="font-serif text-lg sm:text-xl font-semibold leading-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
          {nome}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[#F7F3EA]/85">
          {quantidade} {quantidade === 1 ? 'produto' : 'produtos'}
          <ArrowRight
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </p>
      </div>
    </div>
  )
}
