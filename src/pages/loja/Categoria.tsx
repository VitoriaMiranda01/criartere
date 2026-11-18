import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useLoja } from '@/loja/LojaContext'
import { RefreshCw } from 'lucide-react'
import { CarregandoLoja, EstadoVazio } from '@/loja/componentes'
import { categoriaDoSlug, categoriasDoProduto } from '@/loja/seo-dados'
import Catalogo from './Catalogo'
import NaoEncontrada from './NaoEncontrada'

/** /categoria/<nome>: toda categoria cadastrada no painel (ou usada em algum produto)
 *  ganha a sua própria tela automaticamente. */
export default function Categoria() {
  const { slug } = useParams()
  const {
    categoriasLoja,
    produtos,
    carregandoProdutos,
    carregandoCategorias,
    erroProdutos,
    recarregarVitrine,
  } = useLoja()

  const categoria = useMemo(
    () =>
      categoriaDoSlug(slug, [
        ...categoriasLoja.map((c) => c.nome),
        ...produtos.flatMap(categoriasDoProduto),
      ]),
    [slug, categoriasLoja, produtos],
  )

  if (!categoria) {
    // Ainda carregando a lista: espera antes de dizer que não existe
    if (carregandoCategorias || carregandoProdutos) return <CarregandoLoja />
    // Sem conexão não dá para saber se a categoria existe: oferece tentar de novo
    if (erroProdutos)
      return (
        <EstadoVazio
          icone={RefreshCw}
          titulo="Não foi possível carregar esta categoria"
          texto="Verifique sua conexão com a internet e tente de novo."
          acao={
            <button
              type="button"
              onClick={() => recarregarVitrine()}
              className="h-10 px-5 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold"
            >
              Tentar de novo
            </button>
          }
        />
      )
    return <NaoEncontrada />
  }
  return <Catalogo key={categoria} categoriaFixa={categoria} />
}
