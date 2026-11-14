/* Main App Component - Handles routing (using react-router-dom) */
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CriartereProvider } from '@/store/CriartereContext'
import { ErroTela } from '@/components/common/ErroTela'

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
// Loja virtual (pública)
const LojaLayout = lazy(() => import('./loja/LojaLayout'))
const LojaCatalogo = lazy(() => import('./pages/loja/Catalogo'))
const LojaProduto = lazy(() => import('./pages/loja/ProdutoDetalhe'))
const LojaFavoritos = lazy(() => import('./pages/loja/Favoritos'))
const LojaCarrinho = lazy(() => import('./pages/loja/Carrinho'))
const LojaEntrar = lazy(() => import('./pages/loja/Entrar'))
const LojaNaoEncontrada = lazy(() => import('./pages/loja/NaoEncontrada'))
const LojaConta = lazy(() => import('./pages/loja/Conta'))

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

/** /loja → /, /loja/produto/x → /produto/x (links já compartilhados continuam valendo) */
function EnderecoAntigoLoja() {
  const { pathname, search, hash } = useLocation()
  const novo = pathname.replace(/^\/loja\/?/, '/')
  return <Navigate to={`${novo}${search}${hash}`} replace />
}

/** Leva endereços antigos (ex.: /pedidos?busca=0012) para o painel em /admin, mantendo filtros. */
function EnderecoAntigoAdmin() {
  const { pathname, search, hash } = useLocation()
  return <Navigate to={`/admin${pathname}${search}${hash}`} replace />
}

const App = () => (
  <CriartereProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" richColors />
      <BrowserRouter>
        <ErroTela>
          <Suspense fallback={<CarregandoTela />}>
            <Routes>
              {/* Loja virtual: catálogo público, favoritos e carrinho dos clientes */}
              <Route path="/" element={<LojaLayout />}>
                <Route index element={<LojaCatalogo />} />
                <Route path="produto/:id" element={<LojaProduto />} />
                <Route path="favoritos" element={<LojaFavoritos />} />
                <Route path="carrinho" element={<LojaCarrinho />} />
                <Route path="entrar" element={<LojaEntrar />} />
                <Route path="conta" element={<LojaConta />} />
                <Route path="*" element={<LojaNaoEncontrada />} />
              </Route>

              {/* Endereços antigos da loja (/loja/...) → raiz do site */}
              <Route path="/loja/*" element={<EnderecoAntigoLoja />} />

              {/* Painel administrativo: criartere.com.br/admin */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<Layout />}>
                <Route index element={<Index />} />
                <Route path="pedidos" element={<Pedidos />} />
                <Route path="orcamentos" element={<Orcamentos />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="financeiro" element={<Financeiro />} />
                <Route path="fluxo-de-caixa" element={<FluxoDeCaixa />} />
                <Route path="relatorios" element={<Relatorios />} />
                <Route path="configuracoes" element={<Configuracoes />} />
                <Route path="ajuda" element={<Ajuda />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Route>

              {/* Endereços antigos do painel (favoritos e app instalado) → /admin/... */}
              {[
                'login',
                'pedidos',
                'orcamentos',
                'clientes',
                'produtos',
                'financeiro',
                'fluxo-de-caixa',
                'relatorios',
                'configuracoes',
                'ajuda',
              ].map((p) => (
                <Route key={p} path={`/${p}`} element={<EnderecoAntigoAdmin />} />
              ))}

              {/* Endereços inexistentes caem na página "não encontrada" da loja (rota * acima) */}
            </Routes>
          </Suspense>
        </ErroTela>
      </BrowserRouter>
    </TooltipProvider>
  </CriartereProvider>
)

export default App
