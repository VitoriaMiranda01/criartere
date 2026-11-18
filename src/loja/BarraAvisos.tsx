/* Barra de avisos (letreiro) no topo da loja.
   Adaptado do componente AnnouncementBar (site da Fran Wig Laces):
   - As frases passam da direita para a esquerda e repetem sem emenda.
   - Pausa com o mouse em cima ou com foco no botão de fechar.
   - Com "reduzir movimento" ligado no sistema, fica parada e centralizada.
   - Botão de fechar: some só até recarregar a página.
   A animação está em main.css (.barra-avisos__faixa). */
import { useState } from 'react'
import { X } from 'lucide-react'

export function BarraAvisos({
  frases,
  fechavel = true,
  segundosPorVolta = 28,
}: {
  frases: string[]
  fechavel?: boolean
  segundosPorVolta?: number
}) {
  const [fechada, setFechada] = useState(false)
  const lista = frases.map((f) => f.trim()).filter(Boolean)
  if (fechada || lista.length === 0) return null

  // Repete as frases até encher telas largas. A faixa é desenhada duas vezes e a
  // animação anda exatamente metade (-50%), por isso a volta não tem "pulo".
  let repetidas = [...lista]
  while (repetidas.length < 6) repetidas = [...repetidas, ...lista]

  const faixa = (copia: 'a' | 'b') => (
    <ul className="flex items-center shrink-0" aria-hidden={copia === 'b' || undefined}>
      {repetidas.map((frase, i) => (
        <li key={`${copia}-${i}`} className="inline-flex items-center">
          <span className="whitespace-nowrap px-4 font-semibold tracking-wide text-xs sm:text-[13px]">
            {frase}
          </span>
          <span aria-hidden="true" className="px-2 text-xs text-[#DFC3AE] select-none">
            ✦
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <aside
      aria-label="Avisos da loja"
      className="barra-avisos relative overflow-hidden py-2 bg-[#3A2A1F] text-[#F7F3EA]"
    >
      {/* Leitores de tela leem cada frase uma vez, sem a repetição visual */}
      <ul className="sr-only">
        {lista.map((frase, i) => (
          <li key={i}>{frase}</li>
        ))}
      </ul>

      <div className="flex overflow-hidden w-full" aria-hidden="true">
        <div
          className="barra-avisos__faixa flex items-center will-change-transform"
          style={{ animationDuration: `${segundosPorVolta}s` }}
        >
          {faixa('a')}
          {faixa('b')}
        </div>
      </div>

      {fechavel && (
        <div className="absolute right-0 inset-y-0 pr-2 pl-8 flex items-center bg-gradient-to-l from-[#3A2A1F] from-60% to-transparent">
          <button
            type="button"
            onClick={() => setFechada(true)}
            className="p-1 rounded opacity-70 hover:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#DFC3AE]"
            aria-label="Fechar avisos"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  )
}
