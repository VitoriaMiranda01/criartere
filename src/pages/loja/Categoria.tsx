import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja } from '@/loja/componentes'
import { categoriaDoSlug, categoriasDoProduto } from '@/loja/seo-dados'
import Catalogo from './Catalogo'
import NaoEncontrada from './NaoEncontrada'

/** /categoria/<nome>: toda categoria cadastrada no painel (ou usada em algum produto)
 *  ganha a sua própria tela automaticamente. */
export default function Categoria() {
  const { slug } = useParams()
  const { categoriasLoja, produtos, carregandoProdutos, carregandoCategorias } = useLoja()

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
    return <NaoEncontrada />
  }
  return <Catalogo key={categoria} categoriaFixa={categoria} />
}
