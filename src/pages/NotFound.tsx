/* Página 404: exibida quando o endereço não existe */
import { Link } from 'react-router-dom'
import { useTituloPagina } from '@/hooks/use-titulo-pagina'

const NotFound = () => {
  useTituloPagina('Página não encontrada', { indexar: false })

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F3EA] p-6">
      <div className="text-center space-y-4 max-w-sm">
        <img src="/logo.png" alt="Logo Criartere" className="w-16 h-16 mx-auto" />
        <h1 className="font-serif text-5xl font-bold text-[#0C1014]">404</h1>
        <p className="text-base text-[#6B4B36]">
          Ops! Esta página não existe ou mudou de endereço.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-medium"
        >
          Voltar para o início
        </Link>
      </div>
    </main>
  )
}

export default NotFound
