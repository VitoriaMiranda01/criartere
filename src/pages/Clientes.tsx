import { DicaAjuda } from '@/components/common/DicaAjuda'
import { hojeISO } from '@/lib/datas'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { novoId } from '@/lib/supabase'
import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useCriartere } from '@/store/CriartereContext'
import { Cliente } from '@/types/criartere'
import { selectResumoCliente, selectPedidosDoCliente } from '@/store/selectors'
import { formatBRL, formatDataBR } from '@/store/periodUtils'
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export default function Clientes() {
  const { state, dispatch } = useCriartere()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const buscaUrl = searchParams.get('busca') || ''
  const [busca, setBusca] = useState(buscaUrl)

  // Estados de modais
  const [clienteDetalheId, setClienteDetalheId] = useState<string | null>(null)
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null)

  // Modal de aviso de duplicidade (Regra do briefing)
  const [avisoDuplicidadeAberto, setAvisoDuplicidadeAberto] = useState(false)
  const [clienteExistenteDuplicado, setClienteExistenteDuplicado] = useState<Cliente | null>(null)

  // Alerta de exclusão com validação
  const [clienteParaExcluir, setClienteParaExcluir] = useState<Cliente | null>(null)

  // Formulário de Cliente
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [endereco, setEndereco] = useState('')
  const [cidadeUf, setCidadeUf] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')

  const abrirNovoCliente = () => {
    setClienteEditando(null)
    setNome('')
    setTelefone('')
    setWhatsapp('')
    setEmail('')
    setEndereco('')
    setCidadeUf('São Paulo - SP')
    setObservacoes('')
    setErro('')
    setModalFormAberto(true)
  }

  const abrirEditarCliente = (cli: Cliente) => {
    setClienteEditando(cli)
    setNome(cli.nome)
    setTelefone(cli.telefone)
    setWhatsapp(cli.whatsapp)
    setEmail(cli.email)
    setEndereco(cli.endereco)
    setCidadeUf(cli.cidadeUf)
    setObservacoes(cli.observacoes || '')
    setErro('')
    setModalFormAberto(true)
  }

  const handleSalvarCliente = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !telefone.trim()) {
      setErro('Nome completo e telefone são obrigatórios.')
      return
    }

    // Regra de Detecção de Duplicidade: mesmo telefone ou whatsapp
    const telLimpo = telefone.replace(/\D/g, '')
    const duplicado = state.clientes.find(
      (c) =>
        c.id !== clienteEditando?.id &&
        (c.telefone.replace(/\D/g, '') === telLimpo ||
          (whatsapp && c.whatsapp.replace(/\D/g, '') === whatsapp.replace(/\D/g, ''))),
    )

    if (duplicado && !clienteEditando) {
      setClienteExistenteDuplicado(duplicado)
      setAvisoDuplicidadeAberto(true)
      return
    }

    const payload: Cliente = {
      id: clienteEditando ? clienteEditando.id : novoId(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      whatsapp: (whatsapp || telefone).trim(),
      email: email.trim(),
      endereco: endereco.trim(),
      cidadeUf: cidadeUf.trim() || 'São Paulo - SP',
      observacoes: observacoes.trim() || undefined,
      criadoEm: clienteEditando ? clienteEditando.criadoEm : hojeISO(),
    }

    dispatch({ type: 'SALVAR_CLIENTE', payload })
    toast.success(
      clienteEditando
        ? `Cliente "${payload.nome}" atualizado com sucesso!`
        : `Cliente "${payload.nome}" cadastrado com sucesso!`,
    )
    setModalFormAberto(false)
  }

  const handleExcluirCliente = () => {
    if (!clienteParaExcluir) return

    // Regra: Excluir cliente só com confirmação e BLOQUEADO se tiver pedidos
    const pedidos = selectPedidosDoCliente(state, clienteParaExcluir.id)
    if (pedidos.length > 0) {
      toast.error(
        `Não é possível excluir ${clienteParaExcluir.nome}: este cliente possui ${pedidos.length} pedido(s) registrado(s).`,
      )
      setClienteParaExcluir(null)
      return
    }

    dispatch({ type: 'EXCLUIR_CLIENTE', payload: clienteParaExcluir.id })
    toast.success(`Cliente "${clienteParaExcluir.nome}" foi excluído.`)
    if (clienteDetalheId === clienteParaExcluir.id) {
      setClienteDetalheId(null)
    }
    setClienteParaExcluir(null)
  }

  // Filtragem dos clientes
  const clientesFiltrados = state.clientes.filter((c) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    return (
      c.nome.toLowerCase().includes(termo) ||
      c.telefone.includes(termo) ||
      c.email.toLowerCase().includes(termo) ||
      c.cidadeUf.toLowerCase().includes(termo)
    )
  })

  const clienteSelecionado = clienteDetalheId
    ? state.clientes.find((c) => c.id === clienteDetalheId)
    : null
  const resumoClienteSel = clienteSelecionado
    ? selectResumoCliente(state, clienteSelecionado.id)
    : null
  const pedidosClienteSel = clienteSelecionado
    ? selectPedidosDoCliente(state, clienteSelecionado.id)
    : []

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#0C1014] flex items-center gap-1.5">
            Cadastro de Clientes
            <DicaAjuda titulo="Clientes" topico="clientes" lado="bottom">
              <p>
                Clique em um cliente para ver os pedidos, o total comprado e o que falta receber.
              </p>
              <p>Clientes com pedidos não podem ser excluídos, para preservar o histórico.</p>
            </DicaAjuda>
          </h2>
          <p className="text-xs text-[#6B4B36]">
            {state.clientes.length} clientes ativos cadastrados &bull; Histórico individual de
            compras
          </p>
        </div>

        <Button
          onClick={abrirNovoCliente}
          className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Novo Cliente</span>
        </Button>
      </div>

      {/* BARRA DE BUSCA */}
      <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nome, telefone, WhatsApp ou e-mail..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setSearchParams((prev) => {
                if (e.target.value) prev.set('busca', e.target.value)
                else prev.delete('busca')
                return prev
              })
            }}
            className="pl-9 pr-8 h-9 text-xs border-[#DFC3AE]"
          />
          {busca && (
            <button
              aria-label="Limpar busca"
              onClick={() => {
                setBusca('')
                setSearchParams((prev) => {
                  prev.delete('busca')
                  return prev
                })
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B4B36] hover:text-[#0C1014]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* GRID DE CLIENTES (Cards com avatar inicial) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientesFiltrados.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
            <Users className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[#0C1014]">Nenhum cliente encontrado</p>
            <p className="text-xs text-[#6B4B36]">
              Experimente ajustar sua busca ou cadastrar um novo cliente.
            </p>
          </div>
        ) : (
          clientesFiltrados.map((cli) => {
            const resumo = selectResumoCliente(state, cli.id)
            const iniciais = cli.nome
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <Card
                key={cli.id}
                onClick={() => setClienteDetalheId(cli.id)}
                className="border-[#DFC3AE]/70 shadow-xs hover:shadow-md hover:border-[#C48864] transition-all bg-white cursor-pointer group"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar com Terracota */}
                      <div className="w-10 h-10 rounded-full bg-[#C48864]/15 border border-[#C48864]/30 flex items-center justify-center font-serif font-bold text-sm text-[#94603D]">
                        {iniciais}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif font-bold text-sm text-[#0C1014] truncate group-hover:text-[#94603D] transition-colors">
                          {cli.nome}
                        </h3>
                        <p className="text-[11px] text-[#6B4B36] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#94603D]" />
                          <span className="truncate">{cli.cidadeUf || 'São Paulo - SP'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contato rápido */}
                  <div className="space-y-1 text-xs text-[#6B4B36] pt-1">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#6B4B36]/90 shrink-0" />
                      <span>{cli.telefone}</span>
                      {cli.whatsapp && (
                        <span className="text-[10px] text-[#3F7A4E] font-bold bg-[#4C8A5A]/10 px-1.5 py-0.2 rounded">
                          WhatsApp
                        </span>
                      )}
                    </div>
                    {cli.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-[#6B4B36]/90 shrink-0" />
                        <span className="truncate">{cli.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Chips de Resumo de Compras */}
                  <div className="pt-2 border-t border-[#DFC3AE]/40 flex items-center justify-between text-xs">
                    <Badge
                      variant="secondary"
                      className="bg-[#F7F3EA] text-[#6B4B36] border-[#DFC3AE]/70 text-[11px] font-medium"
                    >
                      {resumo.quantidadePedidos}{' '}
                      {resumo.quantidadePedidos === 1 ? 'pedido' : 'pedidos'}
                    </Badge>

                    <div className="text-right">
                      <span className="text-[10px] text-[#6B4B36] block">Total comprado:</span>
                      <span className="font-serif font-bold text-xs text-[#0C1014]">
                        {formatBRL(resumo.totalComprado)}
                      </span>
                    </div>
                  </div>

                  {resumo.valoresPendentes > 0.01 && (
                    <div className="text-[10px] text-[#8A6416] bg-amber-50/70 p-1.5 rounded-md flex justify-between">
                      <span>Valores a receber:</span>
                      <span className="font-bold">{formatBRL(resumo.valoresPendentes)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* GAVETA DE DETALHES DO CLIENTE */}
      <Sheet
        open={Boolean(clienteDetalheId)}
        onOpenChange={(open) => !open && setClienteDetalheId(null)}
      >
        <SheetContent className="w-full sm:max-w-lg bg-white p-0 flex flex-col border-l border-[#DFC3AE] overflow-hidden">
          {clienteSelecionado && resumoClienteSel && (
            <>
              {/* Header */}
              <div className="p-6 border-b border-[#DFC3AE]/50 bg-[#F7F3EA]/40 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#A5683F] text-white flex items-center justify-center font-serif text-lg font-bold shadow-xs">
                      {clienteSelecionado.nome.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#0C1014]">
                        {clienteSelecionado.nome}
                      </h3>
                      <p className="text-xs text-[#6B4B36]">
                        Cliente desde {formatDataBR(clienteSelecionado.criadoEm)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirEditarCliente(clienteSelecionado)}
                      className="h-8 text-xs border-[#DFC3AE] text-[#6B4B36]"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      aria-label="Excluir cliente"
                      size="sm"
                      variant="ghost"
                      onClick={() => setClienteParaExcluir(clienteSelecionado)}
                      className="h-8 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Resumo Financeiro do Cliente */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-2.5 bg-white rounded-lg border border-[#DFC3AE]/60 text-center">
                    <span className="text-[10px] text-[#6B4B36] block">Pedidos</span>
                    <span className="font-serif font-bold text-base text-[#0C1014]">
                      {resumoClienteSel.quantidadePedidos}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#DFC3AE]/60 text-center">
                    <span className="text-[10px] text-[#6B4B36] block">Total Comprado</span>
                    <span className="font-serif font-bold text-xs text-[#0C1014]">
                      {formatBRL(resumoClienteSel.totalComprado)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[#DFC3AE]/60 text-center">
                    <span className="text-[10px] text-[#6B4B36] block">Pendente</span>
                    <span className="font-serif font-bold text-xs text-[#8A6416]">
                      {formatBRL(resumoClienteSel.valoresPendentes)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informações de Contato */}
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B4B36]">
                    Dados de Contato e Endereço
                  </h4>
                  <div className="bg-[#F7F3EA]/60 p-3.5 rounded-xl border border-[#DFC3AE]/50 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#6B4B36]">Telefone / WhatsApp:</span>
                      <span className="font-semibold text-[#0C1014]">
                        {clienteSelecionado.telefone}
                      </span>
                    </div>
                    {clienteSelecionado.email && (
                      <div className="flex justify-between">
                        <span className="text-[#6B4B36]">E-mail:</span>
                        <span className="font-semibold text-[#0C1014]">
                          {clienteSelecionado.email}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#6B4B36]">Endereço:</span>
                      <span className="font-semibold text-[#0C1014] text-right max-w-[220px]">
                        {clienteSelecionado.endereco} - {clienteSelecionado.cidadeUf}
                      </span>
                    </div>
                  </div>
                </div>

                {clienteSelecionado.observacoes && (
                  <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                    <span className="font-bold text-[#6B4B36] block mb-1">
                      Observações do Cliente:
                    </span>
                    <p className="text-[#0C1014]">{clienteSelecionado.observacoes}</p>
                  </div>
                )}

                {/* Histórico de Compras do Cliente */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B4B36]">
                      Histórico de Pedidos ({pedidosClienteSel.length})
                    </h4>
                  </div>

                  {pedidosClienteSel.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6B4B36] border border-dashed border-[#DFC3AE] rounded-xl">
                      Nenhum pedido realizado por este cliente ainda.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pedidosClienteSel.map((ped) => (
                        <div
                          key={ped.id}
                          onClick={() => {
                            setClienteDetalheId(null)
                            navigate(`/pedidos?busca=${encodeURIComponent(ped.codigo)}`)
                          }}
                          className="p-3 rounded-lg border border-[#DFC3AE]/50 hover:bg-[#F7F3EA] cursor-pointer transition-colors flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#0C1014]">{ped.codigo}</span>
                              <span className="text-[#6B4B36] text-[11px]">
                                {formatDataBR(ped.dataCriacao)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#6B4B36] mt-0.5">
                              {ped.itens.length} {ped.itens.length === 1 ? 'item' : 'itens'} &bull;{' '}
                              {ped.formaPagamento}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-serif font-bold text-xs text-[#0C1014] block">
                              {formatBRL(ped.valorTotal)}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[9px] px-1.5 py-0 border-none capitalize ${
                                ped.status === 'entregue'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ped.status === 'cancelado'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-[#C48864]/15 text-[#94603D]'
                              }`}
                            >
                              {ped.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* FORMULÁRIO DE NOVO / EDITAR CLIENTE */}
      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent className="sm:max-w-lg bg-white border-[#DFC3AE] p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
              {clienteEditando ? 'Editar Cadastro de Cliente' : 'Novo Cliente'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCliente} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="nome"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Nome Completo
                <Obrigatorio />
              </Label>
              <Input
                id="nome"
                placeholder="Ex: Mariana Duarte Souza"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="tel"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  Telefone
                  <Obrigatorio />
                </Label>
                <Input
                  id="tel"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="wpp"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  WhatsApp
                  <Opcional />
                </Label>
                <Input
                  id="wpp"
                  placeholder="(11) 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                E-mail
                <Opcional />
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs border-[#DFC3AE]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label
                  htmlFor="end"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  Endereço
                  <Opcional />
                </Label>
                <Input
                  id="end"
                  placeholder="Rua, número, complemento"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="cidade"
                  className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                >
                  Cidade - UF
                  <Opcional />
                </Label>
                <Input
                  id="cidade"
                  placeholder="São Paulo - SP"
                  value={cidadeUf}
                  onChange={(e) => setCidadeUf(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="obs"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Observações / Preferências
                <Opcional />
              </Label>
              <Textarea
                id="obs"
                placeholder="Preferências de cores e materiais, arquivos recorrentes, forma de retirada..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs border-[#DFC3AE] min-h-[70px]"
              />
            </div>

            {erro && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalFormAberto(false)}
                className="border-[#DFC3AE] text-[#6B4B36] h-10 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white h-10 text-xs font-semibold"
              >
                Salvar Cadastro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AVISO DE DUPLICIDADE (Regra do briefing) */}
      <AlertDialog open={avisoDuplicidadeAberto} onOpenChange={setAvisoDuplicidadeAberto}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#8A6416]" />
              Aviso: Possível Cadastro Duplicado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36] space-y-2">
              <p>Já existe um cliente cadastrado com este mesmo telefone/WhatsApp:</p>
              <div className="p-3 bg-[#F7F3EA] rounded-lg border border-[#DFC3AE]/60 text-xs font-medium text-[#0C1014]">
                <p className="font-bold">{clienteExistenteDuplicado?.nome}</p>
                <p className="text-[#6B4B36]">
                  {clienteExistenteDuplicado?.telefone} &bull; {clienteExistenteDuplicado?.email}
                </p>
              </div>
              <p>
                Deseja abrir o cadastro existente para atualizar ou continuar salvando este
                registro?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setAvisoDuplicidadeAberto(false)
                if (clienteExistenteDuplicado) {
                  setModalFormAberto(false)
                  setClienteDetalheId(clienteExistenteDuplicado.id)
                }
              }}
              className="border-[#DFC3AE] text-[#6B4B36] text-xs"
            >
              Usar Cadastro Existente
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setAvisoDuplicidadeAberto(false)
                // Força o salvamento
                const payload: Cliente = {
                  id: novoId(),
                  nome: nome.trim(),
                  telefone: telefone.trim(),
                  whatsapp: (whatsapp || telefone).trim(),
                  email: email.trim(),
                  endereco: endereco.trim(),
                  cidadeUf: cidadeUf.trim() || 'São Paulo - SP',
                  observacoes: observacoes.trim() || undefined,
                  criadoEm: hojeISO(),
                }
                dispatch({ type: 'SALVAR_CLIENTE', payload })
                toast.success(`Cliente "${payload.nome}" cadastrado com sucesso!`)
                setModalFormAberto(false)
              }}
              className="bg-[#A5683F] hover:bg-[#8C5636] text-white text-xs font-semibold"
            >
              Criar Novo Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO (Bloqueada se tiver pedidos) */}
      <AlertDialog
        open={Boolean(clienteParaExcluir)}
        onOpenChange={(open) => !open && setClienteParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Confirmar Exclusão de Cliente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36] space-y-2">
              {clienteParaExcluir &&
              selectPedidosDoCliente(state, clienteParaExcluir.id).length > 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
                  <p className="font-bold">Exclusão Bloqueada:</p>
                  <p>
                    O cliente <strong>{clienteParaExcluir.nome}</strong> possui{' '}
                    {selectPedidosDoCliente(state, clienteParaExcluir.id).length} pedido(s)
                    vinculado(s). Para manter a integridade fiscal e histórica, clientes com pedidos
                    não podem ser removidos.
                  </p>
                </div>
              ) : (
                <p>
                  Tem certeza que deseja excluir o cadastro de{' '}
                  <strong>{clienteParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Fechar
            </AlertDialogCancel>
            {clienteParaExcluir &&
              selectPedidosDoCliente(state, clienteParaExcluir.id).length === 0 && (
                <AlertDialogAction
                  onClick={handleExcluirCliente}
                  className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Excluir Definitivamente
                </AlertDialogAction>
              )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
