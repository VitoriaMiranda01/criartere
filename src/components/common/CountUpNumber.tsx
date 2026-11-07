import React, { useEffect, useRef, useState } from 'react'

interface CountUpNumberProps {
  value: number
  isCurrency?: boolean
  prefix?: string
  duration?: number // ms
}

export const CountUpNumber: React.FC<CountUpNumberProps> = ({
  value,
  isCurrency = false,
  prefix = '',
  duration = 500,
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const valorAtual = useRef(value)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const startValue = valorAtual.current
    const diff = value - startValue
    let inicio: number | null = null

    if (Math.abs(diff) < 0.01) {
      valorAtual.current = value
      setDisplayValue(value)
      return
    }

    const step = (timestamp: number) => {
      if (inicio === null) inicio = timestamp
      const progress = Math.min((timestamp - inicio) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      valorAtual.current = progress < 1 ? startValue + diff * easeProgress : value
      setDisplayValue(valorAtual.current)
      if (progress < 1) frame.current = window.requestAnimationFrame(step)
    }

    frame.current = window.requestAnimationFrame(step)
    // Cancela a animação em andamento ao trocar de valor ou desmontar
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [value, duration])

  if (isCurrency) {
    return (
      <span>
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(displayValue)}
      </span>
    )
  }

  return (
    <span>
      {prefix}
      {Math.round(displayValue)}
    </span>
  )
}
