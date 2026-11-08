/* Ícone "?" com uma explicação curta do recurso. Abre com clique/toque (funciona no celular). */
import { HelpCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DicaAjudaProps {
  titulo?: string
  children: React.ReactNode
  /** Âncora de um tópico da página Ajuda (ex.: "orcamentos") para o link "Saiba mais". */
  topico?: string
  className?: string
  lado?: 'top' | 'right' | 'bottom' | 'left'
}

export function DicaAjuda({ titulo, children, topico, className, lado = 'top' }: DicaAjudaProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full text-[#6B4B36]/60 hover:text-[#C48864] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] align-middle shrink-0 normal-case',
            className,
          )}
          aria-label={titulo ? `Ajuda: ${titulo}` : 'Ajuda'}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={lado}
        className="w-72 text-xs leading-relaxed text-[#6B4B36] bg-white border-[#DFC3AE] normal-case tracking-normal font-normal"
        onClick={(e) => e.stopPropagation()}
      >
        {titulo && <p className="font-serif font-bold text-sm text-[#0C1014] mb-1">{titulo}</p>}
        <div className="space-y-1.5">{children}</div>
        {topico && (
          <Link
            to={`/ajuda#${topico}`}
            className="inline-block mt-2 font-semibold text-[#C48864] hover:underline"
          >
            Saiba mais na Ajuda →
          </Link>
        )}
      </PopoverContent>
    </Popover>
  )
}
