import { DicaAjuda } from '@/components/common/DicaAjuda'
import { hojeISO, inicioDoMesISO } from '@/lib/datas'
import React, { useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { selectPagamentosDoPedido, selectClientePorId } from '@/store/selectors'
import { PeriodoFiltro, DataRange } from '@/types/criartere'
import { PeriodFilterBar } from '@/components/common/PeriodFilterBar'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import { exportarParaCSV, imprimirRelatorio } from '@/utils/exportUtils'
import {
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Package,
  Users,
  FolderTree,
  Calendar,
  XCircle,
  Clock,
  DollarSign,
  ChevronRight,
  ArrowLeft,
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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { toast } from 'sonner'

type ReportType =
  | 'vendas_periodo'
  | 'produtos_mais_vendidos'
  | 'clientes_mais_compram'
  | 'despesas_categoria'
  | 'evolucao_mensal'
  | 'pedidos_cancelados'
  | 'pedidos_aguardando'
  | 'valores_a_receber'

export default function Relatorios() {
  const { state } = useCriartere()

  const [relatorioSelecionado, setRelatorioSelecionado] = useState<ReportType | null>(null)
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('mes_atual')
  const [personalizado, setPersonalizado] = useState<DataRange>({
    inicio: inicioDoMesISO(),
    fim: hojeISO(),
  })

  // Lista dos 8 Relatórios exigidos pela especificação
  const listaRelatorios: {
    id: ReportType
    titulo: string
    descricao: string
    icon: React.ElementType
    tag: string
  }[] = [
    {
      id: 'vendas_periodo',
      titulo: '1. Vendas por Período',
      descricao:
        'Detalhamento de todos os pedidos, itens, faturamento previsto e status no intervalo.',
      icon: TrendingUp,
      tag: 'Vendas',
    },
    {
      id: 'produtos_mais_vendidos',
      titulo: '2. Produtos Mais Vendidos',
      descricao:
        'Ranking dos produtos e serviços mais vendidos por quantidade e faturamento acumulado.',
      icon: Package,
      tag: 'Produtos',
    },
    {
      id: 'clientes_mais_compram',
      titulo: '3. Clientes que Mais Compram',
      descricao:
        'Ranking dos melhores clientes da Criartere com total gasto e quantidade de pedidos.',
      icon: Users,
      tag: 'Clientes',
    },
    {
      id: 'despesas_categoria',
      titulo: '4. Despesas por Categoria',
      descricao:
        'Distribuição percentual dos custos da loja (filamento, papel, tinta, fretes, energia, etc).',
      icon: FolderTree,
      tag: 'Custos',
    },
    {
      id: 'evolucao_mensal',
      titulo: '5. Evolução Financeira Mensal',
      descricao: 'Histórico consolidado mês a mês comparando receitas recebidas e despesas pagas.',
      icon: Calendar,
      tag: 'Financeiro',
    },
    {
      id: 'pedidos_cancelados',
      titulo: '6. Pedidos Cancelados',
      descricao:
        'Auditoria de cancelamentos de pedidos com motivos, clientes e valores estornados.',
      icon: XCircle,
      tag: 'Auditoria',
    },
    {
      id: 'pedidos_aguardando',
      titulo: '7. Pedidos Aguardando Pagamento',
      descricao: 'Listagem dos pedidos em aberto dependendo de pagamento para início de produção.',
      icon: Clock,
      tag: 'Cobrança',
    },
    {
      id: 'valores_a_receber',
      titulo: '8. Valores a Receber (Aging)',
      descricao: 'Saldos restantes devidos por clientes com prazos e valores previstos de entrada.',
      icon: DollarSign,
      tag: 'Cobrança',
    },
  ]

  // ===================== DADOS PARA CADA RELATÓRIO =====================

  // 1. Vendas por Período
  const pedidosNoPeriodo = state.pedidos.filter((p) => p.status !== 'cancelado')

  // 2. Produtos mais vendidos
  const vendasPorProdutoMap = new Map<
    string,
    { nome: string; quantidade: number; faturamento: number }
  >()
  state.pedidos
    .filter((p) => p.status !== 'cancelado')
    .forEach((p) => {
      p.itens.forEach((it) => {
        const key = it.nome
        const atual = vendasPorProdutoMap.get(key) || {
          nome: it.nome,
          quantidade: 0,
          faturamento: 0,
        }
        vendasPorProdutoMap.set(key, {
          nome: it.nome,
          quantidade: atual.quantidade + it.quantidade,
          faturamento: atual.faturamento + it.subtotal,
        })
      })
    })
  const rankingProdutos = Array.from(vendasPorProdutoMap.values()).sort(
    (a, b) => b.quantidade - a.quantidade,
  )

  // 3. Clientes que mais compram
  const rankingClientes = state.clientes
    .map((c) => {
      const pedidosCli = state.pedidos.filter(
        (p) => p.clienteId === c.id && p.status !== 'cancelado',
      )
      const totalGasto = pedidosCli.reduce((s, p) => s + p.valorTotal, 0)
      return {
        nome: c.nome,
        telefone: c.telefone,
        pedidosCount: pedidosCli.length,
        totalGasto,
      }
    })
    .sort((a, b) => b.totalGasto - a.totalGasto)

  // 4. Despesas por categoria
  const despesasPorCatMap = new Map<string, number>()
  state.despesas.forEach((d) => {
    const atual = despesasPorCatMap.get(d.categoria) || 0
    despesasPorCatMap.set(d.categoria, atual + d.valor)
  })
  const totalDespesasGeral = Array.from(despesasPorCatMap.values()).reduce((a, b) => a + b, 0)
  const rankingDespesasCat = Array.from(despesasPorCatMap.entries())
    .map(([cat, total]) => ({
      categoria: cat,
      total,
      percentual: totalDespesasGeral > 0 ? (total / totalDespesasGeral) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)

  // 5. Evolução Financeira Mensal (Últimos 6 meses)
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
  const dadosEvolucaoMensal: {
    mesNome: string
    receitas: number
    despesas: number
    resultado: number
  }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
    const chaveMes = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`
    const pedidosValidos = new Set(
      state.pedidos.filter((p) => p.status !== 'cancelado').map((p) => p.id),
    )
    const rec = state.pagamentos
      .filter((p) => pedidosValidos.has(p.pedidoId) && p.data.startsWith(chaveMes))
      .reduce((s, p) => s + p.valor, 0)
    const desp = state.despesas
      .filter((des) => des.status === 'pago' && des.data.startsWith(chaveMes))
      .reduce((s, des) => s + des.valor, 0)
    dadosEvolucaoMensal.push({
      mesNome: `${mesesNomes[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`,
      receitas: rec,
      despesas: desp,
      resultado: rec - desp,
    })
  }

  // 6. Pedidos cancelados
  const pedidosCancelados = state.pedidos.filter((p) => p.status === 'cancelado')

  // 7. Pedidos aguardando pagamento
  const pedidosAguardando = state.pedidos.filter(
    (p) => p.status === 'aguardando_pagamento' && p.statusPagamento !== 'pago',
  )

  // 8. Valores a receber
  const valoresAReceber = state.pedidos
    .filter((p) => p.status !== 'cancelado')
    .map((p) => {
      const pago = selectPagamentosDoPedido(state, p.id).reduce((s, pag) => s + pag.valor, 0)
      const saldo = p.valorTotal - pago
      const cliente = selectClientePorId(state, p.clienteId)
      return {
        ...p,
        clienteNome: cliente?.nome || '—',
        clienteTelefone: cliente?.telefone || '—',
        valorPago: pago,
        saldoRestante: saldo,
      }
    })
    .filter((p) => p.saldoRestante > 0.01)
    .sort((a, b) => b.saldoRestante - a.saldoRestante)

  // ===================== FUNÇÕES DE EXPORTAÇÃO REAL =====================
  const handleExportarExcel = (tipo: ReportType) => {
    const anoAtual = new Date().getFullYear()

    if (tipo === 'vendas_periodo') {
      const cabecalhos = [
        'Código',
        'Cliente',
        'Data',
        'Itens',
        'Forma Pagto',
        'Status',
        'Valor Total (R$)',
      ]
      const linhas = pedidosNoPeriodo.map((p) => {
        const cli = selectClientePorId(state, p.clienteId)
        return [
          p.codigo,
          cli?.nome || '—',
          p.dataCriacao,
          p.itens.map((it) => `${it.quantidade}x ${it.nome}`).join(' | '),
          p.formaPagamento,
          p.status,
          p.valorTotal.toFixed(2),
        ]
      })
      exportarParaCSV(`criartere-vendas-${anoAtual}`, cabecalhos, linhas)
      toast.success('Arquivo Excel (CSV UTF-8) de Vendas gerado com sucesso!')
    }

    if (tipo === 'produtos_mais_vendidos') {
      const cabecalhos = [
        'Posição',
        'Produto/Serviço',
        'Quantidade Vendida (un)',
        'Faturamento Total (R$)',
      ]
      const linhas = rankingProdutos.map((p, idx) => [
        idx + 1,
        p.nome,
        p.quantidade,
        p.faturamento.toFixed(2),
      ])
      exportarParaCSV(`criartere-produtos-mais-vendidos-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de Produtos exportado com sucesso!')
    }

    if (tipo === 'clientes_mais_compram') {
      const cabecalhos = [
        'Posição',
        'Nome do Cliente',
        'Telefone',
        'Qtd de Pedidos',
        'Total Comprado (R$)',
      ]
      const linhas = rankingClientes.map((c, idx) => [
        idx + 1,
        c.nome,
        c.telefone,
        c.pedidosCount,
        c.totalGasto.toFixed(2),
      ])
      exportarParaCSV(`criartere-clientes-top-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de Clientes exportado com sucesso!')
    }

    if (tipo === 'despesas_categoria') {
      const cabecalhos = ['Categoria de Despesa', 'Valor Total (R$)', 'Percentual (%)']
      const linhas = rankingDespesasCat.map((d) => [
        d.categoria,
        d.total.toFixed(2),
        `${d.percentual.toFixed(1)}%`,
      ])
      exportarParaCSV(`criartere-despesas-categoria-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de Despesas exportado com sucesso!')
    }

    if (tipo === 'evolucao_mensal') {
      const cabecalhos = [
        'Mês/Ano',
        'Receitas Recebidas (R$)',
        'Despesas Pagas (R$)',
        'Resultado Líquido (R$)',
      ]
      const linhas = dadosEvolucaoMensal.map((d) => [
        d.mesNome,
        d.receitas.toFixed(2),
        d.despesas.toFixed(2),
        d.resultado.toFixed(2),
      ])
      exportarParaCSV(`criartere-evolucao-mensal-${anoAtual}`, cabecalhos, linhas)
      toast.success('Evolução mensal exportada com sucesso!')
    }

    if (tipo === 'pedidos_cancelados') {
      const cabecalhos = [
        'Código',
        'Cliente',
        'Data Criação',
        'Valor Cancelado (R$)',
        'Motivo Registrado',
      ]
      const linhas = pedidosCancelados.map((p) => {
        const cli = selectClientePorId(state, p.clienteId)
        return [
          p.codigo,
          cli?.nome || '—',
          p.dataCriacao,
          p.valorTotal.toFixed(2),
          p.observacoes || 'Cancelado a pedido do cliente',
        ]
      })
      exportarParaCSV(`criartere-pedidos-cancelados-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de cancelados exportado com sucesso!')
    }

    if (tipo === 'pedidos_aguardando') {
      const cabecalhos = [
        'Código',
        'Cliente',
        'Telefone',
        'Data Criação',
        'Prazo Entrega',
        'Valor (R$)',
      ]
      const linhas = pedidosAguardando.map((p) => {
        const cli = selectClientePorId(state, p.clienteId)
        return [
          p.codigo,
          cli?.nome || '—',
          cli?.telefone || '—',
          p.dataCriacao,
          p.prazoEntrega,
          p.valorTotal.toFixed(2),
        ]
      })
      exportarParaCSV(`criartere-pedidos-aguardando-pagamento-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de pedidos aguardando exportado!')
    }

    if (tipo === 'valores_a_receber') {
      const cabecalhos = [
        'Código Pedido',
        'Cliente',
        'Telefone',
        'Total Pedido (R$)',
        'Já Recebido (R$)',
        'Saldo a Receber (R$)',
      ]
      const linhas = valoresAReceber.map((p) => [
        p.codigo,
        p.clienteNome,
        p.clienteTelefone,
        p.valorTotal.toFixed(2),
        p.valorPago.toFixed(2),
        p.saldoRestante.toFixed(2),
      ])
      exportarParaCSV(`criartere-valores-a-receber-${anoAtual}`, cabecalhos, linhas)
      toast.success('Relatório de valores a receber exportado!')
    }
  }

  const handleExportarPDF = (titulo: string) => {
    imprimirRelatorio(titulo)
  }

  const relAtualObj = listaRelatorios.find((r) => r.id === relatorioSelecionado)

  return (
    <div className="space-y-6">
      {/* VISTA PRINCIPAL: SELEÇÃO DE RELATÓRIOS OU VISÃO DO RELATÓRIO */}
      {!relatorioSelecionado ? (
        <>
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0C1014]">
              Relatórios e Análises Gerenciais
            </h2>
            <p className="text-xs text-[#6B4B36]">
              Selecione um dos 8 relatórios operacionais e financeiros da Criartere para visualizar
              e exportar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {listaRelatorios.map((rel) => {
              const Icon = rel.icon
              return (
                <Card
                  key={rel.id}
                  onClick={() => setRelatorioSelecionado(rel.id)}
                  className="border-[#DFC3AE]/70 shadow-xs hover:shadow-md hover:border-[#C48864] transition-all bg-white cursor-pointer flex flex-col justify-between group"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-[#C48864]/15 flex items-center justify-center text-[#C48864] group-hover:bg-[#C48864] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-[#F7F3EA] text-[#6B4B36] border-[#DFC3AE]"
                      >
                        {rel.tag}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-serif font-bold text-sm text-[#0C1014] group-hover:text-[#C48864] transition-colors">
                        {rel.titulo}
                      </h3>
                      <p className="text-xs text-[#6B4B36] line-clamp-3 mt-1.5 leading-relaxed">
                        {rel.descricao}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#DFC3AE]/40 flex items-center justify-between text-xs font-semibold text-[#C48864]">
                      <span>Abrir Relatório</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        /* VISTA DETALHADA DO RELATÓRIO COM FILTROS E EXPORTAÇÕES */
        <div className="space-y-6">
          {/* Header com botão de voltar e exportações reais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#DFC3AE]/70 shadow-xs">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRelatorioSelecionado(null)}
                className="h-9 px-3 border-[#DFC3AE] text-[#6B4B36]"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Voltar</span>
              </Button>
              <div>
                <h2 className="font-serif text-xl font-bold text-[#0C1014]">
                  {relAtualObj?.titulo}
                </h2>
                <p className="text-xs text-[#6B4B36]">{relAtualObj?.descricao}</p>
              </div>
            </div>

            {/* BOTÕES DE EXPORTAÇÃO REAL */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                onClick={() => handleExportarExcel(relatorioSelecionado)}
                variant="outline"
                className="h-9 text-xs border-[#4C8A5A] text-[#4C8A5A] hover:bg-emerald-50 font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exportar Excel (.csv)</span>
              </Button>

              <Button
                onClick={() => handleExportarPDF(relAtualObj?.titulo || 'Relatorio')}
                className="h-9 text-xs bg-[#C48864] hover:bg-[#B0764F] text-white font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Exportar PDF / Imprimir</span>
              </Button>
            </div>
          </div>

          {/* FILTRO DE PERÍODO PRÓPRIO DO RELATÓRIO */}
          <PeriodFilterBar
            periodo={periodo}
            onChangePeriodo={setPeriodo}
            personalizado={personalizado}
            onChangePersonalizado={setPersonalizado}
          />

          {/* CONTEÚDO ESPECÍFICO DE CADA RELATÓRIO */}

          {/* 1. Vendas por Período */}
          {relatorioSelecionado === 'vendas_periodo' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#0C1014]">
                  Tabela Detalhada de Vendas ({pedidosNoPeriodo.length} pedidos)
                </h3>
                <span className="font-serif font-bold text-sm text-[#C48864]">
                  Total Faturado:{' '}
                  {formatBRL(pedidosNoPeriodo.reduce((s, p) => s + p.valorTotal, 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Itens</th>
                      <th className="py-2.5 px-3">Forma</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {pedidosNoPeriodo.map((p) => {
                      const cli = selectClientePorId(state, p.clienteId)
                      return (
                        <tr key={p.id} className="hover:bg-[#F7F3EA]/40">
                          <td className="py-2.5 px-3 font-serif font-bold">{p.codigo}</td>
                          <td className="py-2.5 px-3">{cli?.nome}</td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {formatDataBR(p.dataCriacao)}
                          </td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {p.itens.map((it) => `${it.quantidade}x ${it.nome}`).join(', ')}
                          </td>
                          <td className="py-2.5 px-3">{p.formaPagamento}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className="text-[10px] capitalize border-[#DFC3AE]"
                            >
                              {p.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-serif font-bold text-right text-[#C48864]">
                            {formatBRL(p.valorTotal)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Produtos mais vendidos */}
          {relatorioSelecionado === 'produtos_mais_vendidos' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-6">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Ranking dos Produtos Mais Vendidos
              </h3>

              {/* Gráfico de barras horizontal */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingProdutos.slice(0, 7)}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                  >
                    <XAxis type="number" stroke="#6B4B36" fontSize={11} />
                    <YAxis
                      dataKey="nome"
                      type="category"
                      stroke="#6B4B36"
                      fontSize={11}
                      width={110}
                    />
                    <Tooltip formatter={(val: any) => [`${val} unidades vendidas`, 'Qtd']} />
                    <Bar dataKey="quantidade" fill="#C48864" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-right">Qtd Vendida</th>
                      <th className="py-2.5 px-3 text-right">Faturamento Gerado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {rankingProdutos.map((p, idx) => (
                      <tr key={p.nome} className="hover:bg-[#F7F3EA]/40">
                        <td className="py-2.5 px-3 font-bold text-[#6B4B36]">{idx + 1}º</td>
                        <td className="py-2.5 px-3 font-semibold text-[#0C1014]">{p.nome}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0C1014]">
                          {p.quantidade} un
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-[#C48864]">
                          {formatBRL(p.faturamento)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Clientes que mais compram */}
          {relatorioSelecionado === 'clientes_mais_compram' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-4">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Top Clientes da Criartere
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Posição</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Telefone</th>
                      <th className="py-2.5 px-3 text-right">Qtd Pedidos</th>
                      <th className="py-2.5 px-3 text-right">Total Comprado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {rankingClientes.map((c, idx) => (
                      <tr
                        key={c.nome}
                        className={`hover:bg-[#F7F3EA]/40 ${idx < 3 ? 'bg-amber-50/20' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-bold text-[#6B4B36]">
                          {idx === 0
                            ? '🥇 1º'
                            : idx === 1
                              ? '🥈 2º'
                              : idx === 2
                                ? '🥉 3º'
                                : `${idx + 1}º`}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#0C1014]">{c.nome}</td>
                        <td className="py-2.5 px-3 text-[#6B4B36]">{c.telefone}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{c.pedidosCount}</td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-[#C48864]">
                          {formatBRL(c.totalGasto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Despesas por categoria */}
          {relatorioSelecionado === 'despesas_categoria' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-6">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Distribuição de Custos por Categoria
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rankingDespesasCat}
                        dataKey="total"
                        nameKey="categoria"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {rankingDespesasCat.map((entry, index) => {
                          const cores = [
                            '#C48864',
                            '#8A5A3B',
                            '#D9A441',
                            '#DFC3AE',
                            '#6B4B36',
                            '#B5533C',
                          ]
                          return <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                        })}
                      </Pie>
                      <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {rankingDespesasCat.map((d) => (
                    <div
                      key={d.categoria}
                      className="p-2.5 rounded-lg border border-[#DFC3AE]/50 bg-[#F7F3EA]/30 flex justify-between text-xs"
                    >
                      <span className="font-semibold text-[#0C1014]">{d.categoria}</span>
                      <div className="text-right">
                        <span className="font-bold text-[#B5533C] mr-2">{formatBRL(d.total)}</span>
                        <span className="text-[#6B4B36] font-medium">
                          ({d.percentual.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 5. Evolução Financeira Mensal */}
          {relatorioSelecionado === 'evolucao_mensal' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-6">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Histórico Consolidado Mês a Mês
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosEvolucaoMensal}>
                    <XAxis dataKey="mesNome" stroke="#6B4B36" fontSize={11} />
                    <YAxis stroke="#6B4B36" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: any) => formatBRL(Number(v) || 0)} />
                    <Legend />
                    <Bar dataKey="receitas" name="Recebido (R$)" fill="#C48864" />
                    <Bar dataKey="despesas" name="Despesas Pagas (R$)" fill="#8A5A3B" />
                    <Bar dataKey="resultado" name="Resultado Líquido (R$)" fill="#4C8A5A" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Mês/Ano</th>
                      <th className="py-2.5 px-3 text-right">Receitas Recebidas</th>
                      <th className="py-2.5 px-3 text-right">Despesas Pagas</th>
                      <th className="py-2.5 px-3 text-right">Resultado Líquido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {dadosEvolucaoMensal.map((d) => (
                      <tr key={d.mesNome} className="hover:bg-[#F7F3EA]/40">
                        <td className="py-2.5 px-3 font-semibold">{d.mesNome}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#4C8A5A]">
                          {formatBRL(d.receitas)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#B5533C]">
                          {formatBRL(d.despesas)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-[#0C1014]">
                          {formatBRL(d.resultado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Pedidos cancelados */}
          {relatorioSelecionado === 'pedidos_cancelados' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-4">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Auditoria de Pedidos Cancelados ({pedidosCancelados.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Valor Estornado</th>
                      <th className="py-2.5 px-3">Motivo Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {pedidosCancelados.map((p) => {
                      const cli = selectClientePorId(state, p.clienteId)
                      return (
                        <tr key={p.id} className="hover:bg-[#F7F3EA]/40">
                          <td className="py-2.5 px-3 font-serif font-bold text-[#B5533C]">
                            {p.codigo}
                          </td>
                          <td className="py-2.5 px-3 font-medium">{cli?.nome}</td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {formatDataBR(p.dataCriacao)}
                          </td>
                          <td className="py-2.5 px-3 font-serif font-bold text-[#B5533C]">
                            {formatBRL(p.valorTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {p.observacoes || 'Cancelado a pedido do cliente'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. Pedidos aguardando pagamento */}
          {relatorioSelecionado === 'pedidos_aguardando' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-4">
              <h3 className="font-serif text-base font-bold text-[#0C1014]">
                Pedidos com Pagamento Pendente ({pedidosAguardando.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Telefone</th>
                      <th className="py-2.5 px-3">Data Pedido</th>
                      <th className="py-2.5 px-3">Prazo Entrega</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {pedidosAguardando.map((p) => {
                      const cli = selectClientePorId(state, p.clienteId)
                      return (
                        <tr key={p.id} className="hover:bg-[#F7F3EA]/40">
                          <td className="py-2.5 px-3 font-serif font-bold">{p.codigo}</td>
                          <td className="py-2.5 px-3 font-medium">{cli?.nome}</td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">{cli?.telefone}</td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {formatDataBR(p.dataCriacao)}
                          </td>
                          <td className="py-2.5 px-3 text-[#6B4B36]">
                            {formatDataBR(p.prazoEntrega)}
                          </td>
                          <td className="py-2.5 px-3 font-serif font-bold text-right text-[#D9A441]">
                            {formatBRL(p.valorTotal)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 8. Valores a receber */}
          {relatorioSelecionado === 'valores_a_receber' && (
            <div className="bg-white rounded-2xl border border-[#DFC3AE]/70 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#0C1014]">
                  Posição de Valores a Receber (Aging de Cobrança)
                  <DicaAjuda>
                    <p>
                      Lista quem ainda deve e há quanto tempo, para priorizar as cobranças mais
                      antigas.
                    </p>
                  </DicaAjuda>
                </h3>
                <span className="font-serif font-bold text-sm text-[#D9A441]">
                  Total a Receber:{' '}
                  {formatBRL(valoresAReceber.reduce((s, p) => s + p.saldoRestante, 0))}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7F3EA] border-b border-[#DFC3AE]/60 text-[#6B4B36] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Contato</th>
                      <th className="py-2.5 px-3 text-right">Total Pedido</th>
                      <th className="py-2.5 px-3 text-right">Já Recebido</th>
                      <th className="py-2.5 px-3 text-right">Saldo a Receber</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFC3AE]/40">
                    {valoresAReceber.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F7F3EA]/40">
                        <td className="py-2.5 px-3 font-serif font-bold">{p.codigo}</td>
                        <td className="py-2.5 px-3 font-medium">{p.clienteNome}</td>
                        <td className="py-2.5 px-3 text-[#6B4B36]">{p.clienteTelefone}</td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold">
                          {formatBRL(p.valorTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#4C8A5A]">
                          {formatBRL(p.valorPago)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-serif font-bold text-[#D9A441]">
                          {formatBRL(p.saldoRestante)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
