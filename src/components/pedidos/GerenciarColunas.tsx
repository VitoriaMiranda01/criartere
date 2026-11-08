/* Gerenciamento das colunas do Kanban (etapas do pedido): criar, editar, reordenar e excluir. */
import { useEffect, useState } from 'react'
import { EtapaPedido } from '@/types/criartere'
import { useCriartere } from '@/store/CriartereContext'
import { CORES_ETAPA, etapasDoKanban, gerarChaveEtapa } from '@/store/etapas'
import { Obrigatorio } from '@/components/common/MarcadorCampo'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

/** Move uma coluna uma posição para a esquerda (-1) ou direita (+1). */
export function useMoverColuna() {
  const { state, dispatch } = useCriartere()
  return (chave: string, direcao: -1 | 1) => {
    const chaves = etapasDoKanban(state).map((e) => e.chave)
    const i = chaves.indexOf(chave)
    const j = i + direcao
    if (i < 0 || j < 0 || j >= chaves.length) return
    ;[chaves[i], chaves[j]] = [chaves[j], chaves[i]]
    dispatch({ type: 'REORDENAR_ETAPAS', payload: [...chaves, 'cancelado'] })
  }
}

interface MenuColunaProps {
  etapa: EtapaPedido
  posicao: number
  total: number
  onEditar: () => void
  onExcluir: () => void
}

