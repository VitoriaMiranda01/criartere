import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import { useLoja } from '@/loja/LojaContext'
import { CardProduto, CarregandoLoja, EstadoVazio } from '@/loja/componentes'
import { PrecisaEntrar } from './PrecisaEntrar'

export default function Favoritos() {
  useTituloPagina('Meus favoritos')
  const { usuario, sessaoVerificada, favoritos, produtos, carregandoProdutos, carregandoConta } =
    useLoja()

  if (!sessaoVerificada) return <CarregandoLoja />
  if (!usuario) {
    return (
      <PrecisaEntrar
        icone={Heart}
        titulo="Seus favoritos ficam salvos na sua conta"
        texto="Entre ou crie sua conta para guardar os produtos de que mais gostou."
      />
    )
  }
  if (carregandoProdutos || (carregandoConta && favoritos.size === 0)) return <CarregandoLoja />

  const lista = produtos.filter((p) => favoritos.has(p.id))
  const indisponiveis = favoritos.size - lista.length

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Meus favoritos</h1>
        <p className="text-sm text-[#6B4B36] mt-1">
          {lista.length === 0
            ? 'Nenhum produto salvo ainda.'
            : `${lista.length} ${lista.length === 1 ? 'produto salvo' : 'produtos salvos'}`}
        </p>
      </header>

      {lista.length === 0 ? (
        <EstadoVazio
          icone={Heart}
          titulo="Sua lista de favoritos está vazia"
          texto="Toque no coração de um produto para guardá-lo aqui."
          acao={
            <Link
              to="/loja"
              className="inline-flex h-10 px-5 items-center rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
            >
              Explorar o catálogo
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {lista.map((p) => (
            <CardProduto key={p.id} produto={p} />
          ))}
        </div>
      )}

      {indisponiveis > 0 && (
        <p className="text-xs text-[#6B4B36]">
          {indisponiveis === 1
            ? '1 produto favoritado não está mais disponível na loja.'
            : `${indisponiveis} produtos favoritados não estão mais disponíveis na loja.`}
        </p>
      )}
    </div>
  )
}
