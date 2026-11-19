/* "O que nossas clientes dizem": até 3 depoimentos tirados das avaliações publicadas
   (destacados no painel primeiro). Sem avaliação que sirva, a seção não aparece:
   nada de depoimentos inventados. */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Quote } from 'lucide-react'
import { Avaliacao, escolherDepoimentos, listarParaDepoimentos } from '@/lib/avaliacoes'
import type { ProdutoVitrine } from './api'
import { Estrelas } from './Estrelas'
import { caminhoProduto } from './seo-dados'

const LIMITE_TEXTO = 220

const cortar = (t: string) =>
  t.length > LIMITE_TEXTO ? `${t.slice(0, LIMITE_TEXTO).replace(/\s+\S*$/, '')}…` : t

const iniciais = (nome: string) =>
  nome
    .replace(/\./g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export function Depoimentos({ produtos }: { produtos: ProdutoVitrine[] }) {
  const [lista, setLista] = useState<Avaliacao[]>([])
  useEffect(() => {
    let ativo = true
    // Se falhar, a seção simplesmente não aparece
    listarParaDepoimentos()
      .then((l) => ativo && setLista(l))
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [])

  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos])
  const escolhidos = useMemo(
    () => escolherDepoimentos(lista, new Set(porId.keys())),
    [lista, porId],
  )
  if (escolhidos.length === 0) return null

  return (
    <section aria-labelledby="titulo-depoimentos" className="space-y-4">
      <h2
        id="titulo-depoimentos"
        className="font-serif text-2xl sm:text-3xl font-semibold text-[#0C1014]"
      >
        O que nossas clientes dizem
      </h2>
      <ul className="grid gap-4 sm:gap-5 md:grid-cols-3">
        {escolhidos.map((a) => {
          const produto = porId.get(a.produtoId)!
          return (
            <li
              key={a.id}
              className="relative flex flex-col rounded-2xl bg-white border border-[#DFC3AE]/60 p-5 sm:p-6"
            >
              <Quote
                className="absolute top-5 right-5 w-8 h-8 text-[#DFC3AE]/70"
                aria-hidden="true"
              />
              <Estrelas nota={a.nota} rotulo={`${a.nota} de 5 estrelas`} />
              <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-[#3a2c22]">
                “{cortar(a.comentario.trim())}”
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span
                  className="w-10 h-10 shrink-0 rounded-full bg-[#F6EDE7] text-[#A5683F] font-serif font-semibold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {iniciais(a.autorNome) || 'C'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0C1014]">{a.autorNome}</p>
                  <Link
                    to={caminhoProduto(produto)}
                    className="block text-xs text-[#A5683F] hover:underline underline-offset-4 truncate"
                  >
                    {produto.nome}
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
