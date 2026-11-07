import React, { useState } from 'react'
import { PeriodoFiltro, DataRange } from '@/types/criartere'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'

interface PeriodFilterBarProps {
  periodo: PeriodoFiltro
  onChangePeriodo: (p: PeriodoFiltro) => void
  personalizado: DataRange
  onChangePersonalizado: (r: DataRange) => void
}

export const PeriodFilterBar: React.FC<PeriodFilterBarProps> = ({
  periodo,
  onChangePeriodo,
  personalizado,
  onChangePersonalizado,
}) => {
  const [mostrarDatas, setMostrarDatas] = useState(periodo === 'personalizado')

  const opcoes: { id: PeriodoFiltro; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ultimos_7', label: 'Últimos 7 dias' },
    { id: 'mes_atual', label: 'Mês atual' },
    { id: 'mes_anterior', label: 'Mês anterior' },
    { id: 'personalizado', label: 'Personalizado' },
  ]

  const handleSelect = (p: PeriodoFiltro) => {
    onChangePeriodo(p)
    if (p === 'personalizado') {
      setMostrarDatas(true)
    } else {
      setMostrarDatas(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-[#DFC3AE]/70 shadow-xs mb-6">
      {/* Pílulas */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {opcoes.map((op) => {
          const ativo = periodo === op.id
          return (
            <button
              key={op.id}
              onClick={() => handleSelect(op.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                ativo
                  ? 'bg-[#C48864] text-white shadow-xs'
                  : 'text-[#6B4B36] hover:bg-[#F7F3EA] hover:text-[#0C1014]'
              }`}
            >
              {op.label}
            </button>
          )
        })}
      </div>

      {/* Inputs para datas quando personalizado */}
      {mostrarDatas && (
        <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DFC3AE]/40">
          <Calendar className="w-3.5 h-3.5 text-[#C48864] shrink-0" />
          <div className="flex items-center gap-1.5 text-xs text-[#6B4B36]">
            <Input
              type="date"
              value={personalizado.inicio}
              onChange={(e) => onChangePersonalizado({ ...personalizado, inicio: e.target.value })}
              className="h-8 text-xs w-32 border-[#DFC3AE]"
            />
            <span>até</span>
            <Input
              type="date"
              value={personalizado.fim}
              onChange={(e) => onChangePersonalizado({ ...personalizado, fim: e.target.value })}
              className="h-8 text-xs w-32 border-[#DFC3AE]"
            />
          </div>
        </div>
      )}
    </div>
  )
}
