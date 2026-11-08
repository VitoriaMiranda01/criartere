import { DicaAjuda } from '@/components/common/DicaAjuda'
import { hojeISO, inicioDoMesISO } from '@/lib/datas'
import React, { useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import {
  selectFinancialSummary,
  selectPagamentosDoPedido,
  selectClientePorId,
} from '@/store/selectors'
import { PeriodoFiltro, DataRange, Despesa, Pedido } from '@/types/criartere'
import { PeriodFilterBar } from '@/components/common/PeriodFilterBar'
import { CountUpNumber } from '@/components/common/CountUpNumber'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import { ModalPagamento } from '@/components/pedidos/ModalPagamento'
import { FormDespesaModal } from '@/components/financeiro/FormDespesaModal'
import { ModalCategorias } from '@/components/financeiro/ModalCategorias'
import { Plus, Search, CheckCircle, Edit, Trash2, FolderTree, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { toast } from 'sonner'

export default function Financeiro() {
  const { state, dispatch } = useCriartere()

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_atual')
  const [personalizado, setPersonalizado] = useState<DataRange>({
    inicio: inicioDoMesISO(),
    fim: hojeISO(),
  })

  const resumo = selectFinancialSummary(state, periodo, personalizado)

  // Estados de modais
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false)
  const [despesaParaEditar, setDespesaParaEditar] = useState<Despesa | null>(null)
  const [despesaParaExcluir, setDespesaParaExcluir] = useState<Despesa | null>(null)
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)
  const [pedidoParaPagamento, setPedidoParaPagamento] = useState<Pedido | null>(null)

  // Filtros aba receitas
  const [filtroStatusReceita, setFiltroStatusReceita] = useState<
    'todos' | 'quitados' | 'pendentes'
  >('todos')
  const [buscaReceita, setBuscaReceita] = useState('')

  // Filtros aba despesas
  const [buscaDespesa, setBuscaDespesa] = useState('')
  const [filtroCategoriaDespesa, setFiltroCategoriaDespesa] = useState<string>('todas')
  const [filtroStatusDespesa, setFiltroStatusDespesa] = useState<'todos' | 'pago' | 'pendente'>(
    'todos',
  )

  // Alternar status pago/pendente da despesa (Regra #5)
  const handleToggleStatusDespesa = (d: Despesa) => {
    dispatch({ type: 'ALTERNAR_STATUS_DESPESA', payload: d.id })
    const novoStatus = d.status === 'pago' ? 'pendente' : 'pago'
    toast.success(
      novoStatus === 'pago'
        ? `Despesa "${d.descricao}" marcada como paga (saída realizada contabilizada).`
        : `Despesa "${d.descricao}" marcada como pendente (removida das saídas realizadas).`,
    )
  }

  const handleExcluirDespesa = () => {
    if (!despesaParaExcluir) return
    dispatch({ type: 'EXCLUIR_DESPESA', payload: despesaParaExcluir.id })
    toast.success(`Despesa "${despesaParaExcluir.descricao}" excluída com sucesso.`)
    setDespesaParaExcluir(null)
  }

  // Pedidos para aba receitas (não cancelados)
  const pedidosReceitas = state.pedidos
    .filter((p) => p.status !== 'cancelado')
    .map((p) => {
      const pago = selectPagamentosDoPedido(state, p.id).reduce((s, pag) => s + pag.valor, 0)
      const saldo = Math.max(0, p.valorTotal - pago)
      const cliente = selectClientePorId(state, p.clienteId)
      return { ...p, valorPago: pago, saldoPendente: saldo, clienteNome: cliente?.nome || '—' }
    })
    .filter((p) => {
      if (buscaReceita.trim()) {
        const t = buscaReceita.toLowerCase()
        if (!p.codigo.toLowerCase().includes(t) && !p.clienteNome.toLowerCase().includes(t)) {
          return false
        }
      }
      if (filtroStatusReceita === 'quitados' && p.saldoPendente > 0.01) return false
      if (filtroStatusReceita === 'pendentes' && p.saldoPendente <= 0.01) return false
      return true
    })

  // Despesas filtradas
  const despesasFiltradas = state.despesas.filter((d) => {
    if (buscaDespesa.trim()) {
      const t = buscaDespesa.toLowerCase()
      if (!d.descricao.toLowerCase().includes(t) && !d.categoria.toLowerCase().includes(t)) {
        return false
      }
    }
    if (filtroCategoriaDespesa !== 'todas' && d.categoria !== filtroCategoriaDespesa) {
      return false
    }
    if (filtroStatusDespesa !== 'todos' && d.status !== filtroStatusDespesa) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* HEADER DA TELA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#0C1014] flex items-center gap-1.5">
            Gestão Financeira
            <DicaAjuda titulo="Previsto × Realizado" topico="financeiro" lado="bottom">
              <p>
                <strong>Vendas (Faturamento)</strong>: valor dos pedidos vendidos, pagos ou não.
              </p>
              <p>
                <strong>Total Recebido</strong>: o que já entrou no caixa.
              </p>
              <p>
                <strong>Resultado</strong>: recebido menos despesas pagas (lucro realizado).
              </p>
              <p>Clique no status de uma despesa para marcar como paga ou pendente.</p>
            </DicaAjuda>
          </h2>
          <p className="text-xs text-[#6B4B36]">
            Diferenciação clara entre faturamento previsto, recebimentos realizados e saldo de caixa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setModalCategoriasAberto(true)}
            className="border-[#DFC3AE] text-[#6B4B36] hover:text-[#0C1014] text-xs h-10 px-3.5 rounded-xl flex items-center gap-1.5"
          >
            <FolderTree className="w-3.5 h-3.5 text-[#94603D]" />
            <span>Categorias</span>
          </Button>
          <Button
            onClick={() => {
              setDespesaParaEditar(null)
              setModalDespesaAberto(true)
            }}
            className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </Button>
        </div>
      </div>

      {/* FILTRO DE PERÍODO */}
      <PeriodFilterBar
        periodo={periodo}
        onChangePeriodo={setPeriodo}
        personalizado={personalizado}
        onChangePersonalizado={setPersonalizado}
      />

      {/* RESUMO FINANCEIRO (Cards diferenciados visualmente por tipo) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total de vendas (Previsto) */}
        <Card className="border-[#DFC3AE]/80 bg-white shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4B36] block">
              Vendas (Faturamento)
            </span>
            <div className="font-serif text-base font-bold text-[#0C1014] truncate">
              <CountUpNumber value={resumo.faturamentoTotal} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A5683F]" />
              Receita prevista
            </p>
          </CardContent>
        </Card>

        {/* Total Recebido (Realizado) */}
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
              Total Recebido
            </span>
            <div className="font-serif text-base font-bold text-[#3F7A4E] truncate">
              <CountUpNumber value={resumo.totalRecebido} isCurrency />
            </div>
            <p className="text-[10px] text-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4C8A5A]" />
              Entradas efetivas
            </p>
          </CardContent>
        </Card>

        {/* Total a Receber */}
        <Card className="border-amber-200 bg-amber-50/40 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
              Total a Receber
            </span>
            <div className="font-serif text-base font-bold text-[#8A6416] truncate">
              <CountUpNumber value={resumo.totalAReceber} isCurrency />
            </div>
            <p className="text-[10px] text-amber-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
              Saldo a receber
            </p>
          </CardContent>
        </Card>

        {/* Despesas Pagas (Realizado) */}
        <Card className="border-red-200 bg-red-50/30 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block">
              Despesas Pagas
            </span>
            <div className="font-serif text-base font-bold text-[#A84A34] truncate">
              <CountUpNumber value={resumo.despesasPagas} isCurrency />
            </div>
            <p className="text-[10px] text-red-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B5533C]" />
              Saídas realizadas
            </p>
          </CardContent>
        </Card>

        {/* Despesas Pendentes */}
        <Card className="border-[#DFC3AE]/80 bg-white shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4B36] block">
              Despesas Pendentes
            </span>
            <div className="font-serif text-base font-bold text-[#6B4B36] truncate">
              <CountUpNumber value={resumo.despesasPendentes} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Contas a pagar
            </p>
          </CardContent>
        </Card>

        {/* Resultado Financeiro */}
        <Card className="border-[#C48864]/50 bg-[#C48864]/10 shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0C1014] block">
              Resultado (Lucro)
            </span>
            <div className="font-serif text-base font-bold text-[#0C1014] truncate">
              <CountUpNumber value={resumo.resultadoFinanceiro} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36] leading-tight">Recebido − despesas pagas</p>
          </CardContent>
        </Card>

        {/* Saldo de Caixa (Realizado) */}
        <Card className="border-[#6B4B36]/40 bg-[#6B4B36]/10 shadow-xs col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4B36] block">
              Saldo de Caixa
            </span>
            <div className="font-serif text-base font-bold text-[#6B4B36] truncate">
              <CountUpNumber value={resumo.saldoDeCaixa} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/90 font-medium">100% Realizado</p>
          </CardContent>
        </Card>
      </div>

      {/* ABAS: RECEITAS (PEDIDOS) E DESPESAS */}
      <Tabs defaultValue="receitas" className="space-y-4">
        <TabsList className="bg-white p-1 rounded-xl border border-[#DFC3AE]/70 shadow-xs h-11">
          <TabsTrigger
            value="receitas"
            className="data-[state=active]:bg-[#A5683F] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4"
          >
            Receitas &amp; Pedidos ({pedidosReceitas.length})
          </TabsTrigger>
          <TabsTrigger
            value="despesas"
            className="data-[state=active]:bg-[#A5683F] data-[state=active]:text-white rounded-lg text-xs font-semibold px-4"
          >
            Despesas &amp; Saídas ({despesasFiltradas.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA RECEITAS */}
        <TabsContent value="receitas" className="space-y-4 m-0">
          {/* Filtros de Receitas */}
          <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar pedido (nº) ou cliente..."
                value={buscaReceita}
                onChange={(e) => setBuscaReceita(e.target.value)}
                className="pl-9 h-9 text-xs border-[#DFC3AE]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select
                value={filtroStatusReceita}
                onValueChange={(val: any) => setFiltroStatusReceita(val)}
              >
                <SelectTrigger
                  aria-label="Filtrar receitas por situação"
                  className="h-9 text-xs border-[#DFC3AE] w-48"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os pedidos
                  </SelectItem>
                  <SelectItem value="quitados" className="text-xs">
                    Somente quitados (pagos)
                  </SelectItem>
                  <SelectItem value="pendentes" className="text-xs">
                    Com saldo a receber
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Receitas */}
          <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Total Pedido</th>
                    <th className="py-3 px-4">Já Recebido</th>
                    <th className="py-3 px-4">Saldo Restante</th>
                    <th className="py-3 px-4">Status Pagto</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFC3AE]/40 text-[#0C1014]">
                  {pedidosReceitas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#6B4B36]">
                        Nenhum pedido encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    pedidosReceitas.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F7F3EA]/50 transition-colors">
                        <td className="py-3 px-4 font-serif font-bold text-[#0C1014]">
                          {p.codigo}
                        </td>
                        <td className="py-3 px-4 font-medium">{p.clienteNome}</td>
                        <td className="py-3 px-4 text-[#6B4B36]">{formatDataBR(p.dataCriacao)}</td>
                        <td className="py-3 px-4 font-serif font-bold text-[#0C1014]">
                          {formatBRL(p.valorTotal)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#3F7A4E]">
                          {formatBRL(p.valorPago)}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#8A6416]">
                          {p.saldoPendente > 0.01 ? formatBRL(p.saldoPendente) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            className={`text-[10px] font-semibold border-none ${
                              p.statusPagamento === 'pago'
                                ? 'bg-[#4C8A5A]/15 text-[#3F7A4E]'
                                : p.statusPagamento === 'parcial'
                                  ? 'bg-[#D9A441]/15 text-[#8A6416]'
                                  : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {p.statusPagamento}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.saldoPendente > 0.01 ? (
                            <Button
                              size="sm"
                              onClick={() => setPedidoParaPagamento(p)}
                              className="h-7 text-[11px] bg-[#A5683F] hover:bg-[#8C5636] text-white px-3"
                            >
                              Receber
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#3F7A4E] font-medium flex items-center justify-end gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> Quitado
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* ABA DESPESAS */}
        <TabsContent value="despesas" className="space-y-4 m-0">
          {/* Filtros de Despesas */}
          <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Buscar despesa ou fornecedor..."
                value={buscaDespesa}
                onChange={(e) => setBuscaDespesa(e.target.value)}
                className="pl-9 h-9 text-xs border-[#DFC3AE]"
              />
            </div>

            <div className="sm:col-span-4">
              <Select value={filtroCategoriaDespesa} onValueChange={setFiltroCategoriaDespesa}>
                <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                  <SelectValue placeholder="Categoria..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as Categorias
                  </SelectItem>
                  {state.categoriasDespesa.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select
                value={filtroStatusDespesa}
                onValueChange={(val: any) => setFiltroStatusDespesa(val)}
              >
                <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="pago" className="text-xs">
                    Pagas (Realizadas)
                  </SelectItem>
                  <SelectItem value="pendente" className="text-xs">
                    Pendentes (Previstas)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela de Despesas */}
          <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Forma Pagto</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFC3AE]/40 text-[#0C1014]">
                  {despesasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#6B4B36]">
                        Nenhuma despesa cadastrada ou encontrada com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    despesasFiltradas.map((d) => (
                      <tr
                        key={d.id}
                        className={`hover:bg-[#F7F3EA]/50 transition-colors ${
                          d.status === 'pendente' ? 'bg-[#F7F3EA]/20' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#0C1014]">{d.descricao}</p>
                          {d.observacoes && (
                            <p className="text-[10px] text-[#6B4B36] italic">{d.observacoes}</p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className="text-[10px] text-[#6B4B36] border-[#DFC3AE]"
                          >
                            {d.categoria}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-[#6B4B36]">{formatDataBR(d.data)}</td>
                        <td className="py-3 px-4 text-[#6B4B36]">
                          {d.vencimento ? formatDataBR(d.vencimento) : '—'}
                        </td>
                        <td className="py-3 px-4 text-[#6B4B36]">{d.formaPagamento}</td>
                        <td className="py-3 px-4 font-serif font-bold text-[#A84A34]">
                          {formatBRL(d.valor)}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleStatusDespesa(d)}
                            className="cursor-pointer"
                            title="Clique para alternar entre Pago e Pendente"
                          >
                            {d.status === 'pago' ? (
                              <Badge className="bg-[#4C8A5A]/15 text-[#3F7A4E] hover:bg-[#4C8A5A]/25 border-none text-[10px]">
                                Pago
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none text-[10px]">
                                Pendente
                              </Badge>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              aria-label="Editar despesa"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDespesaParaEditar(d)
                                setModalDespesaAberto(true)
                              }}
                              className="h-7 text-[11px] text-[#6B4B36] hover:text-[#0C1014] px-2"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              aria-label="Excluir despesa"
                              size="sm"
                              variant="ghost"
                              onClick={() => setDespesaParaExcluir(d)}
                              className="h-7 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL DE PAGAMENTO PARA RECEITA */}
      <ModalPagamento
        pedido={pedidoParaPagamento}
        aberto={Boolean(pedidoParaPagamento)}
        onFechar={() => setPedidoParaPagamento(null)}
      />

      {/* FORMULÁRIO DE DESPESA */}
      <FormDespesaModal
        aberto={modalDespesaAberto}
        onFechar={() => {
          setModalDespesaAberto(false)
          setDespesaParaEditar(null)
        }}
        despesaParaEditar={despesaParaEditar}
      />

      {/* MODAL DE CATEGORIAS */}
      <ModalCategorias
        aberto={modalCategoriasAberto}
        onFechar={() => setModalCategoriasAberto(false)}
      />

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE DESPESA */}
      <AlertDialog
        open={Boolean(despesaParaExcluir)}
        onOpenChange={(open) => !open && setDespesaParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Excluir Despesa?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              Tem certeza que deseja excluir o lançamento de{' '}
              <strong>{despesaParaExcluir?.descricao}</strong> no valor de{' '}
              <strong>{formatBRL(despesaParaExcluir?.valor || 0)}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirDespesa}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Excluir Despesa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
