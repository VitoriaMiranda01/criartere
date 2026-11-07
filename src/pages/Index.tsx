import { etapasDoKanban } from '@/store/etapas'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { selectFinancialSummary, selectPagamentosDoPedido } from '@/store/selectors'
import { PeriodoFiltro, DataRange, OrderStatus } from '@/types/criartere'
import { PeriodFilterBar } from '@/components/common/PeriodFilterBar'
import { CountUpNumber } from '@/components/common/CountUpNumber'
import { formatDataBR, formatBRL } from '@/store/periodUtils'
import {
  TrendingUp,
  CreditCard,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  ShoppingBag,
  ChevronRight,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

export default function Index() {
  const navigate = useNavigate()
  const { state } = useCriartere()

  const [periodo, setPeriodo] = useState<PeriodoFiltro>(state.config.periodoPadraoDashboard)
  const [personalizado, setPersonalizado] = useState<DataRange>({
    inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    fim: new Date().toISOString().slice(0, 10),
  })

  const resumo = selectFinancialSummary(state, periodo, personalizado)

  // Status operacionais com suas cores e contagens
  const statusChips: { id: OrderStatus; label: string; cor: string; bg: string }[] = etapasDoKanban(
    state,
  ).map((e) => ({ id: e.chave, label: e.nome, cor: e.cor, bg: `${e.cor}14` }))

  const contagemPorStatus = statusChips.reduce(
    (acc, chip) => {
      acc[chip.id] = state.pedidos.filter((p) => p.status === chip.id).length
      return acc
    },
    {} as Record<OrderStatus, number>,
  )

  // Dados mensais para os gráficos (agrupados pelos últimos 6 meses)
  const mesesNomes = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const hoje = new Date()
  const dadosMensais: {
    mes: string
    mesNome: string
    receitas: number
    despesas: number
    resultado: number
  }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const mesIdx = d.getMonth()
    const anoStr = d.getFullYear().toString()
    const mesStr = (mesIdx + 1).toString().padStart(2, '0')
    const chaveMes = `${anoStr}-${mesStr}`
    const mesNome = `${mesesNomes[mesIdx]}/${anoStr.slice(2)}`

    // Receitas efetivas deste mês (pagamentos de pedidos não cancelados)
    const pedidosValidos = new Set(
      state.pedidos.filter((p) => p.status !== 'cancelado').map((p) => p.id),
    )
    const pagamentosMes = state.pagamentos
      .filter((p) => pedidosValidos.has(p.pedidoId) && p.data.startsWith(chaveMes))
      .reduce((s, p) => s + p.valor, 0)

    // Despesas pagas deste mês
    const despesasMes = state.despesas
      .filter((d) => d.status === 'pago' && d.data.startsWith(chaveMes))
      .reduce((s, d) => s + d.valor, 0)

    dadosMensais.push({
      mes: chaveMes,
      mesNome,
      receitas: pagamentosMes,
      despesas: despesasMes,
      resultado: pagamentosMes - despesasMes,
    })
  }

  // Distribuição de pedidos por status (gráfico Donut)
  const donutCores: Record<string, string> = Object.fromEntries(
    state.etapas.map((e) => [e.nome, e.cor]),
  )

  const dadosDonut = etapasDoKanban(state)
    .map((e) => ({
      name: e.nome,
      value: state.pedidos.filter((p) => p.status === e.chave).length,
    }))
    .filter((item) => item.value > 0)

  // Pedidos Recentes (últimos 5)
  const pedidosRecentes = [...state.pedidos]
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    .slice(0, 5)

  // A Receber em Breve: pedidos não quitados
  const aReceberLista = state.pedidos
    .filter((p) => p.status !== 'cancelado')
    .map((p) => {
      const pago = selectPagamentosDoPedido(state, p.id).reduce((s, pag) => s + pag.valor, 0)
      const saldo = p.valorTotal - pago
      return { ...p, saldoPendente: saldo }
    })
    .filter((p) => p.saldoPendente > 0.01)
    .sort((a, b) =>
      (a.prazoEntrega || a.dataCriacao).localeCompare(b.prazoEntrega || b.dataCriacao),
    )
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Barra de Filtro de Período */}
      <PeriodFilterBar
        periodo={periodo}
        onChangePeriodo={setPeriodo}
        personalizado={personalizado}
        onChangePersonalizado={setPersonalizado}
      />

      {/* LINHA 1: KPIs FINANCEIROS (7 cards responsivos) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* 1. Faturamento Total (Previsto) */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Faturamento Total
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-[#C48864]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#0C1014] truncate">
              <CountUpNumber value={resumo.faturamentoTotal} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C48864]" />
              Receita prevista
            </p>
          </CardContent>
        </Card>

        {/* 2. Total Recebido (Realizado) */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Total Recebido
              </span>
              <CreditCard className="w-3.5 h-3.5 text-[#4C8A5A]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#4C8A5A] truncate">
              <CountUpNumber value={resumo.totalRecebido} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4C8A5A]" />
              Entradas realizadas
            </p>
          </CardContent>
        </Card>

        {/* 3. Total a Receber */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Total a Receber
              </span>
              <Clock className="w-3.5 h-3.5 text-[#D9A441]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#D9A441] truncate">
              <CountUpNumber value={resumo.totalAReceber} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441]" />
              Saldos pendentes
            </p>
          </CardContent>
        </Card>

        {/* 4. Despesas Pagas (Realizadas) */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Despesas Pagas
              </span>
              <ArrowDownRight className="w-3.5 h-3.5 text-[#B5533C]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#B5533C] truncate">
              <CountUpNumber value={resumo.despesasPagas} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B5533C]" />
              Saídas realizadas
            </p>
          </CardContent>
        </Card>

        {/* 5. Despesas Pendentes */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Despesas Pendentes
              </span>
              <Receipt className="w-3.5 h-3.5 text-[#6B4B36]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#6B4B36] truncate">
              <CountUpNumber value={resumo.despesasPendentes} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              A pagar no período
            </p>
          </CardContent>
        </Card>

        {/* 6. Resultado Financeiro (Destaque visual em Terracota) */}
        <Card className="border-[#C48864]/50 shadow-xs bg-[#C48864]/10 col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-[#0C1014]">
                Resultado
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#C48864]" />
            </div>
            <div
              className={`font-serif text-lg font-bold truncate ${
                resumo.resultadoFinanceiro >= 0 ? 'text-[#0C1014]' : 'text-[#B5533C]'
              }`}
            >
              <CountUpNumber value={resumo.resultadoFinanceiro} isCurrency />
            </div>
            <p className="text-[10px] text-[#6B4B36] font-medium">Recebido − Desp. pagas</p>
          </CardContent>
        </Card>

        {/* 7. Quantidade de Vendas */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white col-span-2 sm:col-span-1">
          <CardContent className="p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs text-[#6B4B36]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Vendas</span>
              <ShoppingBag className="w-3.5 h-3.5 text-[#C48864]" />
            </div>
            <div className="font-serif text-lg font-bold text-[#0C1014]">
              <CountUpNumber value={resumo.quantidadeVendas} prefix="" />
            </div>
            <p className="text-[10px] text-[#6B4B36]/80 truncate">
              Ticket: {formatBRL(resumo.ticketMedio)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 2: KPIs OPERACIONAIS CLICÁVEIS (Direcionam para /pedidos com filtro) */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B4B36]">
            Status Operacionais dos Pedidos
          </span>
          <span className="text-[11px] text-[#6B4B36]/80">
            Clique para filtrar na tela de pedidos
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
          {statusChips.map((chip) => {
            const count = contagemPorStatus[chip.id] || 0
            return (
              <button
                key={chip.id}
                onClick={() => navigate(`/pedidos?status=${chip.id}`)}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#DFC3AE]/50 hover:border-[#C48864] transition-all text-left group"
                style={{ backgroundColor: chip.bg }}
              >
                <div className="min-w-0 pr-1">
                  <p className="text-[11px] font-medium text-[#6B4B36] truncate group-hover:text-[#0C1014]">
                    {chip.label}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-bold text-white shrink-0"
                  style={{ backgroundColor: chip.cor }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* LINHA 3: SEÇÃO DE GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Comparativo Receitas x Despesas (2 colunas) */}
        <Card className="lg:col-span-2 border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0C1014]">
                  Evolução Mensal: Receitas × Despesas
                </h3>
                <p className="text-xs text-[#6B4B36]">
                  Valores efetivamente recebidos e despesas pagas nos últimos 6 meses
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosMensais} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="mesNome" stroke="#6B4B36" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#6B4B36"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `R$${v}`}
                  />
                  <Tooltip
                    formatter={(val: any) => formatBRL(Number(val) || 0)}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DFC3AE',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    dataKey="receitas"
                    name="Recebido (R$)"
                    fill="#C48864"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="despesas"
                    name="Despesas pagas (R$)"
                    fill="#8A5A3B"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico 2: Distribuição dos Pedidos por Status (Donut) */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-5">
            <h3 className="font-serif text-base font-semibold text-[#0C1014] mb-1">
              Pedidos por Status
            </h3>
            <p className="text-xs text-[#6B4B36] mb-4">
              Total de {state.pedidos.length} pedidos registrados
            </p>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dadosDonut}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {dadosDonut.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={donutCores[entry.name] || '#C48864'} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} pedidos`, 'Quantidade']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#DFC3AE',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda compacta */}
            <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px] text-[#6B4B36]">
              {dadosDonut.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: donutCores[item.name] || '#C48864' }}
                  />
                  <span className="truncate">{item.name}:</span>
                  <span className="font-bold text-[#0C1014]">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 3: Evolução do Resultado Financeiro (Área) */}
      <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-base font-semibold text-[#0C1014]">
                Evolução do Resultado Financeiro Líquido
              </h3>
              <p className="text-xs text-[#6B4B36]">
                Lucro realizado mês a mês (entradas recebidas − saídas pagas)
              </p>
            </div>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosMensais} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="corResultado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C48864" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#C48864" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="mesNome" stroke="#6B4B36" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#6B4B36"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip
                  formatter={(val: any) => [formatBRL(Number(val) || 0), 'Resultado Líquido']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#DFC3AE',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="resultado"
                  stroke="#C48864"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#corResultado)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* LINHA 4: LISTAS (Pedidos recentes & A receber em breve) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos Recentes */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-semibold text-[#0C1014]">
                Pedidos Recentes
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pedidos')}
                className="text-xs text-[#C48864] hover:text-[#B0764F] hover:bg-[#F7F3EA] p-1 h-auto"
              >
                Ver todos
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {pedidosRecentes.map((ped) => {
                const cliente = state.clientes.find((c) => c.id === ped.clienteId)
                return (
                  <div
                    key={ped.id}
                    onClick={() => navigate(`/pedidos?busca=${encodeURIComponent(ped.codigo)}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#DFC3AE]/40 hover:bg-[#F7F3EA]/70 cursor-pointer transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#0C1014]">{ped.codigo}</span>
                        <span className="text-xs text-[#6B4B36]">{cliente?.nome || 'Cliente'}</span>
                      </div>
                      <p className="text-[11px] text-[#6B4B36]/80">
                        {ped.itens.length} {ped.itens.length === 1 ? 'item' : 'itens'} &bull; Criado
                        em {formatDataBR(ped.dataCriacao)}
                      </p>
                    </div>

                    <div className="text-right space-y-0.5">
                      <p className="font-serif font-bold text-xs text-[#0C1014]">
                        {formatBRL(ped.valorTotal)}
                      </p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0 border-none ${
                          ped.status === 'entregue'
                            ? 'bg-[#4C8A5A]/15 text-[#4C8A5A]'
                            : ped.status === 'cancelado'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-[#C48864]/15 text-[#C48864]'
                        }`}
                      >
                        {ped.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* A Receber em Breve */}
        <Card className="border-[#DFC3AE]/70 shadow-xs bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#0C1014]">
                  A Receber em Breve
                </h3>
                <p className="text-xs text-[#6B4B36]">
                  Pedidos ativos com saldo de pagamento pendente
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/financeiro')}
                className="text-xs text-[#C48864] hover:text-[#B0764F] hover:bg-[#F7F3EA] p-1 h-auto"
              >
                Financeiro
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            {aReceberLista.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B4B36]">
                Nenhum pagamento pendente no momento! Todos os pedidos ativos estão quitados.
              </div>
            ) : (
              <div className="space-y-2.5">
                {aReceberLista.map((ped) => {
                  const cliente = state.clientes.find((c) => c.id === ped.clienteId)
                  return (
                    <div
                      key={ped.id}
                      onClick={() => navigate(`/pedidos?busca=${encodeURIComponent(ped.codigo)}`)}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#DFC3AE]/40 hover:bg-[#F7F3EA]/70 cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#0C1014]">{ped.codigo}</span>
                          <span className="text-xs text-[#6B4B36]">
                            {cliente?.nome || 'Cliente'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B4B36]/80 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#D9A441]" />
                          Prazo: {formatDataBR(ped.prazoEntrega)} &bull; Forma: {ped.formaPagamento}
                        </p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <p className="font-serif font-bold text-xs text-[#D9A441]">
                          Falta: {formatBRL(ped.saldoPendente)}
                        </p>
                        <p className="text-[10px] text-[#6B4B36]/70">
                          Total: {formatBRL(ped.valorTotal)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
