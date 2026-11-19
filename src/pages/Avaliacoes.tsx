import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  MessageSquareHeart,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import {
  AvaliacaoModeracao,
  StatusAvaliacao,
  definirDestaqueAvaliacao,
  definirStatusAvaliacao,
  excluirAvaliacao,
  listarParaModeracao,
} from '@/lib/avaliacoes'
import { mensagemErro } from '@/store/db'
import { Estrelas } from '@/loja/Estrelas'

type Aba = StatusAvaliacao | 'todas'

const ABAS: { valor: Aba; rotulo: string }[] = [
  { valor: 'pendente', rotulo: 'Aguardando' },
  { valor: 'publicada', rotulo: 'Publicadas' },
  { valor: 'recusada', rotulo: 'Recusadas' },
  { valor: 'todas', rotulo: 'Todas' },
]

const SELO: Record<StatusAvaliacao, { rotulo: string; classe: string }> = {
  pendente: { rotulo: 'Aguardando', classe: 'bg-amber-50 text-amber-800 border-amber-200' },
  publicada: { rotulo: 'Publicada', classe: 'bg-green-50 text-green-800 border-green-200' },
  recusada: { rotulo: 'Recusada', classe: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export default function Avaliacoes() {
  const [aba, setAba] = useState<Aba>('pendente')
  const [lista, setLista] = useState<AvaliacaoModeracao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [paraExcluir, setParaExcluir] = useState<AvaliacaoModeracao | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setLista(await listarParaModeracao(aba))
    } catch (e) {
      setErro(mensagemErro(e))
    } finally {
      setCarregando(false)
    }
  }, [aba])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Atualiza a avaliação na tela (e tira da aba se ela não pertence mais a ela)
  const aplicar = (id: string, mudanca: Partial<AvaliacaoModeracao>) =>
    setLista((l) =>
      l
        .map((a) => (a.id === id ? { ...a, ...mudanca } : a))
        .filter((a) => aba === 'todas' || a.status === aba),
    )

  const mudarStatus = async (a: AvaliacaoModeracao, status: StatusAvaliacao) => {
    setOcupada(a.id)
    try {
      await definirStatusAvaliacao(a.id, status)
      aplicar(a.id, { status, destaque: status === 'publicada' ? a.destaque : false })
      toast.success(status === 'publicada' ? 'Avaliação publicada.' : 'Avaliação recusada.')
    } catch (e) {
      toast.error(`Não foi possível alterar a avaliação. ${mensagemErro(e)}`)
    } finally {
      setOcupada(null)
    }
  }

  const mudarDestaque = async (a: AvaliacaoModeracao, destaque: boolean) => {
    setOcupada(a.id)
    try {
      await definirDestaqueAvaliacao(a.id, destaque)
      aplicar(a.id, { destaque })
      toast.success(destaque ? 'Avaliação destacada na página inicial.' : 'Destaque removido.')
    } catch (e) {
      toast.error(`Não foi possível alterar o destaque. ${mensagemErro(e)}`)
    } finally {
      setOcupada(null)
    }
  }

  const excluir = async () => {
    const a = paraExcluir
    if (!a) return
    setParaExcluir(null)
    setOcupada(a.id)
    try {
      await excluirAvaliacao(a.id)
      setLista((l) => l.filter((x) => x.id !== a.id))
      toast.success('Avaliação excluída.')
    } catch (e) {
      toast.error(`Não foi possível excluir. ${mensagemErro(e)}`)
    } finally {
      setOcupada(null)
    }
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Avaliações"
        descricao="Avaliações que as clientes fazem dos produtos na loja"
        ajuda={
          <DicaAjuda titulo="Avaliações" topico="avaliacoes" lado="bottom">
            <p>Só quem tem um pedido Entregue com aquele produto consegue avaliar.</p>
            <p>Toda avaliação chega como Aguardando e não aparece na loja até ser publicada.</p>
          </DicaAjuda>
        }
      />

      <div
        className="flex gap-1 p-1 rounded-xl bg-white border border-[#DFC3AE]/70 w-full sm:w-auto sm:inline-flex overflow-x-auto sem-barra"
        role="group"
        aria-label="Filtrar avaliações"
      >
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            onClick={() => setAba(a.valor)}
            aria-pressed={aba === a.valor}
            className={cn(
              'shrink-0 h-9 px-4 rounded-lg text-xs font-semibold transition-colors',
              aba === a.valor
                ? 'bg-[#A5683F] text-white'
                : 'text-[#6B4B36] hover:bg-[#F7F3EA] hover:text-[#0C1014]',
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {carregando ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-white border border-[#DFC3AE]/50 animate-pulse"
            />
          ))}
        </div>
      ) : erro ? (
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center space-y-3">
          <p className="text-sm text-red-700">Não foi possível carregar as avaliações. {erro}</p>
          <Button
            variant="outline"
            onClick={carregar}
            className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar de novo
          </Button>
        </div>
      ) : lista.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
          <MessageSquareHeart className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
          <p className="text-sm font-semibold text-[#0C1014]">
            {aba === 'pendente'
              ? 'Nenhuma avaliação aguardando aprovação'
              : 'Nenhuma avaliação por aqui'}
          </p>
          <p className="text-xs text-[#6B4B36]">
            As clientes avaliam os produtos na loja depois que o pedido é marcado como Entregue.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((a) => {
            const selo = SELO[a.status]
            const ocupado = ocupada === a.id
            return (
              <li
                key={a.id}
                className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#0C1014] truncate">{a.produtoNome}</p>
                    <p className="text-[11px] text-[#6B4B36]">
                      {a.autorNome} •{' '}
                      {new Date(a.criadoEm).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.destaque && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-[#A5683F]/10 text-[#8C5636] border-[#A5683F]/20">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Destaque
                      </span>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${selo.classe}`}
                    >
                      {selo.rotulo}
                    </span>
                  </div>
                </div>

                <Estrelas nota={a.nota} rotulo={`${a.nota} de 5 estrelas`} />
                {a.comentario ? (
                  <p className="text-sm text-[#3a2c22] leading-relaxed whitespace-pre-line">
                    {a.comentario}
                  </p>
                ) : (
                  <p className="text-xs italic text-[#6B4B36]/80">Sem comentário, só a nota.</p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DFC3AE]/40">
                  {a.status !== 'publicada' && (
                    <Button
                      size="sm"
                      disabled={ocupado}
                      onClick={() => mudarStatus(a, 'publicada')}
                      className="h-8 mt-2 text-xs bg-[#2F7A4F] hover:bg-[#25633F] text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Publicar
                    </Button>
                  )}
                  {a.status !== 'recusada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={ocupado}
                      onClick={() => mudarStatus(a, 'recusada')}
                      className="h-8 mt-2 text-xs border-[#DFC3AE] text-[#6B4B36]"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1.5" /> Recusar
                    </Button>
                  )}
                  {a.status === 'publicada' && (
                    <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-[#6B4B36] cursor-pointer">
                      <Switch
                        checked={a.destaque}
                        disabled={ocupado}
                        onCheckedChange={(v) => mudarDestaque(a, v)}
                        aria-label={`Destacar a avaliação de ${a.autorNome} na página inicial`}
                      />
                      Destacar na página inicial
                    </label>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={ocupado}
                    onClick={() => setParaExcluir(a)}
                    className="h-8 mt-2 ml-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <AlertDialog open={Boolean(paraExcluir)} onOpenChange={(o) => !o && setParaExcluir(null)}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014]">
              Excluir avaliação
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              Excluir de vez a avaliação de {paraExcluir?.autorNome}? Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={excluir}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
