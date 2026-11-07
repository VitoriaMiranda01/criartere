import { CampoSenha } from '@/components/common/CampoSenha'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import React, { useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { supabase } from '@/lib/supabase'
import { PaymentMethod, PeriodoFiltro } from '@/types/criartere'
import { ModalCategorias } from '@/components/financeiro/ModalCategorias'
import {
  Settings,
  Store,
  CreditCard,
  Palette,
  Shield,
  Sliders,
  FolderTree,
  Plus,
  Trash2,
  CheckCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function Configuracoes() {
  const { state, dispatch, recarregar } = useCriartere()

  // Dados da loja
  const [nomeLoja, setNomeLoja] = useState(state.config.nome)
  const [emailLoja, setEmailLoja] = useState(state.config.email)
  const [telefoneLoja, setTelefoneLoja] = useState(state.config.telefone)
  const [whatsappLoja, setWhatsappLoja] = useState(state.config.whatsapp)
  const [enderecoLoja, setEnderecoLoja] = useState(state.config.endereco)
  const [instagramLoja, setInstagramLoja] = useState(state.config.instagram)
  const [chavePix, setChavePix] = useState(state.config.chavePix)

  // Preferências
  const [incluirAguardando, setIncluirAguardando] = useState(
    state.config.incluirAguardandoNoFaturamento,
  )
  const [periodoPadrao, setPeriodoPadrao] = useState<PeriodoFiltro>(
    state.config.periodoPadraoDashboard,
  )

  // Formas de pagamento
  const [novaForma, setNovaForma] = useState('')
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)

  // Dados de acesso simulado
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  const handleSalvarDadosLoja = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeLoja.trim()) {
      toast.error('Informe o nome da loja.')
      return
    }
    dispatch({
      type: 'ATUALIZAR_CONFIG',
      payload: {
        nome: nomeLoja,
        email: emailLoja,
        telefone: telefoneLoja,
        whatsapp: whatsappLoja,
        endereco: enderecoLoja,
        instagram: instagramLoja,
        chavePix: chavePix.trim(),
        incluirAguardandoNoFaturamento: incluirAguardando,
        periodoPadraoDashboard: periodoPadrao,
      },
    })
    toast.success('Configurações da loja atualizadas com sucesso!')
  }

  const handleAdicionarForma = (e: React.FormEvent) => {
    e.preventDefault()
    const f = novaForma.trim() as PaymentMethod
    if (!f) return
    dispatch({ type: 'ADICIONAR_FORMA_PAGAMENTO', payload: f })
    toast.success(`Forma de pagamento "${f}" adicionada!`)
    setNovaForma('')
  }

  const handleRemoverForma = (forma: PaymentMethod) => {
    if (state.formasPagamento.length <= 1) {
      toast.error('O sistema precisa manter pelo menos 1 forma de pagamento.')
      return
    }
    dispatch({ type: 'REMOVER_FORMA_PAGAMENTO', payload: forma })
    toast.success(`Forma de pagamento "${forma}" removida.`)
  }

  const handleAlterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!senhaAtual || !novaSenha) {
      toast.error('Preencha a senha atual e a nova senha.')
      return
    }
    if (novaSenha.length < 6) {
      toast.error('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }
    // Confirma a senha atual antes de trocar
    const { error: erroLogin } = await supabase.auth.signInWithPassword({
      email: state.usuarioAtual.email,
      password: senhaAtual,
    })
    if (erroLogin) {
      toast.error('Senha atual incorreta.')
      return
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    if (error) {
      toast.error(`Não foi possível alterar a senha: ${error.message}`)
      return
    }
    toast.success('Senha alterada com sucesso!')
    setSenhaAtual('')
    setNovaSenha('')
  }

  const handleRecarregar = async () => {
    await recarregar()
    toast.success('Dados sincronizados com o servidor.')
  }

  const statusConfig = [
    { label: 'Novo pedido', cor: '#C48864', desc: 'Pedido registrado e aguardando confirmação' },
    { label: 'Aguardando pagamento', cor: '#D9A441', desc: 'Chave Pix ou link enviado ao cliente' },
    {
      label: 'Em preparação',
      cor: '#8A5A3B',
      desc: 'Conferência do arquivo, modelagem 3D ou arte final',
    },
    {
      label: 'Em produção',
      cor: '#B0764F',
      desc: 'Impressão 3D ou gráfica, corte e acabamento',
    },
    {
      label: 'Pronto para envio',
      cor: '#4C8A5A',
      desc: 'Embalado e pronto para retirada ou envio',
    },
    { label: 'Enviado', cor: '#5A7D8A', desc: 'Em trânsito com código de rastreio ou motoboy' },
    { label: 'Entregue', cor: '#3D6F48', desc: 'Entregue com sucesso ao cliente' },
    { label: 'Cancelado', cor: '#B5533C', desc: 'Pedido cancelado e estornado' },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#0C1014]">Configurações do Sistema</h2>
          <p className="text-xs text-[#6B4B36]">
            Parâmetros da loja, preferências operacionais, formas de pagamento e categorias
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleRecarregar}
          className="border-[#DFC3AE] text-[#6B4B36] hover:text-[#0C1014] text-xs h-9 self-start sm:self-auto flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#C48864]" />
          <span>Sincronizar Dados</span>
        </Button>
      </div>

      {/* SEÇÃO 1: DADOS DA LOJA */}
      <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
          <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
            <Store className="w-4 h-4 text-[#C48864]" />
            Dados Comerciais da Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSalvarDadosLoja} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  Nome da Loja
                  <Obrigatorio />
                </Label>
                <Input
                  value={nomeLoja}
                  onChange={(e) => setNomeLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  E-mail de Contato
                  <Opcional />
                </Label>
                <Input
                  value={emailLoja}
                  onChange={(e) => setEmailLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  Telefone Comercial
                  <Opcional />
                </Label>
                <Input
                  value={telefoneLoja}
                  onChange={(e) => setTelefoneLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  WhatsApp Oficial
                  <Opcional />
                </Label>
                <Input
                  value={whatsappLoja}
                  onChange={(e) => setWhatsappLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  Endereço da Loja
                  <Opcional />
                </Label>
                <Input
                  value={enderecoLoja}
                  onChange={(e) => setEnderecoLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  Instagram
                  <Opcional />
                </Label>
                <Input
                  value={instagramLoja}
                  onChange={(e) => setInstagramLoja(e.target.value)}
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                  Chave Pix (usada nos orçamentos)
                  <Opcional />
                </Label>
                <Input
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="E-mail, telefone, CPF/CNPJ ou chave aleatória"
                  className="h-10 text-xs border-[#DFC3AE]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                className="bg-[#C48864] hover:bg-[#B0764F] text-white text-xs font-semibold h-10 px-5"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SEÇÃO 2: FORMAS DE PAGAMENTO E CATEGORIAS DE DESPESA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formas de Pagamento */}
        <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
            <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#C48864]" />
              Formas de Pagamento Aceitas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <form onSubmit={handleAdicionarForma} className="flex gap-2">
              <Input
                placeholder="Ex: Boleto Bancário..."
                value={novaForma}
                onChange={(e) => setNovaForma(e.target.value)}
                className="h-9 text-xs border-[#DFC3AE]"
              />
              <Button
                type="submit"
                size="sm"
                className="bg-[#C48864] hover:bg-[#B0764F] text-white text-xs h-9 shrink-0 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
            </form>

            <div className="space-y-1.5">
              {state.formasPagamento.map((forma) => (
                <div
                  key={forma}
                  className="p-2.5 rounded-lg border border-[#DFC3AE]/50 bg-[#F7F3EA]/30 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-[#0C1014]">{forma}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoverForma(forma)}
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Categorias de Despesas */}
        <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#DFC3AE]/40 flex flex-row items-center justify-between">
            <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#C48864]" />
              Categorias de Custos &amp; Despesas
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalCategoriasAberto(true)}
              className="h-8 text-xs border-[#DFC3AE] text-[#C48864]"
            >
              Gerenciar
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-xs text-[#6B4B36] mb-3">
              {state.categoriasDespesa.length} categorias cadastradas para classificação financeira:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {state.categoriasDespesa.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="bg-[#F7F3EA] text-[#6B4B36] border border-[#DFC3AE]/70 text-xs py-1 px-2.5 font-medium"
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3: STATUS DOS PEDIDOS (Visualização com Cores) */}
      <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
        <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
          <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#C48864]" />
            Status Operacionais da Produção
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-xs text-[#6B4B36] mb-4">
            Ciclo de vida dos pedidos da Criartere. Personalização de etapas estará disponível na
            versão final.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {statusConfig.map((st) => (
              <div
                key={st.label}
                className="p-3 rounded-xl border border-[#DFC3AE]/60 bg-[#F7F3EA]/30 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: st.cor }}
                  />
                  <span className="font-serif font-bold text-xs text-[#0C1014]">{st.label}</span>
                </div>
                <p className="text-[11px] text-[#6B4B36] leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 4: DADOS DE ACESSO E PREFERÊNCIAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dados de acesso */}
        <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
            <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#C48864]" />
              Dados de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-3 bg-[#F7F3EA] rounded-xl border border-[#DFC3AE]/60 text-xs space-y-1">
              <p className="font-bold text-[#0C1014]">
                Usuária Atual: {state.usuarioAtual.nome}
                {state.usuarioAtual.papel ? ` (${state.usuarioAtual.papel})` : ''}
              </p>
              <p className="text-[#6B4B36]">E-mail de acesso: {state.usuarioAtual.email}</p>
            </div>

            <form onSubmit={handleAlterarSenha} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-[#6B4B36]">
                  Senha Atual
                  <Obrigatorio />
                </Label>
                <CampoSenha
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs border-[#DFC3AE]"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-[#6B4B36]">
                  Nova Senha
                  <Obrigatorio />
                </Label>
                <CampoSenha
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-xs border-[#DFC3AE]"
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full h-9 text-xs border-[#DFC3AE] text-[#6B4B36]"
              >
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preferências do Dashboard */}
        <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
            <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C48864]" />
              Preferências Gerais do Painel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B4B36]">
                Período Padrão do Dashboard
                <Obrigatorio />
              </Label>
              <Select value={periodoPadrao} onValueChange={(val: any) => setPeriodoPadrao(val)}>
                <SelectTrigger className="h-9 text-xs border-[#DFC3AE]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje" className="text-xs">
                    Hoje
                  </SelectItem>
                  <SelectItem value="ultimos_7" className="text-xs">
                    Últimos 7 dias
                  </SelectItem>
                  <SelectItem value="mes_atual" className="text-xs">
                    Mês atual
                  </SelectItem>
                  <SelectItem value="mes_anterior" className="text-xs">
                    Mês anterior
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F7F3EA]/50 rounded-xl border border-[#DFC3AE]/50">
              <div className="space-y-0.5">
                <span className="font-bold text-[#0C1014] block">Faturamento Previsto</span>
                <span className="text-[11px] text-[#6B4B36]">
                  Incluir pedidos aguardando pagamento no faturamento total
                </span>
              </div>
              <Switch checked={incluirAguardando} onCheckedChange={setIncluirAguardando} />
            </div>

            <div className="pt-2">
              <Button
                onClick={handleSalvarDadosLoja}
                className="w-full bg-[#C48864] hover:bg-[#B0764F] text-white text-xs h-9 font-semibold"
              >
                Salvar Preferências
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de categorias */}
      <ModalCategorias
        aberto={modalCategoriasAberto}
        onFechar={() => setModalCategoriasAberto(false)}
      />
    </div>
  )
}
