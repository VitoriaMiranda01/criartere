/* Faixa horizontal que rola: setas nas laterais no computador e arraste com o dedo no
   celular (com encaixe em cada item). Usada nas seções de produtos e nos cards de
   categoria da página inicial. */
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FaixaComSetas({
  children,
  quantidade,
  rotuloVoltar,
  rotuloAvancar,
  alturaSetas = 'top-1/2',
  className,
}: {
  children: ReactNode
  /** Número de itens (as setas são recalculadas quando muda) */
  quantidade: number
  rotuloVoltar: string
  rotuloAvancar: string
  /** Posição vertical das setas (ex.: no meio da foto, e não do card inteiro) */
  alturaSetas?: string
  className?: string
}) {
  const faixa = useRef<HTMLDivElement>(null)
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(false)

  const atualizarSetas = useCallback(() => {
    const el = faixa.current
    if (!el) return
    setPodeVoltar(el.scrollLeft > 4)
    setPodeAvancar(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    atualizarSetas()
    window.addEventListener('resize', atualizarSetas)
    return () => window.removeEventListener('resize', atualizarSetas)
  }, [quantidade, atualizarSetas])

  const rolar = (direcao: -1 | 1) =>
    faixa.current?.scrollBy({
      left: direcao * faixa.current.clientWidth * 0.85,
      behavior: 'smooth',
    })

  const seta = (direcao: -1 | 1, visivel: boolean) => (
    <button
      type="button"
      onClick={() => rolar(direcao)}
      // Seta escondida também sai da navegação pelo teclado
      disabled={!visivel}
      aria-label={direcao < 0 ? rotuloVoltar : rotuloAvancar}
      className={cn(
        'hidden sm:flex absolute -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full bg-white border border-[#DFC3AE] text-[#0C1014] shadow-md transition-opacity hover:border-[#C48864]',
        alturaSetas,
        direcao < 0 ? '-left-4' : '-right-4',
        visivel ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {direcao < 0 ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>
  )

  return (
    <div className="relative">
      {seta(-1, podeVoltar)}
      <div
        ref={faixa}
        onScroll={atualizarSetas}
        className={cn(
          // scroll-px: o encaixe respeita a margem lateral (o 1º item não cola na borda no celular)
          'flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory sem-barra -mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 pb-2',
          className,
        )}
      >
        {children}
      </div>
      {seta(1, podeAvancar)}
    </div>
  )
}
