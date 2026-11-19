/* Avaliações na página do produto: resumo (média e distribuição), situação da cliente
   (entrar, formulário, aguardando aprovação...) e a lista das publicadas. */
import { FormEvent, useCallback, useEffect, useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MessageSquareHeart, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  Avaliacao,
  COMENTARIO_MAX,
  enviarAvaliacao,
  formatarMedia,
  listarAvaliacoesPublicadas,
  mensagemErroAvaliacao,
  resumoNotas,
  situacaoAvaliacao,
} from '@/lib/avaliacoes'
import { useLoja } from './LojaContext'
import { EscolherEstrelas, Estrelas } from './Estrelas'

/** Avaliações publicadas do produto (para o resumo no topo e a seção). */
export function useAvaliacoesProduto(produtoId: string | undefined) {
  const [lista, setLista] = useState<Avaliacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const carregar = useCallback(async () => {
    if (!produtoId) return
    setCarregando(true)
    try {
      setLista(await listarAvaliacoesPublicadas(produtoId))
      setErro(false)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [produtoId])
  useEffect(() => {
    carregar()
  }, [carregar])
  return { lista, carregando, erro, recarregar: carregar }
}

const plural = (n: number) => (n === 1 ? '1 avaliação' : `${n} avaliações`)

/** Média e quantidade perto do preço (só com avaliação publicada); leva até a seção. */
export function ResumoAvaliacoesTopo({ lista }: { lista: Avaliacao[] }) {
  const resumo = resumoNotas(lista)
  if (!resumo) return null
  return (
    <a
      href="#avaliacoes"
      className="inline-flex items-center gap-2 text-sm text-[#6B4B36] hover:text-[#0C1014] rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864]"
    >
      <Estrelas nota={resumo.media} rotulo={`Nota média ${formatarMedia(resumo.media)} de 5`} />
      <span className="font-semibold text-[#0C1014]">{formatarMedia(resumo.media)}</span>
      <span className="underline underline-offset-4 decoration-[#DFC3AE]">
        {plural(resumo.total)}
      </span>
    </a>
  )
}

export function AvaliacoesProduto({
  produtoId,
  lista,
  carregando,
  erro,
  recarregar,
}: {
  produtoId: string
  lista: Avaliacao[]
  carregando: boolean
  erro: boolean
  recarregar: () => void
}) {
  const resumo = resumoNotas(lista)
  const contagem = [5, 4, 3, 2, 1].map((n) => ({
    nota: n,
    total: lista.filter((a) => a.nota === n).length,
  }))

  return (
    <section id="avaliacoes" aria-labelledby="titulo-avaliacoes" className="space-y-6 scroll-mt-24">
      <h2 id="titulo-avaliacoes" className="font-serif text-2xl font-semibold">
        Avaliações
      </h2>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 lg:gap-10 items-start">
        {/* Resumo e situação da cliente */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-[#DFC3AE]/60 p-5">
            {carregando ? (
              <div className="h-24 animate-pulse rounded-lg bg-[#F7F3EA]" aria-hidden="true" />
            ) : erro ? (
              <div className="space-y-3 text-sm text-[#6B4B36]">
                <p>Não foi possível carregar as avaliações.</p>
                <button
                  type="button"
                  onClick={recarregar}
                  className="inline-flex items-center gap-1.5 font-semibold text-[#A5683F] hover:underline underline-offset-4"
                >
                  <RefreshCw className="w-4 h-4" /> Tentar de novo
                </button>
              </div>
            ) : resumo ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-4xl font-bold text-[#0C1014]" aria-hidden="true">
                    {formatarMedia(resumo.media)}
                  </span>
                  <div>
                    <Estrelas nota={resumo.media} tamanho="w-5 h-5" rotulo="" />
                    <p className="text-xs text-[#6B4B36] mt-1" aria-hidden="true">
                      {plural(resumo.total)}
                    </p>
                  </div>
                  <span className="sr-only">
                    Nota média {formatarMedia(resumo.media)} de 5, com {plural(resumo.total)}
                  </span>
                </div>
                <ul className="space-y-1.5" aria-label="Avaliações por nota">
                  {contagem.map((c) => (
                    <li key={c.nota} className="flex items-center gap-2 text-xs text-[#6B4B36]">
                      <span className="w-14 shrink-0">
                        {c.nota} {c.nota === 1 ? 'estrela' : 'estrelas'}
                      </span>
                      <span
                        className="flex-1 h-2 rounded-full bg-[#F1E6DC] overflow-hidden"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full bg-[#C48864]"
                          style={{ width: `${(c.total / resumo.total) * 100}%` }}
                        />
                      </span>
                      <span className="w-6 text-right tabular-nums">{c.total}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-[#6B4B36]">Este produto ainda não tem avaliações.</p>
            )}
          </div>

          <SituacaoCliente produtoId={produtoId} />
        </div>

        {/* Lista */}
        {!carregando && !erro && lista.length > 0 && (
          <ul className="space-y-4">
            {lista.map((a) => (
              <li key={a.id} className="rounded-2xl bg-white border border-[#DFC3AE]/60 p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="font-semibold text-sm text-[#0C1014]">{a.autorNome}</p>
                  <time dateTime={a.criadoEm} className="text-xs text-[#6B4B36]">
                    {new Date(a.criadoEm).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </div>
                <Estrelas nota={a.nota} rotulo={`${a.nota} de 5 estrelas`} className="mt-1.5" />
                {a.comentario && (
                  <p className="mt-2 text-sm text-[#3a2c22] leading-relaxed whitespace-pre-line">
                    {a.comentario}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** O que a cliente vê: entrar, formulário ou a situação da avaliação que ela enviou. */
function SituacaoCliente({ produtoId }: { produtoId: string }) {
  const { usuario, sessaoVerificada } = useLoja()
  const location = useLocation()
  const [estado, setEstado] = useState<
    { tipo: 'carregando' } | { tipo: 'pronto'; podeAvaliar: boolean; minha: Avaliacao | null }
  >({ tipo: 'carregando' })

  useEffect(() => {
    if (!usuario) return
    let ativo = true
    setEstado({ tipo: 'carregando' })
    situacaoAvaliacao(produtoId, usuario.id)
      .then((s) => ativo && setEstado({ tipo: 'pronto', ...s }))
      // Sem conseguir saber, não mostra nada (a cliente pode tentar mais tarde)
      .catch(() => ativo && setEstado({ tipo: 'pronto', podeAvaliar: false, minha: null }))
    return () => {
      ativo = false
    }
  }, [produtoId, usuario])

  const aviso = 'rounded-2xl border p-4 text-sm leading-relaxed'

  if (!sessaoVerificada) return null
  if (!usuario)
    return (
      <p className={`${aviso} border-[#DFC3AE]/60 bg-[#F7F3EA] text-[#6B4B36]`}>
        Comprou este produto?{' '}
        <Link
          to="/entrar"
          state={{ voltarPara: location.pathname }}
          className="font-semibold text-[#A5683F] hover:underline underline-offset-4"
        >
          Entre na sua conta
        </Link>{' '}
        para avaliá-lo depois de recebê-lo.
      </p>
    )
  if (estado.tipo === 'carregando') return null

  const { minha, podeAvaliar } = estado
  if (minha?.status === 'pendente')
    return (
      <p className={`${aviso} border-[#DFC3AE]/60 bg-[#F7F3EA] text-[#6B4B36]`} role="status">
        Sua avaliação foi recebida e está aguardando aprovação.
      </p>
    )
  if (minha?.status === 'publicada')
    return (
      <p className={`${aviso} border-[#2F7A4F]/30 bg-[#2F7A4F]/5 text-[#2F7A4F]`}>
        Obrigada por avaliar este produto!
      </p>
    )
  if (minha?.status === 'recusada')
    return (
      <p className={`${aviso} border-[#DFC3AE]/60 bg-[#F7F3EA] text-[#6B4B36]`}>
        Sua avaliação não foi publicada.
      </p>
    )
  // Logada sem ter recebido o produto: não mostra nada
  if (!podeAvaliar) return null

  return (
    <FormularioAvaliacao
      produtoId={produtoId}
      aoEnviar={(a) => setEstado({ tipo: 'pronto', podeAvaliar: false, minha: a })}
    />
  )
}

function FormularioAvaliacao({
  produtoId,
  aoEnviar,
}: {
  produtoId: string
  aoEnviar: (a: Avaliacao) => void
}) {
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const idNota = useId()
  const idComentario = useId()
  const idErro = useId()

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!nota) return setErro('Escolha de 1 a 5 estrelas.')
    setEnviando(true)
    setErro('')
    try {
      const a = await enviarAvaliacao(produtoId, nota, comentario)
      toast.success('Obrigada! Sua avaliação foi enviada e aparece aqui depois da aprovação.')
      aoEnviar(a)
    } catch (err) {
      setErro(mensagemErroAvaliacao(err))
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="rounded-2xl bg-white border border-[#DFC3AE]/60 p-5 space-y-4"
      aria-describedby={erro ? idErro : undefined}
    >
      <div className="flex items-center gap-2">
        <MessageSquareHeart className="w-5 h-5 text-[#A5683F]" aria-hidden="true" />
        <p className="font-semibold text-sm text-[#0C1014]">Avalie este produto</p>
      </div>
      <div className="space-y-1.5">
        <p id={idNota} className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
          Sua nota
        </p>
        <EscolherEstrelas
          valor={nota}
          onChange={(n) => {
            setNota(n)
            setErro('')
          }}
          idRotulo={idNota}
          invalido={Boolean(erro) && !nota}
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={idComentario}
          className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
        >
          Comentário <span className="normal-case font-normal tracking-normal">(opcional)</span>
        </label>
        <textarea
          id={idComentario}
          rows={4}
          maxLength={COMENTARIO_MAX}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Conte o que achou: acabamento, tamanho, se chegou como esperava..."
          className="w-full rounded-lg border border-[#DFC3AE] bg-[#F7F3EA]/40 p-3 text-sm outline-none placeholder:text-[#6B4B36]/50 focus:ring-2 focus:ring-[#C48864]/50 focus:border-[#C48864] resize-y"
        />
        <p className="text-[11px] text-[#6B4B36]/80 text-right">
          {comentario.length}/{COMENTARIO_MAX}
        </p>
      </div>
      {erro && (
        <p id={idErro} role="alert" className="text-xs font-medium text-red-700">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="w-full h-11 rounded-lg bg-[#A5683F] hover:bg-[#8C5636] text-white text-sm font-semibold disabled:opacity-70"
      >
        {enviando ? 'Enviando...' : 'Enviar avaliação'}
      </button>
      <p className="text-[11px] text-[#6B4B36]/80">
        Seu nome aparece abreviado (ex.: Maria L.). A avaliação é publicada depois de aprovada pela
        loja.
      </p>
    </form>
  )
}
