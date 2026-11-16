/* Abas no topo das telas que formam uma seção do painel (ex.: Loja virtual =
   Banners · Sobre nós · Categorias). Cada aba é um endereço próprio, então os
   links antigos continuam funcionando e o menu lateral mostra um item só. */
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BookHeart, Images, Tags, Wallet, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface AbaSecao {
  rotulo: string
  caminho: string
  icone: LucideIcon
}

export const SECAO_LOJA_VIRTUAL: AbaSecao[] = [
  { rotulo: 'Banners', caminho: '/admin/banners', icone: Images },
  { rotulo: 'Sobre nós', caminho: '/admin/sobre', icone: BookHeart },
  { rotulo: 'Categorias', caminho: '/admin/categorias', icone: Tags },
]

export const SECAO_FINANCEIRO: AbaSecao[] = [
  { rotulo: 'Recebimentos e despesas', caminho: '/admin/financeiro', icone: Wallet },
  { rotulo: 'Fluxo de caixa', caminho: '/admin/fluxo-de-caixa', icone: ArrowLeftRight },
]

export function AbasSecao({ abas, rotulo }: { abas: AbaSecao[]; rotulo: string }) {
  return (
    <nav
      aria-label={rotulo}
      className="flex gap-1 overflow-x-auto sem-barra border-b border-[#DFC3AE]/70 -mt-1"
    >
      {abas.map((aba) => (
        <NavLink
          key={aba.caminho}
          to={aba.caminho}
          className={({ isActive }) =>
            cn(
              'shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap',
              isActive
                ? 'border-[#A5683F] text-[#94603D]'
                : 'border-transparent text-[#6B4B36] hover:text-[#0C1014] hover:border-[#DFC3AE]',
            )
          }
        >
          <aba.icone className="w-4 h-4" />
          {aba.rotulo}
        </NavLink>
      ))}
    </nav>
  )
}