export function MenuColuna({ etapa, posicao, total, onEditar, onExcluir }: MenuColunaProps) {
  const mover = useMoverColuna()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-6 w-6 rounded-md flex items-center justify-center text-[#6B4B36] hover:bg-black/5"
          title="Opções da coluna"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-xs">
        <DropdownMenuItem onClick={onEditar}>
          <Pencil className="w-3.5 h-3.5 mr-2" />
          Renomear / mudar cor
        </DropdownMenuItem>
        <DropdownMenuItem disabled={posicao === 0} onClick={() => mover(etapa.chave, -1)}>
          <ChevronLeft className="w-3.5 h-3.5 mr-2" />
          Mover para a esquerda
        </DropdownMenuItem>
        <DropdownMenuItem disabled={posicao === total - 1} onClick={() => mover(etapa.chave, 1)}>
          <ChevronRight className="w-3.5 h-3.5 mr-2" />
          Mover para a direita
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {etapa.fixa ? (
          <DropdownMenuItem disabled>
            <Lock className="w-3.5 h-3.5 mr-2" />
            Coluna do sistema (não pode excluir)
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onExcluir} className="text-red-600 focus:text-red-700">
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Excluir coluna
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DialogEtapaProps {
  aberto: boolean
  etapa: EtapaPedido | null // null = nova coluna
  onFechar: () => void
}

export function DialogEtapa({ aberto, etapa, onFechar }: DialogEtapaProps) {
  const { state, dispatch } = useCriartere()
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(CORES_ETAPA[0])
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    setNome(etapa?.nome ?? '')
    setCor(etapa?.cor ?? CORES_ETAPA[state.etapas.length % CORES_ETAPA.length])
    setErro('')
  }, [aberto, etapa, state.etapas.length])

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    const n = nome.trim()
    if (!n) {
      setErro('Informe o nome da coluna.')
      return
    }
    const repetida = state.etapas.some(
      (x) => x.nome.toLowerCase() === n.toLowerCase() && x.chave !== etapa?.chave,
    )
    if (repetida) {
      setErro('Já existe uma coluna com esse nome.')
      return
    }
    if (etapa) {
      dispatch({ type: 'SALVAR_ETAPA', payload: { ...etapa, nome: n, cor } })
      toast.success(`Coluna "${n}" atualizada!`)
    } else {
      const kanban = etapasDoKanban(state)
      const ordem = Math.max(0, ...kanban.map((x) => x.ordem)) + 1
      dispatch({
        type: 'SALVAR_ETAPA',
        payload: {
          chave: gerarChaveEtapa(
            n,
            state.etapas.map((x) => x.chave),
          ),
          nome: n,
          cor,
          ordem: Math.min(ordem, 98),
          fixa: false,
        },
      })
      toast.success(`Coluna "${n}" criada!`)
    }
    onFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE]">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-[#0C1014]">
            {etapa ? 'Editar coluna' : 'Nova coluna'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4B36]">
            {etapa
              ? 'O novo nome aparece no Kanban, nos filtros e no histórico dos pedidos.'
              : 'A coluna é criada no fim do Kanban. Depois você pode movê-la pelo menu da coluna.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="gerenciarcol-campo-1"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Nome da coluna
              <Obrigatorio />
            </Label>
            <Input
              id="gerenciarcol-campo-1"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Acabamento, Aguardando arte, Retirada na loja..."
              maxLength={40}
              className="h-10 text-sm border-[#DFC3AE]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
              Cor
              <Obrigatorio />
            </Label>
            <div className="flex flex-wrap gap-2">
              {CORES_ETAPA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCor(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center ring-offset-2 transition-all"
                  style={{
                    backgroundColor: c,
                    boxShadow: cor === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
                  }}
                  title={c}
                >
                  {cor === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
          <div
            className="p-3 rounded-xl border flex items-center gap-2"
            style={{ backgroundColor: `${cor}14`, borderColor: `${cor}55` }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cor }} />
            <span className="font-serif text-sm font-bold text-[#0C1014]">
              {nome.trim() || 'Pré-visualização'}
            </span>
          </div>
          {erro && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {erro}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onFechar}
              className="text-xs border-[#DFC3AE] text-[#6B4B36]"
            >
              Cancelar
            </Button>
            <Button type="submit" className="text-xs bg-[#A5683F] hover:bg-[#8C5636] text-white">
              {etapa ? 'Salvar' : 'Criar coluna'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DialogExcluirEtapaProps {
  etapa: EtapaPedido | null
  onFechar: () => void
}

export function DialogExcluirEtapa({ etapa, onFechar }: DialogExcluirEtapaProps) {
  const { state, dispatch } = useCriartere()
  const [destino, setDestino] = useState('')
  const qtd = etapa ? state.pedidos.filter((p) => p.status === etapa.chave).length : 0
  const opcoes = etapasDoKanban(state).filter((e) => e.chave !== etapa?.chave)

  useEffect(() => {
    if (etapa) setDestino(opcoes[0]?.chave ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa])

  const excluir = () => {
    if (!etapa) return
    if (qtd > 0 && !destino) return
    dispatch({
      type: 'EXCLUIR_ETAPA',
      payload: { chave: etapa.chave, moverPara: qtd > 0 ? destino : undefined },
    })
    toast.success(`Coluna "${etapa.nome}" excluída.`)
    onFechar()
  }

  return (
    <Dialog open={!!etapa} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md bg-white border-[#DFC3AE]">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-[#0C1014]">
            Excluir a coluna "{etapa?.nome}"?
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6B4B36]">
            {qtd === 0
              ? 'A coluna está vazia e será removida.'
              : `Esta coluna tem ${qtd} pedido(s). Escolha para onde eles vão; a mudança fica registrada no histórico de cada pedido.`}
          </DialogDescription>
        </DialogHeader>
        {qtd > 0 && (
          <div className="space-y-1.5">
            <Label
              htmlFor="gerenciarcol-campo-2"
              className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
            >
              Mover os pedidos para
              <Obrigatorio />
            </Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger id="gerenciarcol-campo-2" className="h-10 text-xs border-[#DFC3AE]">
                <SelectValue placeholder="Escolha a coluna..." />
              </SelectTrigger>
              <SelectContent>
                {opcoes.map((e) => (
                  <SelectItem key={e.chave} value={e.chave} className="text-xs">
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onFechar}
            className="text-xs border-[#DFC3AE] text-[#6B4B36]"
          >
            Cancelar
          </Button>
          <Button
            onClick={excluir}
            disabled={qtd > 0 && !destino}
            className="text-xs bg-red-600 hover:bg-red-700 text-white"
          >
            Excluir coluna
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
