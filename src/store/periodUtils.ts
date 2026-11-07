import { PeriodoFiltro, DataRange } from '@/types/criartere'

/**
 * Retorna o intervalo [inicio, fim] em YYYY-MM-DD para cada opção de período
 */
export function getIntervaloPeriodo(
  periodo: PeriodoFiltro,
  personalizado?: DataRange,
): { inicio: string; fim: string } {
  const agora = new Date()
  const format = (d: Date) => d.toISOString().slice(0, 10)

  if (periodo === 'personalizado' && personalizado) {
    return personalizado
  }

  if (periodo === 'hoje') {
    const hojeStr = format(agora)
    return { inicio: hojeStr, fim: hojeStr }
  }

  if (periodo === 'ultimos_7') {
    const d = new Date(agora)
    d.setDate(d.getDate() - 6)
    return { inicio: format(d), fim: format(agora) }
  }

  if (periodo === 'mes_anterior') {
    const ano = agora.getFullYear()
    const mes = agora.getMonth() // 0 a 11, onde agora é o atual; mês anterior é mes - 1
    const primeiroDia = new Date(ano, mes - 1, 1)
    const ultimoDia = new Date(ano, mes, 0)
    return { inicio: format(primeiroDia), fim: format(ultimoDia) }
  }

  // Padrão: mes_atual
  const ano = agora.getFullYear()
  const mes = agora.getMonth()
  const primeiroDia = new Date(ano, mes, 1)
  const ultimoDia = new Date(ano, mes + 1, 0)
  return { inicio: format(primeiroDia), fim: format(ultimoDia) }
}

export function estaNoPeriodo(dataStr: string, inicio: string, fim: string): boolean {
  if (!dataStr) return false
  const target = dataStr.slice(0, 10)
  return target >= inicio && target <= fim
}

export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor || 0)
}

export function formatDataBR(dataStr?: string): string {
  if (!dataStr) return '—'
  const clean = dataStr.slice(0, 10)
  const parts = clean.split('-')
  if (parts.length !== 3) return dataStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
