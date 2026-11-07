/* Datas no fuso do aparelho (horário de Brasília para a loja).
   Evita toISOString(), que usa UTC e "pula" para o dia seguinte depois das 21h. */

const p2 = (n: number) => String(n).padStart(2, '0')

/** Data local no formato YYYY-MM-DD. */
export function dataISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/** Hoje (local) no formato YYYY-MM-DD. */
export function hojeISO(): string {
  return dataISO(new Date())
}

/** Data local daqui a N dias (negativo para dias atrás), YYYY-MM-DD. */
export function daquiADias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return dataISO(d)
}

/** Primeiro dia do mês atual (local), YYYY-MM-DD. */
export function inicioDoMesISO(): string {
  const d = new Date()
  return dataISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

/** Data e hora local no formato YYYY-MM-DD HH:mm. */
export function agoraFormatado(): string {
  const d = new Date()
  return `${dataISO(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
