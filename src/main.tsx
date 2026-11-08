/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import { toast } from 'sonner'
import App from './App.tsx'
import './main.css'

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)

// Depois de uma atualização do site, os arquivos antigos de uma tela deixam de
// existir. Se o app aberto tentar carregá-los, recarrega a página (uma vez) para
// pegar a versão nova em vez de mostrar uma tela em branco.
window.addEventListener('vite:preloadError', (evento) => {
  const ultima = Number(sessionStorage.getItem('criartere-recarga') || 0)
  if (Date.now() - ultima < 10_000) return // evita ficar recarregando em loop
  evento.preventDefault()
  sessionStorage.setItem('criartere-recarga', String(Date.now()))
  window.location.reload()
})

// PWA: registra o service worker (somente no build de produção)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const jaControlado = !!navigator.serviceWorker.controller
    navigator.serviceWorker
      .register('/sw.js')
      .then((registro) => {
        // O app instalado pode ficar aberto por dias: procura versão nova ao voltar para ele
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registro.update().catch(() => undefined)
        })
      })
      .catch(() => {
        // Sem service worker o app continua funcionando normalmente
      })

    // Uma versão nova assumiu: oferece recarregar (sem interromper o que está sendo digitado)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!jaControlado) return
      toast('Nova versão do sistema disponível.', {
        duration: Infinity,
        action: { label: 'Atualizar', onClick: () => window.location.reload() },
      })
    })
  })
}
