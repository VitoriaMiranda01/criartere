/* Login com o botão oficial do Google (Google Identity Services).
   A janela do Google é aberta pelo próprio site, então o Google mostra
   "criartere.com.br" (e não o endereço do Supabase). O Google devolve um
   token, que é entregue ao Supabase com signInWithIdToken. */

// ID público do cliente OAuth (Google Cloud → Google Auth Platform → Clients).
// Não é segredo: fica visível no código de qualquer site com login do Google.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '480879601433-d6ce8fncl57j1ubtp96lppur39ada526.apps.googleusercontent.com'

interface RespostaCredencial {
  credential: string
}

interface GoogleId {
  initialize: (opcoes: Record<string, unknown>) => void
  renderButton: (elemento: HTMLElement, opcoes: Record<string, unknown>) => void
  prompt: () => void
  cancel: () => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

let carregando: Promise<GoogleId> | null = null

/** Carrega a biblioteca do Google uma única vez (desiste após alguns segundos). */
export function carregarGoogle(tempoLimite = 8000): Promise<GoogleId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  if (carregando) return carregando
  carregando = new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client?hl=pt-BR'
    script.async = true
    script.defer = true
    const timer = setTimeout(() => reject(new Error('tempo esgotado')), tempoLimite)
    script.onload = () => {
      clearTimeout(timer)
      if (window.google?.accounts?.id) resolve(window.google.accounts.id)
      else reject(new Error('biblioteca indisponível'))
    }
    script.onerror = () => {
      clearTimeout(timer)
      reject(new Error('falha ao carregar'))
    }
    document.head.appendChild(script)
  }).catch((e) => {
    carregando = null // permite tentar de novo depois
    throw e
  })
  return carregando
}

/** Número aleatório de uso único: o Google recebe o hash, o Supabase recebe o original. */
export async function gerarNonce(): Promise<{ original: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const original = btoa(String.fromCharCode(...bytes))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(original))
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return { original, hash }
}

export type { RespostaCredencial }
