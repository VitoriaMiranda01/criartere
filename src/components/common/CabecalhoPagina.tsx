/* Título, ajuda "?" e descrição de cada tela, exibidos na barra fixa do topo
   (computador) e no início do conteúdo (celular). Cada página declara o seu
   cabeçalho com <CabecalhoPagina /> e o Layout reserva os espaços. */
import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Espacos {
  computador: HTMLElement | null
  celular: HTMLElement | null
}

export const EspacosCabecalho = createContext<Espacos>({ computador: null, celular: null })

interface Props {
  titulo: string
  descricao?: ReactNode
  /** Um <DicaAjuda /> exibido ao lado do título. */
  ajuda?: ReactNode
}

function Conteudo({ titulo, descricao, ajuda, tamanho }: Props & { tamanho: string }) {
  return (
    <div className="min-w-0">
      <h1 className={`font-serif font-bold text-[#0C1014] flex items-center gap-1.5 ${tamanho}`}>
        <span className="truncate">{titulo}</span>
        {ajuda}
      </h1>
      {descricao && <p className="text-xs text-[#6B4B36] lg:truncate">{descricao}</p>}
    </div>
  )
}

export function CabecalhoPagina(props: Props) {
  const { computador, celular } = useContext(EspacosCabecalho)
  return (
    <>
      {computador && createPortal(<Conteudo {...props} tamanho="text-2xl" />, computador)}
      {celular && createPortal(<Conteudo {...props} tamanho="text-xl" />, celular)}
    </>
  )
}
