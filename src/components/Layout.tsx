import { useTituloPagina } from '@/hooks/use-titulo-pagina'
import React, { useState, Suspense } from 'react'
import { NavLink, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { ErroTela } from '@/components/common/ErroTela'
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Users,
  Package,
  Wallet,
  ArrowLeftRight,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  LogOut,
  Menu,
  X,
  Clock,
  Code2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function Layout() {
  const { state, dispatch } = useCriartere()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileMenuAberto, setMobileMenuAberto] = useState(false)
  const [buscaGlobal, setBuscaGlobal] = useState('')
  const [buscaFocada, setBuscaFocada] = useState(false)

  // Título da aba conforme a tela
  const titulos: Record<string, string> = {
    '/': 'Dashboard',
    '/pedidos': 'Pedidos',
    '/orcamentos': 'Orçamentos',
    '/clientes': 'Clientes',
    '/produtos': 'Produtos',
    '/financeiro': 'Financeiro',
    '/fluxo-de-caixa': 'Fluxo de Caixa',
    '/relatorios': 'Relatórios',
    '/configuracoes': 'Configurações',
    '/ajuda': 'Ajuda',
  }
  useTituloPagina(titulos[location.pathname] ?? 'Sistema de Gestão')

  // Aguarda a verificação da sessão
  if (!state.sessaoVerificada) {
    return <TelaCarregando mensagem="Verificando sessão..." />
  }

  // Redireciona se não autenticado
  if (!state.autenticado) {
    return <Navigate to="/login" replace />
  }

  // Não conseguiu confirmar o acesso (ex.: internet caiu bem na hora)
  if (!state.autorizado && state.falhaVerificacao) {
    return (
      <div className="min-h-screen bg-[#F7F3EA] flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="font-serif text-lg font-bold text-[#0C1014]">
            Não foi possível entrar no sistema
          </h1>
          <p className="text-sm text-[#6B4B36]">
            Verifique sua conexão com a internet e tente de novo.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => window.location.reload()}
              className="bg-[#A5683F] hover:bg-[#8C5636] text-white"
            >
              Tentar de novo
            </Button>
            <Button
              variant="outline"
              onClick={() => dispatch({ type: 'LOGOUT' })}
              className="border-[#DFC3AE] text-[#6B4B36]"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Logado, mas ainda verificando se é administrador (ou saindo, se não for)
  if (!state.autorizado) {
    return <TelaCarregando mensagem="Verificando permissões..." />
  }

  if (state.carregando && state.pedidos.length === 0 && state.clientes.length === 0) {
    return <TelaCarregando mensagem="Carregando dados da loja..." />
  }

  // Contagem de pedidos aguardando pagamento para o badge
  const pedidosAguardando = state.pedidos.filter(
    (p) => p.status === 'aguardando_pagamento' && p.statusPagamento !== 'pago',
  ).length

  const orcamentosAguardando = state.orcamentos.filter((o) => o.status === 'aguardando').length

  const handleLogout = () => {
    dispatch({ type: 'LOGOUT' })
  }

  // Itens do menu lateral rigorosamente na ordem do briefing:
  // Dashboard, Pedidos, Clientes, Produtos, Financeiro, Fluxo de caixa, Relatórios, Configurações
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      label: 'Pedidos',
      path: '/pedidos',
      icon: ShoppingBag,
      badge: pedidosAguardando > 0 ? pedidosAguardando : undefined,
    },
    {
      label: 'Orçamentos',
      path: '/orcamentos',
      icon: FileText,
      badge: orcamentosAguardando > 0 ? orcamentosAguardando : undefined,
    },
    { label: 'Clientes', path: '/clientes', icon: Users },
    { label: 'Produtos', path: '/produtos', icon: Package },
    { label: 'Financeiro', path: '/financeiro', icon: Wallet },
    { label: 'Fluxo de Caixa', path: '/fluxo-de-caixa', icon: ArrowLeftRight },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
    { label: 'Ajuda', path: '/ajuda', icon: HelpCircle },
  ]

  // Resultados da busca global (clientes e pedidos)
  const termoBusca = buscaGlobal.trim().toLowerCase()
  const pedidosEncontrados = termoBusca
    ? state.pedidos
        .filter(
          (p) =>
            p.codigo.toLowerCase().includes(termoBusca) ||
            state.clientes
              .find((c) => c.id === p.clienteId)
              ?.nome.toLowerCase()
              .includes(termoBusca),
        )
        .slice(0, 4)
    : []

  const clientesEncontrados = termoBusca
    ? state.clientes
        .filter(
          (c) =>
            c.nome.toLowerCase().includes(termoBusca) ||
            c.telefone.includes(termoBusca) ||
            c.email.toLowerCase().includes(termoBusca),
        )
        .slice(0, 4)
    : []

  const temResultadosBusca = pedidosEncontrados.length > 0 || clientesEncontrados.length > 0

  // Título da página atual baseado na rota
  const getTituloPagina = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard Geral'
    if (path.startsWith('/pedidos')) return 'Gestão de Pedidos'
    if (path.startsWith('/clientes')) return 'Cadastro de Clientes'
    if (path.startsWith('/produtos')) return 'Catálogo de Produtos'
    if (path.startsWith('/financeiro')) return 'Gestão Financeira'
    if (path.startsWith('/fluxo-de-caixa')) return 'Fluxo de Caixa'
    if (path.startsWith('/relatorios')) return 'Relatórios e Análises'
    if (path.startsWith('/configuracoes')) return 'Configurações da Loja'
    return 'Criartere'
  }

  return (
    <div className="min-h-screen bg-[#F7F3EA] text-[#0C1014] flex flex-col lg:flex-row font-sans">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#DFC3AE]/60 shrink-0 sticky top-0 h-screen z-30">
        {/* Brand Block */}
        <div className="p-6 pb-4 border-b border-[#DFC3AE]/40">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="w-9 h-9 shrink-0" />
            <span className="font-serif text-2xl font-bold tracking-tight text-[#0C1014]">
              Criartere
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-[#6B4B36] font-semibold mt-0.5">
            Sistema de Gestão
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-[#C48864]/12 text-[#94603D] font-semibold shadow-xs'
                    : 'text-[#6B4B36] hover:bg-[#F7F3EA] hover:text-[#0C1014]'
                }`}
              >
                {/* Indicador lateral sutil */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#A5683F] rounded-r-md" />
                )}
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#94603D]' : 'text-[#6B4B36]/90 group-hover:text-[#0C1014]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 bg-[#C48864]/20 text-[#6B4B36] text-[11px] font-bold border-none"
                  >
                    {item.badge}
                  </Badge>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-[#DFC3AE]/50 bg-[#F7F3EA]/30 space-y-3">
          {/* User Block */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => navigate('/configuracoes#meu-perfil')}
              title="Editar meu perfil"
              className="flex items-center gap-2.5 min-w-0 text-left rounded-lg p-1 -m-1 hover:bg-[#F7F3EA]"
            >
              <Avatar
                nome={state.usuarioAtual.nome}
                src={state.usuarioAtual.avatarUrl}
                className="w-8 h-8"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0C1014] truncate">
                  {state.usuarioAtual.nome}
                </p>
                <p className="text-[10px] text-[#6B4B36] truncate">
                  {state.usuarioAtual.papel || state.usuarioAtual.email}
                </p>
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-[#6B4B36] hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#DFC3AE]/60 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Abrir menu"
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuAberto(true)}
            className="h-9 w-9 text-[#0C1014]"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" className="w-7 h-7 shrink-0" />
            <span className="font-serif text-xl font-bold tracking-tight text-[#0C1014]">
              Criartere
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/configuracoes#meu-perfil')}
          aria-label="Editar meu perfil"
          className="rounded-full"
        >
          <Avatar
            nome={state.usuarioAtual.nome}
            src={state.usuarioAtual.avatarUrl}
            className="w-7 h-7"
          />
        </button>
      </header>

      {/* DRAWER MOBILE */}
      {mobileMenuAberto && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuAberto(false)}
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-4/5 max-w-xs bg-white h-full z-10 shadow-xl border-r border-[#DFC3AE]/70">
            <div className="p-4 flex items-center justify-between border-b border-[#DFC3AE]/50">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="" className="w-8 h-8 shrink-0" />
                <span className="font-serif text-xl font-bold text-[#0C1014]">Criartere</span>
              </div>
              <Button
                aria-label="Fechar menu"
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuAberto(false)}
                className="h-8 w-8 text-[#6B4B36]"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path)

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuAberto(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#C48864]/15 text-[#94603D] font-semibold'
                        : 'text-[#6B4B36] hover:bg-[#F7F3EA]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 bg-[#C48864]/20 text-[#6B4B36] text-[11px] font-bold border-none"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </NavLink>
                )
              })}
            </nav>

            <div className="p-4 border-t border-[#DFC3AE]/50 space-y-2 bg-[#F7F3EA]/30">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuAberto(false)
                  navigate('/configuracoes#meu-perfil')
                }}
                className="flex items-center gap-2.5 w-full text-left rounded-lg p-1 -m-1 hover:bg-white"
              >
                <Avatar
                  nome={state.usuarioAtual.nome}
                  src={state.usuarioAtual.avatarUrl}
                  className="w-8 h-8"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0C1014]">{state.usuarioAtual.nome}</p>
                  <p className="text-[10px] text-[#6B4B36]">{state.usuarioAtual.email}</p>
                </div>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA PRINCIPAL COM TOPBAR E CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOPBAR DESKTOP & TABLET */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-[#DFC3AE]/50 sticky top-0 z-20">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-[#0C1014]">
              {getTituloPagina()}
            </h1>
            <p className="text-xs text-[#6B4B36]">Criartere &bull; Painel de Controle</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Campo de Busca Global */}
            <div className="relative w-80">
              <div className="relative">
                <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Buscar pedidos (nº) ou clientes..."
                  value={buscaGlobal}
                  onChange={(e) => setBuscaGlobal(e.target.value)}
                  onFocus={() => setBuscaFocada(true)}
                  className="pl-9 pr-4 h-9 rounded-lg border-[#DFC3AE] bg-[#F7F3EA]/40 text-xs focus-visible:ring-[#C48864]"
                />
                {buscaGlobal && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setBuscaGlobal('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B4B36] hover:text-[#0C1014]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown de Busca Global */}
              {buscaFocada && buscaGlobal && (
                <div
                  className="absolute left-0 right-0 top-11 bg-white rounded-xl shadow-lg border border-[#DFC3AE]/70 p-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {!temResultadosBusca ? (
                    <div className="p-4 text-center text-xs text-[#6B4B36]">
                      Nenhum pedido ou cliente encontrado com &quot;{buscaGlobal}&quot;.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {pedidosEncontrados.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider text-[#6B4B36] px-2 py-1">
                            Pedidos
                          </p>
                          {pedidosEncontrados.map((p) => {
                            const cli = state.clientes.find((c) => c.id === p.clienteId)
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  navigate(`/pedidos?busca=${encodeURIComponent(p.codigo)}`)
                                  setBuscaFocada(false)
                                  setBuscaGlobal('')
                                }}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F7F3EA] text-left text-xs transition-colors"
                              >
                                <div>
                                  <span className="font-semibold text-[#0C1014] mr-2">
                                    {p.codigo}
                                  </span>
                                  <span className="text-[#6B4B36]">{cli?.nome || 'Cliente'}</span>
                                </div>
                                <span className="font-medium text-[#94603D]">
                                  R$ {p.valorTotal.toFixed(2)}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}

                      {clientesEncontrados.length > 0 && (
                        <div className="pt-1 border-t border-[#DFC3AE]/40">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-[#6B4B36] px-2 py-1">
                            Clientes
                          </p>
                          {clientesEncontrados.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => {
                                navigate(`/clientes?busca=${encodeURIComponent(c.nome)}`)
                                setBuscaFocada(false)
                                setBuscaGlobal('')
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#F7F3EA] text-left text-xs transition-colors"
                            >
                              <span className="font-semibold text-[#0C1014]">{c.nome}</span>
                              <span className="text-[#6B4B36] text-[11px]">{c.telefone}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notificação de pedidos aguardando pagamento */}
            <NavLink
              to="/pedidos?status=aguardando_pagamento"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DFC3AE]/70 bg-white hover:bg-[#F7F3EA] text-xs font-medium text-[#6B4B36] transition-colors"
              title="Pedidos aguardando pagamento"
            >
              <Clock className="w-3.5 h-3.5 text-[#8A6416]" />
              <span>Aguardando:</span>
              <span className="font-bold text-[#0C1014]">{pedidosAguardando}</span>
            </NavLink>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL (Outlet) */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {state.modoDemo && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-[#5A7D8A]/40 bg-[#5A7D8A]/10 px-4 py-2.5 text-xs text-[#2F4A55]"
            >
              <Code2 className="w-4 h-4 shrink-0 mt-px" />
              <p>
                <strong>Modo desenvolvedor:</strong> os dados exibidos são fictícios. Você pode
                testar tudo à vontade, mas nada é salvo: ao recarregar a página, tudo volta ao
                início.
              </p>
            </div>
          )}
          <ErroTela chave={location.pathname}>
            <Suspense
              fallback={
                <div className="min-h-[40vh] flex items-center justify-center" role="status">
                  <span className="w-7 h-7 rounded-full border-2 border-[#DFC3AE] border-t-[#A5683F] animate-spin" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErroTela>
        </main>
      </div>
    </div>
  )
}

function TelaCarregando({ mensagem }: { mensagem: string }) {
  return (
    <div className="min-h-screen bg-[#F7F3EA] flex flex-col items-center justify-center gap-3">
      <span className="w-8 h-8 rounded-full border-2 border-[#DFC3AE] border-t-[#A5683F] animate-spin" />
      <p className="text-sm text-[#6B4B36]">{mensagem}</p>
    </div>
  )
}

function Avatar({ nome, src, className }: { nome: string; src?: string; className: string }) {
  const iniciais =
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'
  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de ${nome}`}
        className={`${className} rounded-full border border-[#DFC3AE] object-cover shrink-0`}
      />
    )
  }
  return (
    <span
      className={`${className} rounded-full border border-[#DFC3AE] bg-[#F7F3EA] text-[#6B4B36] text-[11px] font-semibold flex items-center justify-center shrink-0`}
    >
      {iniciais}
    </span>
  )
}
