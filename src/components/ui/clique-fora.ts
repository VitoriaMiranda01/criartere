/* Proteção dos modais (Dialog) e painéis laterais (Sheet) contra fechamento sem querer.

   Problema: com um campo de seleção (ou balão de ajuda) aberto dentro do modal, o
   clique para fechar a lista também fechava o modal inteiro. A biblioteca (Radix)
   adia o "clique fora do modal" para o fim do clique; nesse momento a lista já
   fechou e o modal entende que o clique foi fora dele.

   Regras aplicadas:
   1. Se havia uma lista, menu ou balão aberto quando o clique começou, o clique só
      fecha essa lista: o modal continua aberto.
   2. Um clique dentro da área do modal nunca fecha o modal. */
import * as React from 'react'

// Listas de seleção, menus e balões (Popover) abertos ficam dentro destes elementos
const CAMADAS_FLUTUANTES =
  '[data-radix-popper-content-wrapper], [role="listbox"], [role="menu"], [data-radix-select-viewport]'

let camadaAbertaNoInicioDoClique = false
let ouvindo = false

function ouvirInicioDoClique() {
  if (ouvindo || typeof document === 'undefined') return
  ouvindo = true
  // Fase de captura: roda antes de a lista fechar
  document.addEventListener(
    'pointerdown',
    () => {
      camadaAbertaNoInicioDoClique = document.querySelector(CAMADAS_FLUTUANTES) !== null
    },
    true,
  )
}

type EventoForaDoModal = CustomEvent<{ originalEvent: PointerEvent }>

/** Handler de onPointerDownOutside que impede o fechamento nos casos acima. */
export function useCliqueForaSeguro(
  conteudoRef: React.RefObject<HTMLElement | null>,
  original?: (evento: EventoForaDoModal) => void,
) {
  React.useEffect(ouvirInicioDoClique, [])
  return React.useCallback(
    (evento: EventoForaDoModal) => {
      original?.(evento)
      if (evento.defaultPrevented) return
      if (camadaAbertaNoInicioDoClique) {
        evento.preventDefault()
        return
      }
      const clique = evento.detail?.originalEvent
      const conteudo = conteudoRef.current
      if (conteudo && clique && typeof clique.clientX === 'number') {
        const r = conteudo.getBoundingClientRect()
        const dentro =
          clique.clientX >= r.left &&
          clique.clientX <= r.right &&
          clique.clientY >= r.top &&
          clique.clientY <= r.bottom
        if (dentro) evento.preventDefault()
      }
    },
    [conteudoRef, original],
  )
}

/** Junta a ref interna (usada na proteção) com a ref recebida pelo componente. */
export function useRefsJuntas<T>(...refs: (React.Ref<T> | undefined)[]) {
  return React.useCallback(
    (no: T | null) => {
      for (const ref of refs) {
        if (typeof ref === 'function') ref(no)
        else if (ref) (ref as React.MutableRefObject<T | null>).current = no
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs,
  )
}
