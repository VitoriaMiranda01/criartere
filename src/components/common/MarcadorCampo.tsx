/* Marcadores de campo: asterisco vermelho para obrigatório e "(opcional)" para os demais. */
export function Obrigatorio() {
  return (
    <span className="text-red-500 font-bold ml-0.5" aria-hidden="true" title="Obrigatório">
      *
    </span>
  )
}

export function Opcional() {
  return (
    <span className="ml-1 text-[0.85em] font-normal normal-case tracking-normal text-[#6B4B36]/90 whitespace-nowrap">
      (opcional)
    </span>
  )
}
