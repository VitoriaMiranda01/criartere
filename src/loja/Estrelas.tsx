/* Estrelas de avaliação: exibição (com meia estrela pela média) e escolha da nota
   (grupo de opções acessível: setas do teclado mudam a nota). */
import { KeyboardEvent, useRef } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const COR = '#C48864'

/** Estrelas só para ver. `rotulo` vai para leitores de tela (ex.: "4 de 5 estrelas"). */
export function Estrelas({
  nota,
  tamanho = 'w-4 h-4',
  rotulo,
  className,
}: {
  nota: number
  tamanho?: string
  rotulo?: string
  className?: string
}) {
  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      // rotulo="" = só decorativa (o texto ao lado já diz a nota)
      role={rotulo === '' ? undefined : 'img'}
      aria-hidden={rotulo === '' || undefined}
      aria-label={rotulo || `${String(nota).replace('.', ',')} de 5 estrelas`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        // Parte preenchida desta estrela (0 a 1), para mostrar médias como 4,5
        const cheia = Math.max(0, Math.min(1, nota - (i - 1)))
        return (
          <span key={i} className={cn('relative inline-block', tamanho)} aria-hidden="true">
            <Star className={cn('absolute inset-0 text-[#DFC3AE]', tamanho)} strokeWidth={1.5} />
            {cheia > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${cheia * 100}%` }}
              >
                <Star className={tamanho} fill={COR} color={COR} strokeWidth={1.5} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

/** Escolha da nota: 5 estrelas como grupo de opções (Tab entra, setas mudam). */
export function EscolherEstrelas({
  valor,
  onChange,
  idRotulo,
  invalido,
}: {
  valor: number
  onChange: (nota: number) => void
  /** id do texto que nomeia o grupo (ex.: "Sua nota") */
  idRotulo: string
  invalido?: boolean
}) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([])
  const mover = (nota: number) => {
    const n = Math.max(1, Math.min(5, nota))
    onChange(n)
    botoes.current[n - 1]?.focus()
  }
  const teclado = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      mover((valor || 0) + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      mover((valor || 2) - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      mover(1)
    } else if (e.key === 'End') {
      e.preventDefault()
      mover(5)
    }
  }
  return (
    <div
      role="radiogroup"
      aria-labelledby={idRotulo}
      aria-invalid={invalido || undefined}
      className="inline-flex items-center gap-1"
      onKeyDown={teclado}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const marcada = n <= valor
        return (
          <button
            key={n}
            ref={(el) => {
              botoes.current[n - 1] = el
            }}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={n === 1 ? '1 estrela' : `${n} estrelas`}
            // Só a estrela escolhida (ou a primeira) entra na ordem do Tab
            tabIndex={valor ? (valor === n ? 0 : -1) : n === 1 ? 0 : -1}
            onClick={() => onChange(n)}
            className="p-1 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] transition-transform hover:scale-110"
          >
            <Star
              className="w-7 h-7"
              strokeWidth={1.5}
              fill={marcada ? COR : 'transparent'}
              color={marcada ? COR : '#DFC3AE'}
            />
          </button>
        )
      })}
    </div>
  )
}
