import React, { useEffect, useState } from 'react'

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

  useEffect(() => {
    let startTimestamp: number | null = null
    const startValue = displayValue
    const diff = value - startValue

    if (Math.abs(diff) < 0.01) {
      setDisplayValue(value)
      return
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3) // cubic ease-out
      const current = startValue + diff * easeProgress
      setDisplayValue(current)

      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    const reqId = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(reqId)
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
