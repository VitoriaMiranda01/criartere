/* Cupons de desconto: código que o cliente informa e que é aplicado no pedido/orçamento.
   (O desconto em produtos fica no próprio cadastro do produto.) */
import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { novoId } from '@/lib/supabase'
import React, { useMemo, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { Desconto } from '@/types/criartere'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import {
  normalizarCodigo,
  rotuloValorDesconto,
  situacaoDesconto,
  SituacaoDesconto,
} from '@/lib/descontos'
import {
  Ticket,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  Copy,
  CalendarDays,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

const lbl = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

const SITUACOES: Record<SituacaoDesconto, { nome: string; classe: string }> = {
  ativo: { nome: 'Válido', classe: 'bg-[#4C8A5A] text-white' },
  agendado: { nome: 'Agendado', classe: 'bg-[#C48864] text-white' },
  expirado: { nome: 'Expirado', classe: 'bg-[#A84A34] text-white' },
  inativo: { nome: 'Inativo', classe: 'bg-gray-500 text-white' },
}

type FiltroSituacao = 'todas' | SituacaoDesconto

export default function Descontos() {
  const { state, dispatch } = useCriartere()

  const [busca, setBusca] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState<FiltroSituacao>('todas')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Desconto | null>(null)
  const [paraExcluir, setParaExcluir] = useState<Desconto | null>(null)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState<Desconto['tipo']>('percentual')
  const [valorStr, setValorStr] = useState('')
  const [minimoStr, setMinimoStr] = useState('')
  const [validoDe, setValidoDe] = useState('')
  const [validoAte, setValidoAte] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')

  // Quantas vezes cada cupom foi usado
  const usos = useMemo(() => {
    const m = new Map<string, { pedidos: number; orcamentos: number }>()
    const contar = (id: string | undefined, campo: 'pedidos' | 'orcamentos') => {
      if (!id) return
      const atual = m.get(id) ?? { pedidos: 0, orcamentos: 0 }
      atual[campo]++
      m.set(id, atual)
    }
    state.pedidos
      .filter((pe) => pe.status !== 'cancelado')
      .forEach((pe) => contar(pe.descontoId, 'pedidos'))
    state.orcamentos
      .filter((o) => !o.pedidoId && o.status === 'aguardando')
      .forEach((o) => contar(o.descontoId, 'orcamentos'))
    return m
  }, [state.pedidos, state.orcamentos])

  const abrir = (d: Desconto | null) => {
    setEditando(d)
    setNome(d?.nome ?? '')
    setCodigo(d?.codigo ?? '')
    setTipo(d?.tipo ?? 'percentual')
    setValorStr(d ? String(d.valor) : '')
    setMinimoStr(d?.valorMinimo ? String(d.valorMinimo) : '')
    setValidoDe(d?.validoDe ?? '')
    setValidoAte(d?.validoAte ?? '')
    setAtivo(d?.ativo ?? true)
    setDescricao(d?.descricao ?? '')
    setErro('')
    setModalAberto(true)
  }

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const valor = parseFloat(valorStr.replace(',', '.'))
    const valorMinimo = Math.max(0, parseFloat(minimoStr.replace(',', '.')) || 0)
    const codigoFinal = normalizarCodigo(codigo)

    if (!nome.trim()) return setErro('Informe um nome para identificar o cupom.')
    if (codigoFinal.length < 3 || codigoFinal.length > 30)
      return setErro('O código do cupom deve ter de 3 a 30 letras ou números.')
    if (state.descontos.some((d) => d.codigo === codigoFinal && d.id !== editando?.id))
      return setErro(`Já existe um cupom com o código "${codigoFinal}".`)
    if (isNaN(valor) || valor <= 0) return setErro('Informe um valor de desconto maior que zero.')
    if (tipo === 'percentual' && valor > 100)
      return setErro('O desconto em porcentagem não pode passar de 100%.')
    if (validoDe && validoAte && validoDe > validoAte)
      return setErro('A data de início deve ser antes da data de término.')

    const payload: Desconto = {
      id: editando?.id ?? novoId(),
      nome: nome.trim(),
      codigo: codigoFinal,
      tipo,
      valor: Math.round(valor * 100) / 100,
      valorMinimo,
      validoDe: validoDe || undefined,
      validoAte: validoAte || undefined,
      ativo,
      descricao: descricao.trim(),
    }

    dispatch({ type: 'SALVAR_DESCONTO', payload })
    toast.success(
      editando ? `Cupom ${payload.codigo} atualizado!` : `Cupom ${payload.codigo} criado!`,
    )
    setModalAberto(false)
  }

  const handleExcluir = () => {
    if (!paraExcluir) return
    dispatch({ type: 'EXCLUIR_DESCONTO', payload: paraExcluir.id })
    toast.success(`Cupom ${paraExcluir.codigo} excluído.`)
    setParaExcluir(null)
  }

  const copiarCodigo = async (cod: string) => {
    try {
      await navigator.clipboard.writeText(cod)
      toast.success(`Código ${cod} copiado!`)
    } catch {
      toast.error('Não foi possível copiar o código.')
    }
  }

  const filtrados = state.descontos.filter((d) => {
    const termo = busca.trim().toLowerCase()
    if (termo && !d.nome.toLowerCase().includes(termo) && !d.codigo.toLowerCase().includes(termo))
      return false
    if (filtroSituacao !== 'todas' && situacaoDesconto(d) !== filtroSituacao) return false
    return true
  })
  const validos = state.descontos.filter((d) => situacaoDesconto(d) === 'ativo').length

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Cupons"
        descricao={`${state.descontos.length} cupons cadastrados • ${validos} valendo hoje`}
        ajuda={
          <DicaAjuda titulo="Cupons" topico="descontos" lado="bottom">
            <p>
              O cupom tem um código (ex.: BEMVINDO10) que o cliente informa. Digite o código no
              pedido ou orçamento para aplicar o desconto.
            </p>
            <p>Desconto em um produto específico fica no cadastro do produto.</p>
          </DicaAjuda>
        }
      />

      {/* FILTROS E AÇÕES */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-8 relative">
                <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs border-[#DFC3AE]"
                />
                {busca && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setBusca('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B4B36]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="sm:col-span-4">
                <Select
                  value={filtroSituacao}
                  onValueChange={(v) => v && setFiltroSituacao(v as FiltroSituacao)}
                >
                  <SelectTrigger
                    aria-label="Filtrar por situação"
                    className="h-9 text-xs border-[#DFC3AE]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">
                      Todas as situações
                    </SelectItem>
                    {(Object.keys(SITUACOES) as SituacaoDesconto[]).map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {SITUACOES[s].nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <Button
          onClick={() => abrir(null)}
          className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cupom</span>
        </Button>
      </div>

      {/* LISTA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtrados.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
            <Ticket className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[#0C1014]">
              {state.descontos.length === 0
                ? 'Nenhum cupom cadastrado'
                : 'Nenhum cupom encontrado com esses filtros'}
            </p>
            <p className="text-xs text-[#6B4B36]">
              Crie cupons para divulgar e aplicar com um clique em pedidos e orçamentos.
            </p>
          </div>
        ) : (
          filtrados.map((d) => {
            const situacao = situacaoDesconto(d)
            const u = usos.get(d.id) ?? { pedidos: 0, orcamentos: 0 }
            return (
              <Card
                key={d.id}
                className={`border-[#DFC3AE]/70 shadow-xs bg-white rounded-2xl overflow-hidden flex flex-col transition-all ${
                  situacao === 'ativo' ? 'hover:shadow-md hover:border-[#C48864]' : 'opacity-70'
                }`}
              >
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-[#F7F3EA] border border-[#DFC3AE]/60 flex items-center justify-center shrink-0">
                        <Ticket className="w-4.5 h-4.5 text-[#94603D]" />
                      </span>
                      <h3 className="font-serif font-bold text-sm text-[#0C1014] line-clamp-2">
                        {d.nome}
                      </h3>
                    </div>
                    <Badge
                      className={`${SITUACOES[situacao].classe} border-none text-[10px] font-semibold px-2 py-0.5 shrink-0`}
                    >
                      {SITUACOES[situacao].nome}
                    </Badge>
                  </div>

                  <button
                    type="button"
                    onClick={() => copiarCodigo(d.codigo)}
                    className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[#C48864] bg-[#F7F3EA] font-mono text-xs font-bold text-[#94603D] hover:bg-[#C48864]/10"
                    aria-label={`Copiar código ${d.codigo}`}
                  >
                    {d.codigo}
                    <Copy className="w-3 h-3" />
                  </button>

                  <div className="space-y-1 text-[11px] text-[#6B4B36]">
                    <p className="font-serif font-bold text-xl text-[#94603D]">
                      {rotuloValorDesconto(d)}{' '}
                      <span className="text-xs font-sans">de desconto</span>
                    </p>
                    <p className="flex items-center gap-1 font-semibold text-[#0C1014]">
                      <ShoppingBag className="w-3 h-3 shrink-0 text-[#94603D]" />
                      {u.pedidos === 0
                        ? 'Ainda não usado em pedidos'
                        : u.pedidos === 1
                          ? 'Usado em 1 pedido'
                          : `Usado em ${u.pedidos} pedidos`}
                      {u.orcamentos > 0 && (
                        <span className="font-normal text-[#6B4B36]">
                          {' '}
                          • {u.orcamentos}{' '}
                          {u.orcamentos === 1 ? 'orçamento em aberto' : 'orçamentos em aberto'}
                        </span>
                      )}
                    </p>
                    {d.valorMinimo > 0 && <p>Em compras a partir de {formatBRL(d.valorMinimo)}</p>}
                    {(d.validoDe || d.validoAte) && (
                      <p className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {d.validoDe && d.validoAte
                          ? `${formatDataBR(d.validoDe)} a ${formatDataBR(d.validoAte)}`
                          : d.validoDe
                            ? `A partir de ${formatDataBR(d.validoDe)}`
                            : `Até ${formatDataBR(d.validoAte)}`}
                      </p>
                    )}
                    {d.descricao && <p className="line-clamp-2 text-[#6B4B36]/90">{d.descricao}</p>}
                  </div>

                  <div className="mt-auto pt-2 flex items-center justify-end gap-1 border-t border-[#DFC3AE]/30">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrir(d)}
                      className="h-8 text-xs text-[#6B4B36] hover:text-[#0C1014] px-2"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      aria-label={`Excluir cupom ${d.codigo}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => setParaExcluir(d)}
                      className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* FORMULÁRIO */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-xl bg-white border-[#DFC3AE] p-5 sm:p-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
              {editando ? 'Editar Cupom' : 'Novo Cupom'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cupom-nome" className={lbl}>
                  Nome
                  <Obrigatorio />
                </Label>
                <Input
                  id="cupom-nome"
                  placeholder="Ex: Primeira compra, Black Friday"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupom-codigo" className={lbl}>
                  Código
                  <Obrigatorio />
                </Label>
                <Input
                  id="cupom-codigo"
                  placeholder="Ex: BEMVINDO10"
                  value={codigo}
                  onChange={(e) => setCodigo(normalizarCodigo(e.target.value))}
                  maxLength={30}
                  className="h-10 text-xs border-[#DFC3AE] font-mono uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cupom-tipo" className={lbl}>
                  Tipo de desconto
                  <Obrigatorio />
                </Label>
                <Select value={tipo} onValueChange={(v) => v && setTipo(v as Desconto['tipo'])}>
                  <SelectTrigger id="cupom-tipo" className="h-10 text-xs border-[#DFC3AE]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentual" className="text-xs">
                      Porcentagem (%)
                    </SelectItem>
                    <SelectItem value="valor" className="text-xs">
                      Valor fixo (R$)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupom-valor" className={lbl}>
                  {tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                  <Obrigatorio />
                </Label>
                <Input
                  id="cupom-valor"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={tipo === 'percentual' ? 100 : undefined}
                  placeholder={tipo === 'percentual' ? 'Ex: 10' : '0,00'}
                  value={valorStr}
                  onChange={(e) => setValorStr(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cupom-minimo" className={lbl}>
                  Compra mínima (R$)
                  <Opcional />
                </Label>
                <Input
                  id="cupom-minimo"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Sem mínimo"
                  value={minimoStr}
                  onChange={(e) => setMinimoStr(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
                <p className="text-[10px] text-[#6B4B36]/90">
                  Soma dos itens (sem frete) necessária para o cupom valer.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cupom-de" className={lbl}>
                  Válido a partir de
                  <Opcional />
                </Label>
                <Input
                  id="cupom-de"
                  type="date"
                  value={validoDe}
                  onChange={(e) => setValidoDe(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cupom-ate" className={lbl}>
                  Válido até
                  <Opcional />
                </Label>
                <Input
                  id="cupom-ate"
                  type="date"
                  value={validoAte}
                  min={validoDe || undefined}
                  onChange={(e) => setValidoAte(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cupom-obs" className={lbl}>
                  Observações
                  <Opcional />
                </Label>
                <Textarea
                  id="cupom-obs"
                  placeholder="Onde o cupom foi divulgado, regras combinadas..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  className="text-xs border-[#DFC3AE] min-h-[56px] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 bg-[#F7F3EA] rounded-xl border border-[#DFC3AE]/60">
              <Label
                htmlFor="cupom-ativo"
                className="text-xs font-bold text-[#0C1014] cursor-pointer"
              >
                Ativo (pode ser usado)
              </Label>
              <Switch id="cupom-ativo" checked={ativo} onCheckedChange={setAtivo} />
            </div>

            {erro && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalAberto(false)}
                className="border-[#DFC3AE] text-[#6B4B36] h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white h-10 text-xs font-semibold"
              >
                Salvar Cupom
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(paraExcluir)}
        onOpenChange={(open) => !open && setParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Excluir o cupom {paraExcluir?.codigo}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              Pedidos e orçamentos que já usaram este cupom continuam com o desconto. Para só
              pausar, desligue "Ativo" na edição.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
