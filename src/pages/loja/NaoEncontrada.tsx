import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { useSeo } from '@/lib/seo'
import { EstadoVazio } from '@/loja/componentes'

/** Endereço inexistente dentro da loja (/loja/...) */
export default function NaoEncontrada() {
  useSeo({ titulo: 'Página não encontrada', indexar: false })
  return (
    <EstadoVazio
      icone={Compass}
      titulo="Página não encontrada"
      texto="Este endereço não existe ou mudou. Que tal voltar ao catálogo?"
      acao={
        <Link
          to="/loja"
          className="inline-flex h-10 px-5 items-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
        >
          Ver catálogo
        </Link>
      }
    />
  )
}
