/* Slides de novidades e promoções no topo do catálogo.
   Imagem para computador (16:5) e para celular (quadrada); troca sozinho a cada
   6 segundos, pausa com o mouse em cima, aceita arrastar no celular e respeita
   quem prefere menos movimento. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BannerLoja, ProdutoVitrine } from './api'
import { caminhoCategoria, caminhoProduto, MapaLinhas } from './seo-dados'

const INTERVALO = 6000

function destinoDoBanner(
  b: BannerLoja,
  produtos: ProdutoVitrine[],
  mapa?: MapaLinhas,
): string | null {
  if (b.destinoTipo === 'categoria' && b.destinoValor) return caminhoCategoria(b.destinoValor, mapa)
  if (b.destinoTipo === 'produto' && b.destinoValor) {
    const p = produtos.find((x) => x.id === b.destinoValor)
    return p ? caminhoProduto(p) : `/produto/${b.destinoValor}`
  }
  return null
}

export function CarrosselBanners({
  banners,
  produtos,
  mapa,
}: {
  banners: BannerLoja[]
  produtos: ProdutoVitrine[]
  /** Categoria → aba da loja, para o banner abrir a tela certa da categoria */
  mapa?: MapaLinhas
}) {
  const [atual, setAtual] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [poucoMovimento, setPoucoMovimento] = useState(false)
  const toqueInicio = useRef<number | null>(null)
  const arrastou = useRef(false)
  const total = banners.length

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const aplicar = () => setPoucoMovimento(mq.matches)
    aplicar()
    mq.addEventListener('change', aplicar)
    return () => mq.removeEventListener('change', aplicar)
  }, [])

  // Se a lista mudar e o slide atual não existir mais, volta ao primeiro
  useEffect(() => {
    if (atual >= total) setAtual(0)
  }, [atual, total])

  const irPara = useCallback((i: number) => setAtual(((i % total) + total) % total), [total])

  // Troca automática (reinicia a contagem sempre que o slide muda)
  useEffect(() => {
    if (total < 2 || pausado || poucoMovimento) return
    const t = setTimeout(() => irPara(atual + 1), INTERVALO)
    return () => clearTimeout(t)
  }, [atual, total, pausado, poucoMovimento, irPara])

  if (total === 0) return null

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Novidades e promoções"
      className="relative overflow-hidden rounded-3xl border border-[#DFC3AE]/60 bg-[#F7F3EA] group/carrossel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      onTouchStart={(e) => {
        toqueInicio.current = e.touches[0].clientX
        arrastou.current = false
        setPausado(true)
      }}
      onTouchEnd={(e) => {
        const inicio = toqueInicio.current
        toqueInicio.current = null
        setPausado(false)
        if (inicio === null || total < 2) return
        const dx = e.changedTouches[0].clientX - inicio
        if (Math.abs(dx) > 40) {
          arrastou.current = true
          irPara(atual + (dx < 0 ? 1 : -1))
        }
      }}
    >
      <div
        className={cn(
          'flex',
          !poucoMovimento && 'transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)]',
        )}
        style={{ transform: `translateX(-${atual * 100}%)` }}
      >
        {banners.map((b, i) => {
          const destino = destinoDoBanner(b, produtos, mapa)
          const visivel = i === atual
          const imagem = (
            <picture>
              <source media="(min-width: 640px)" srcSet={b.imagemComputador} />
              <img
                src={b.imagemCelular}
                alt={b.titulo}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
                draggable={false}
                className="w-full h-full object-cover select-none"
              />
            </picture>
          )
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${total}: ${b.titulo}`}
              aria-hidden={!visivel}
              inert={!visivel}
              className="w-full shrink-0 aspect-square sm:aspect-[16/5]"
            >
              {destino ? (
                <Link
                  to={destino}
                  onClick={(e) => {
                    // Um arraste no celular não deve abrir o link
                    if (arrastou.current) {
                      e.preventDefault()
                      arrastou.current = false
                    }
                  }}
                  className="block w-full h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#C48864]"
                >
                  {imagem}
                </Link>
              ) : (
                imagem
              )}
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => irPara(atual - 1)}
            aria-label="Slide anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm text-[#0C1014] shadow-md opacity-0 group-hover/carrossel:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => irPara(atual + 1)}
            aria-label="Próximo slide"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm text-[#0C1014] shadow-md opacity-0 group-hover/carrossel:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/25 backdrop-blur-sm">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => irPara(i)}
                aria-label={`Ir para o slide ${i + 1}`}
                aria-current={i === atual}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i === atual ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/90',
                )}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
