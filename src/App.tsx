/* Main App Component - Handles routing (using react-router-dom) */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CriartereProvider } from '@/store/CriartereContext'

import Layout from './components/Layout'
import Login from './pages/Login'
const Index = lazy(() => import('./pages/Index'))
const Pedidos = lazy(() => import('./pages/Pedidos'))
const Orcamentos = lazy(() => import('./pages/Orcamentos'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Produtos = lazy(() => import('./pages/Produtos'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const FluxoDeCaixa = lazy(() => import('./pages/FluxoDeCaixa'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Ajuda = lazy(() => import('./pages/Ajuda'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Telas carregadas sob demanda (o site abre mais rápido)
function CarregandoTela() {
  return (
    <div
      className="min-h-[50vh] flex items-center justify-center"
      role="status"
      aria-label="Carregando"
    >
      <span className="w-7 h-7 rounded-full border-2 border-[#DFC3AE] border-t-[#C48864] animate-spin" />
    </div>
  )
}

const App = () => (
  <CriartereProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" richColors />
      <BrowserRouter>
        <Suspense fallback={<CarregandoTela />}>
          <Routes>
            {/* Rota de Acesso Privado / Login */}
            <Route path="/login" element={<Login />} />

            {/* Rotas autenticadas sob o AppLayout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/pedidos" element={<Pedidos />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/produtos" element={<Produtos />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/fluxo-de-caixa" element={<FluxoDeCaixa />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="/ajuda" element={<Ajuda />} />
            </Route>

            {/* Rota não encontrada */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </CriartereProvider>
)

export default App
