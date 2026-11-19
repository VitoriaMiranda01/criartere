/* Busca da loja: lupa no cabeçalho que abre um campo logo abaixo dele, com sugestões
   de produtos enquanto a pessoa digita. Enter (ou "Ver todos os resultados") abre a
   página /busca?q=... com a lista completa. */
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLoja } from './LojaContext'
import { formatarPreco, type ProdutoVitrine } from './api'
import { ImagemProduto } from './componentes'
import { caminhoProduto, categoriasDoProduto } from './seo-dados'

/** Sem acentos e em minúsculas, para comparar "decoracao" com "Decoração". */
export const normalizarBusca = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** O produto combina com o termo (nome, descrição ou categorias)? */
export function produtoCombina(p: ProdutoVitrine, termo: string) {
  const t = normalizarBusca(termo.trim())
  if (!t) return true
  return normalizarBusca(`${p.nome} ${p.descricao} ${categoriasDoProduto(p).join(' ')}`).includes(t)
}

export const caminhoBusca = (termo: string) =>
  termo.trim() ? `/busca?q=${encodeURIComponent(termo.trim())}` : '/busca'

const MAX_SUGESTOES = 5

export function BuscaCabecalho() {
  const { produtos } = useLoja()
  const navigate = useNavigate()
  const local = useLocation()
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const campo = useRef<HTMLInputElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const idPainel = useId()
  const idSugestoes = useId()

  // Fecha ao trocar de página
  useEffect(() => setAberta(false), [local.pathname, local.search])
  // Foco no campo ao abrir; clicar fora do painel fecha a busca
  const painel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberta) return
    campo.current?.focus()
    const aoClicar = (e: PointerEvent) => {
      const alvo = e.target as Node
      if (!painel.current?.contains(alvo) && !botao.current?.contains(alvo)) setAberta(false)
    }
    document.addEventListener('pointerdown', aoClicar)
    return () => document.removeEventListener('pointerdown', aoClicar)
  }, [aberta])

  const sugestoes = useMemo(
    () =>
      termo.trim().length < 2
        ? []
        : produtos.filter((p) => produtoCombina(p, termo)).slice(0, MAX_SUGESTOES),
    [produtos, termo],
  )

  const fechar = () => {
    setAberta(false)
    botao.current?.focus()
  }
  const buscar = (e: FormEvent) => {
    e.preventDefault()
    if (!termo.trim()) return campo.current?.focus()
    navigate(caminhoBusca(termo))
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => (aberta ? fechar() : setAberta(true))}
        aria-label={aberta ? 'Fechar busca' : 'Buscar produtos'}
        aria-expanded={aberta}
        aria-controls={idPainel}
        className={cn(
          'p-2 rounded-full text-[#6B4B36] hover:bg-white hover:text-[#0C1014]',
          aberta && 'bg-white text-[#0C1014]',
        )}
      >
        {aberta ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
      </button>

      {aberta && (
        <div
          ref={painel}
          id={idPainel}
          className="absolute inset-x-0 top-full border-b border-[#DFC3AE]/60 bg-[#F7F3EA] shadow-[0_12px_30px_rgba(12,16,20,0.08)] animate-in fade-in-0 slide-in-from-top-1"
          onKeyDown={(e) => {
            if (e.key === 'Escape') fechar()
          }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <form role="search" onSubmit={buscar} className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B4B36]"
                  aria-hidden="true"
                />
                <input
                  ref={campo}
                  type="search"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                  placeholder="O que você procura?"
                  aria-label="Buscar produtos"
                  aria-controls={sugestoes.length ? idSugestoes : undefined}
                  enterKeyHint="search"
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#DFC3AE] bg-white text-sm outline-none placeholder:text-[#6B4B36]/60 focus:ring-2 focus:ring-[#C48864]/50 focus:border-[#C48864]"
                />
                {termo && (
                  <button
                    type="button"
                    onClick={() => {
                      setTermo('')
                      campo.current?.focus()
                    }}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-[#6B4B36] hover:bg-[#F7F3EA]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-11 px-4 sm:px-5 rounded-xl bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold shrink-0"
              >
                Buscar
              </button>
            </form>

            {termo.trim().length >= 2 && (
              <div className="mt-3" aria-live="polite">
                {sugestoes.length === 0 ? (
                  <p className="text-sm text-[#6B4B36] px-1">
                    Nenhum produto encontrado para “{termo.trim()}”.
                  </p>
                ) : (
                  <ul
                    id={idSugestoes}
                    className="divide-y divide-[#DFC3AE]/50 rounded-xl border border-[#DFC3AE]/60 bg-white overflow-hidden"
                  >
                    {sugestoes.map((p) => (
                      <li key={p.id}>
                        <Link
                          to={caminhoProduto(p)}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-[#F7F3EA] focus:bg-[#F7F3EA] focus:outline-none"
                        >
                          <ImagemProduto
                            produto={p}
                            className="w-11 h-11 rounded-lg border border-[#DFC3AE]/50 shrink-0 object-cover"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-[#0C1014] truncate">
                              {p.nome}
                            </span>
                            <span className="block text-xs text-[#6B4B36] truncate">
                              {p.categoria}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-[#A5683F] shrink-0">
                            {formatarPreco(p.preco)}
                          </span>
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link
                        to={caminhoBusca(termo)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-[#A5683F] hover:bg-[#F7F3EA] focus:bg-[#F7F3EA] focus:outline-none"
                      >
                        Ver todos os resultados <ArrowRight className="w-4 h-4" />
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
