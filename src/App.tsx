/* Main App Component - Handles routing (using react-router-dom) */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CriartereProvider } from '@/store/CriartereContext'

import Layout from './components/Layout'
import Login from './pages/Login'
import Index from './pages/Index'
import Pedidos from './pages/Pedidos'
import Clientes from './pages/Clientes'
import Produtos from './pages/Produtos'
import Financeiro from './pages/Financeiro'
import FluxoDeCaixa from './pages/FluxoDeCaixa'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import NotFound from './pages/NotFound'

const App = () => (
  <CriartereProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* Rota de Acesso Privado / Login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas autenticadas sob o AppLayout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/fluxo-de-caixa" element={<FluxoDeCaixa />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Rota não encontrada */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </CriartereProvider>
)

export default App
