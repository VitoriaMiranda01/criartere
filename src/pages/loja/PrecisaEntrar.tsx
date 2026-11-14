import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EstadoVazio } from '@/loja/componentes'

/** Aviso para visitantes em páginas que exigem conta (favoritos e carrinho). */
export function PrecisaEntrar({
  icone,
  titulo,
  texto,
}: {
  icone: ComponentType<{ className?: string }>
  titulo: string
  texto: string
}) {
  const location = useLocation()
  return (
    <EstadoVazio
      icone={icone}
      titulo={titulo}
      texto={texto}
      acao={
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            to="/loja/entrar"
            state={{ voltarPara: location.pathname }}
            className="inline-flex h-10 px-5 items-center justify-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
          >
            Entrar
          </Link>
          <Link
            to="/loja/entrar"
            state={{ voltarPara: location.pathname, modo: 'cadastrar' }}
            className="inline-flex h-10 px-5 items-center justify-center rounded-lg border border-[#DFC3AE] bg-white text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
          >
            Criar conta
          </Link>
        </div>
      }
    />
  )
}
