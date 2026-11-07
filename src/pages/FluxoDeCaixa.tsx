import React, { useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { selectFluxoCaixa } from '@/store/selectors'
import { PeriodoFiltro, DataRange, MovimentacaoCaixa } from '@/types/criartere'
import { PeriodFilterBar } from '@/components/common/PeriodFilterBar'
import { CountUpNumber } from '@/components/common/CountUpNumber'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Search,
  Info,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'

export default function FluxoDeCaixa() {
  const { state } = useCriartere()
  const navigate = useNavigate()

  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_atual')
  const [personalizado, setPersonalizado] = useState<DataRange>({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    fim: new Date().toISOString().slice(0, 10),
  })

  const { resumo, movimentacoes } = selectFluxoCaixa(state, periodo, personalizado)

  // Filtros locais
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'realizado' | 'pendente'>('todos')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

  // Categorias únicas presentes nas movimentações
  const todasCategorias = Array.from(new Set(movimentacoes.map((m) => m.categoria))).filter(Boolean)

  const movimentacoesFiltradas = movimentacoes.filter((m) => {
    if (busca.trim()) {
      const t = busca.toLowerCase()
      if (!m.descricao.toLowerCase().includes(t) && !m.categoria.toLowerCase().includes(t)) {
        return false
      }
    }
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) {
      return false
    }
    if (filtroStatus !== 'todos' && m.status !== filtroStatus) {
      return false
    }
    if (filtroCategoria !== 'todas' && m.categoria !== filtroCategoria) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#0C1014]">Fluxo de Caixa</h2>
        <p className="text-xs text-[#6B4B36]">
          Histórico cronológico e conciliação financeira de entradas e saídas
        </p>
      </div>

      {/* FILTRO DE PERÍODO */}
      <PeriodFilterBar
        periodo={periodo}
        onChangePeriodo={setPeriodo}
        personalizado={personalizado}
        onChangePersonalizado={setPersonalizado}
      />

      {/* RESUMO STRIP (Realizados vs Previstos com distinção visual rigorosa) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Saldo Inicial do Período */}
        <Card className="border-[#DFC3AE]/80 bg-white shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4B36] block">
              Saldo Inicial
            </span>
            <div className="font-serif text-base font-bold text-[#0C1014] truncate">
              <CountUpNumber value={resumo.saldoInicial} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80">Acumulado anterior</p>
          </CardContent>
        </Card>

        {/* 2. Entradas Realizadas */}
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Entradas Realizadas
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#4C8A5A]" />
            </div>
            <div className="font-serif text-base font-bold text-[#4C8A5A] truncate">
              <CountUpNumber value={resumo.entradasRealizadas} isCurrency />
            </div>
            <p className="text-[10px] text-emerald-700/80">Efetivamente no caixa</p>
          </CardContent>
        </Card>

        {/* 3. Saídas Realizadas */}
        <Card className="border-red-200 bg-red-50/30 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-red-800">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Saídas Realizadas
              </span>
              <ArrowDownRight className="w-3.5 h-3.5 text-[#B5533C]" />
            </div>
            <div className="font-serif text-base font-bold text-[#B5533C] truncate">
              <CountUpNumber value={resumo.saidasRealizadas} isCurrency />
            </div>
            <p className="text-[10px] text-red-700/80">Despesas pagas</p>
          </CardContent>
        </Card>

        {/* 4. Saldo Final do Período (Realizado) */}
        <Card className="border-[#6B4B36]/40 bg-[#6B4B36]/10 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B4B36] block">
              Saldo Final Realizado
            </span>
            <div className="font-serif text-base font-bold text-[#6B4B36] truncate">
              <CountUpNumber value={resumo.saldoFinal} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/90 font-medium">Inicial + Entradas − Saídas</p>
          </CardContent>
        </Card>

        {/* 5. Entradas Previstas (Borda Tracejada - Não soma no saldo) */}
        <Card className="border-2 border-dashed border-[#D9A441]/60 bg-amber-50/20 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[#D9A441]">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Entradas Previstas
              </span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="font-serif text-base font-bold text-[#D9A441] truncate">
              <CountUpNumber value={resumo.entradasPrevistas} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 italic">Não entra no saldo</p>
          </CardContent>
        </Card>

        {/* 6. Saídas Previstas (Borda Tracejada - Não soma no saldo) */}
        <Card className="border-2 border-dashed border-[#6B4B36]/40 bg-[#F7F3EA]/50 shadow-xs">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-[#6B4B36]">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Saídas Previstas
              </span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="font-serif text-base font-bold text-[#6B4B36] truncate">
              <CountUpNumber value={resumo.saidasPrevistas} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 italic">Contas a pagar</p>
          </CardContent>
        </Card>
      </div>

      {/* NOTA EXPLICATIVA SOBRE REGRAS FINANCEIRAS */}
      <div className="p-3.5 bg-white rounded-xl border border-[#DFC3AE]/80 flex items-start gap-2.5 text-xs text-[#6B4B36] shadow-xs">
        <Info className="w-4 h-4 text-[#C48864] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#0C1014]">Regra de Conciliação Criartere:</strong> O saldo de
          caixa contempla <em>somente os valores efetivamente realizados</em> (recebidos via
          Pix/Cartão menos despesas pagas). Valores pendentes aparecem com borda tracejada e
          aparência translúcida e <strong>nunca são somados ao saldo realizado</strong>.
        </div>
      </div>

      {/* FILTROS DA TABELA DE MOVIMENTAÇÕES */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-[#6B4B36]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar movimentação..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs border-[#DFC3AE]"
            />
          </div>

          <div className="sm:col-span-3">
            <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue placeholder="Categoria..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-xs">
                  Todas as Categorias
                </SelectItem>
                {todasCategorias.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <Select value={filtroTipo} onValueChange={(val: any) => setFiltroTipo(val)}>
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Entradas &amp; Saídas
                </SelectItem>
                <SelectItem value="entrada" className="text-xs">
                  Entradas (▲)
                </SelectItem>
                <SelectItem value="saida" className="text-xs">
                  Saídas (▼)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-3">
            <Select value={filtroStatus} onValueChange={(val: any) => setFiltroStatus(val)}>
              <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Realizados &amp; Pendentes
                </SelectItem>
                <SelectItem value="realizado" className="text-xs">
                  Somente Realizados
                </SelectItem>
                <SelectItem value="pendente" className="text-xs">
                  Somente Pendentes (Previstos)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABELA DE MOVIMENTAÇÕES CRONOLÓGICAS */}
      <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Forma</th>
                <th className="py-3 px-4">Valor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Referência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFC3AE]/40 text-[#0C1014]">
              {movimentacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-[#6B4B36]">
                    Nenhuma movimentação registrada no período selecionado.
                  </td>
                </tr>
              ) : (
                movimentacoesFiltradas.map((mov) => {
                  const isEntrada = mov.tipo === 'entrada'
                  const isPendente = mov.status === 'pendente'

                  return (
                    <tr
                      key={mov.id}
                      className={`transition-colors ${
                        isPendente
                          ? 'opacity-65 bg-[#F7F3EA]/30 border-l-4 border-l-dashed border-l-[#D9A441]'
                          : 'hover:bg-[#F7F3EA]/50'
                      }`}
                    >
                      <td className="py-3 px-4 text-[#6B4B36] font-medium whitespace-nowrap">
                        {formatDataBR(mov.data)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0C1014] block">{mov.descricao}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] text-[#6B4B36] border-[#DFC3AE]"
                        >
                          {mov.categoria}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isEntrada ? (
                          <span className="text-[#4C8A5A] font-bold flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
                          </span>
                        ) : (
                          <span className="text-[#B5533C] font-bold flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5" /> Saída
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#6B4B36]">{mov.formaPagamento || '—'}</td>
                      <td className="py-3 px-4 font-serif font-bold text-xs whitespace-nowrap">
                        <span className={isEntrada ? 'text-[#4C8A5A]' : 'text-[#B5533C]'}>
                          {isEntrada ? '+' : '-'} {formatBRL(mov.valor)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isPendente ? (
                          <Badge
                            variant="outline"
                            className="border-dashed border-amber-400 text-amber-700 bg-amber-50 text-[10px]"
                          >
                            Pendente
                          </Badge>
                        ) : (
                          <Badge className="bg-[#4C8A5A]/15 text-[#4C8A5A] border-none text-[10px]">
                            Realizado
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {mov.pedidoId && (
                          <button
                            onClick={() => navigate(`/pedidos`)}
                            className="text-[#C48864] hover:underline text-[11px] font-semibold inline-flex items-center gap-0.5"
                          >
                            <span>Ver Pedido</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {mov.despesaId && (
                          <span className="text-[11px] text-[#6B4B36]">Despesa</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
