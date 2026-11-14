import React, { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, ShoppingBag, Store, Truck } from 'lucide-react'
import { FaWhatsapp } from 'react-icons/fa'
import { useSeo } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useLoja } from '@/loja/LojaContext'
import { CarregandoLoja, ImagemProduto } from '@/loja/componentes'
import {
  buscarMeusDadosPedido,
  enviarPedido,
  formatarPreco,
  linkWhatsAppPedido,
  mascararTelefone,
  mensagemErroLoja,
  numeroWhatsApp,
} from '@/loja/api'
import { PrecisaEntrar } from './PrecisaEntrar'

const FORMAS = ['Pix', 'Cartão', 'Dinheiro', 'A combinar'] as const

const classeCampo =
  'h-11 rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/40 text-sm placeholder:text-[#6B4B36]/50'
const classeRotulo = 'text-xs font-semibold text-[#6B4B36] uppercase tracking-wider'

export default function Finalizar() {
  useSeo({ titulo: 'Finalizar pedido', caminho: '/finalizar', indexar: false })
  const navigate = useNavigate()
  const {
    usuario,
    sessaoVerificada,
    carrinho,
    produtos,
    carregandoProdutos,
    carregandoConta,
    contato,
    recarregarConta,
  } = useLoja()

  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [forma, setForma] = useState<string>('Pix')
  const [observacoes, setObservacoes] = useState('')
  const [entrega, setEntrega] = useState<'retirada' | 'entrega' | null>(null)
  const [endereco, setEndereco] = useState('')
  const [cidadeUf, setCidadeUf] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  // O aviso de erro some assim que a pessoa corrige algum campo
  useEffect(() => setErro(''), [nome, whatsapp, entrega, endereco, cidadeUf])

  // Preenche com os dados do último pedido (ou o nome da conta)
  useEffect(() => {
    if (!usuario) return
    let ativo = true
    setNome((n) => n || usuario.nome)
    buscarMeusDadosPedido()
      .then((d) => {
        if (!ativo || !d) return
        setWhatsapp((w) => w || mascararTelefone(d.whatsapp))
        setEndereco((e) => e || d.endereco)
        setCidadeUf((c) => c || d.cidadeUf)
      })
      .catch(() => undefined)
    return () => {
      ativo = false
    }
  }, [usuario])

  if (!sessaoVerificada) return <CarregandoLoja />
  if (!usuario) {
    return (
      <PrecisaEntrar
        icone={ShoppingBag}
        titulo="Entre para finalizar seu pedido"
        texto="Seu carrinho fica salvo na sua conta."
      />
    )
  }
  if (carregandoProdutos || (carregandoConta && carrinho.length === 0)) return <CarregandoLoja />

  const linhas = carrinho
    .map((item) => ({ item, produto: produtos.find((p) => p.id === item.produtoId) }))
    .filter((l) => l.produto)
  if (linhas.length === 0 && !enviando) return <Navigate to="/carrinho" replace />

  const total = linhas.reduce((s, l) => s + l.produto!.preco * l.item.quantidade, 0)
  const qtdItens = linhas.reduce((s, l) => s + l.item.quantidade, 0)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (whatsapp.replace(/\D/g, '').length < 10) return setErro('Informe seu WhatsApp com DDD.')
    if (!entrega) return setErro('Escolha se prefere retirar ou receber o pedido.')
    if (entrega === 'entrega' && (!endereco.trim() || !cidadeUf.trim())) {
      return setErro('Informe o endereço e a cidade para a entrega.')
    }
    setEnviando(true)
    try {
      const pedido = await enviarPedido({
        nome: nome.trim(),
        whatsapp,
        formaPagamento: forma,
        observacoes,
        entrega,
        endereco: endereco.trim(),
        cidadeUf: cidadeUf.trim(),
      })
      const link = numeroWhatsApp(contato?.whatsapp ?? '')
        ? linkWhatsAppPedido(contato!.whatsapp, pedido, nome.trim(), observacoes)
        : null
      // Abre a conversa com a loja (alguns celulares bloqueiam: a próxima tela tem o botão)
      if (link) window.open(link, '_blank', 'noopener')
      recarregarConta()
      navigate('/pedido-enviado', {
        replace: true,
        state: { pedido, nome: nome.trim(), observacoes, link },
      })
    } catch (err) {
      setEnviando(false)
      setErro(`Não foi possível enviar o pedido. ${mensagemErroLoja(err)}`)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        to="/carrinho"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B4B36] hover:text-[#0C1014]"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao carrinho
      </Link>
      <header>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Finalizar pedido</h1>
        <p className="text-sm text-[#6B4B36] mt-1">
          Confira seus dados. Depois de enviar, você fala com a Criartere pelo WhatsApp para
          confirmar o pedido, o frete e o pagamento.
        </p>
      </header>

      <form
        onSubmit={enviar}
        noValidate
        className="grid lg:grid-cols-[1fr_380px] gap-6 items-start"
      >
        <section className="bg-white rounded-2xl border border-[#DFC3AE]/60 p-5 sm:p-7 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="pedido-nome" className={classeRotulo}>
                Nome
                <Obrigatorio />
              </Label>
              <Input
                id="pedido-nome"
                autoComplete="name"
                value={nome}
                maxLength={80}
                onChange={(e) => setNome(e.target.value)}
                className={classeCampo}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pedido-whatsapp" className={classeRotulo}>
                WhatsApp
                <Obrigatorio />
              </Label>
              <Input
                id="pedido-whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="(21) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(mascararTelefone(e.target.value))}
                className={classeCampo}
              />
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className={cn(classeRotulo, 'mb-2')}>Como prefere pagar?</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMAS.map((f) => (
                <label
                  key={f}
                  className={cn(
                    'h-11 rounded-lg border text-sm font-semibold flex items-center justify-center cursor-pointer transition-colors',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#C48864]',
                    forma === f
                      ? 'border-[#A5683F] bg-[#F6EDE7] text-[#8C5636]'
                      : 'border-[#DFC3AE] bg-white text-[#6B4B36] hover:border-[#C48864]',
                  )}
                >
                  <input
                    type="radio"
                    name="forma-pagamento"
                    value={f}
                    checked={forma === f}
                    onChange={() => setForma(f)}
                    className="sr-only"
                  />
                  {f}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-[#6B4B36]/80">
              Nada é cobrado pelo site: o pagamento é combinado com a loja.
            </p>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className={cn(classeRotulo, 'mb-2')}>
              Como prefere receber?
              <Obrigatorio />
            </legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {(
                [
                  {
                    valor: 'retirada',
                    titulo: 'Retirar na loja',
                    texto: 'Combinamos o local e o horário pelo WhatsApp.',
                    Icone: Store,
                  },
                  {
                    valor: 'entrega',
                    titulo: 'Receber em casa',
                    texto: 'Entrega ou envio. O frete é combinado pelo WhatsApp.',
                    Icone: Truck,
                  },
                ] as const
              ).map(({ valor, titulo, texto, Icone }) => (
                <label
                  key={valor}
                  className={cn(
                    'flex gap-3 rounded-xl border p-4 cursor-pointer transition-colors',
                    'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#C48864]',
                    entrega === valor
                      ? 'border-[#A5683F] bg-[#F6EDE7]'
                      : 'border-[#DFC3AE] bg-white hover:border-[#C48864]',
                  )}
                >
                  <input
                    type="radio"
                    name="entrega"
                    value={valor}
                    checked={entrega === valor}
                    onChange={() => setEntrega(valor)}
                    className="sr-only"
                  />
                  <Icone
                    className={cn(
                      'w-5 h-5 shrink-0 mt-0.5',
                      entrega === valor ? 'text-[#A5683F]' : 'text-[#6B4B36]/70',
                    )}
                    aria-hidden="true"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#0C1014]">{titulo}</span>
                    <span className="block text-xs text-[#6B4B36] mt-0.5">{texto}</span>
                  </span>
                </label>
              ))}
            </div>

            {entrega === 'entrega' && (
              <div className="grid sm:grid-cols-[1fr_200px] gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pedido-endereco" className={classeRotulo}>
                    Endereço
                    <Obrigatorio />
                  </Label>
                  <Input
                    id="pedido-endereco"
                    autoComplete="street-address"
                    placeholder="Rua, número, complemento e bairro"
                    maxLength={300}
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className={classeCampo}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pedido-cidade" className={classeRotulo}>
                    Cidade/UF
                    <Obrigatorio />
                  </Label>
                  <Input
                    id="pedido-cidade"
                    autoComplete="address-level2"
                    placeholder="Ex.: Niterói/RJ"
                    maxLength={80}
                    value={cidadeUf}
                    onChange={(e) => setCidadeUf(e.target.value)}
                    className={classeCampo}
                  />
                </div>
              </div>
            )}
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="pedido-obs" className={classeRotulo}>
              Observações
              <Opcional />
            </Label>
            <Textarea
              id="pedido-obs"
              rows={3}
              maxLength={1000}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Cores, personalização, data em que precisa..."
              className="rounded-lg border-[#DFC3AE] focus-visible:ring-[#C48864] bg-[#F7F3EA]/40 text-sm placeholder:text-[#6B4B36]/50 resize-none"
            />
          </div>
        </section>

        <aside className="bg-white rounded-2xl border border-[#DFC3AE]/60 p-5 space-y-4 lg:sticky lg:top-24">
          <h2 className="font-serif text-xl font-semibold">Seu pedido</h2>
          <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {linhas.map(({ item, produto }) => (
              <li key={item.id} className="flex items-center gap-3">
                <ImagemProduto
                  produto={produto!}
                  className="w-12 h-12 rounded-lg border border-[#DFC3AE]/50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{produto!.nome}</p>
                  <p className="text-xs text-[#6B4B36]">
                    {item.quantidade} × {formatarPreco(produto!.preco)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatarPreco(produto!.preco * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-[#DFC3AE]/60 pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-[#6B4B36]">
              <span>Produtos ({qtdItens})</span>
              <span>{formatarPreco(total)}</span>
            </div>
            <div className="flex justify-between text-[#6B4B36]">
              <span>{entrega === 'retirada' ? 'Retirada' : 'Frete'}</span>
              <span>{entrega === 'retirada' ? 'Sem custo' : 'A combinar'}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2">
              <span className="font-semibold">Total</span>
              <span className="font-serif text-2xl font-bold text-[#A5683F]">
                {formatarPreco(total)}
              </span>
            </div>
          </div>

          {erro && (
            <p
              role="alert"
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium"
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="w-full h-12 rounded-lg bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
          >
            {enviando ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FaWhatsapp className="w-5 h-5" aria-hidden="true" /> Enviar pedido pelo WhatsApp
              </>
            )}
          </button>
          <p className="flex gap-2 text-[11px] text-[#6B4B36] leading-relaxed">
            <MessageCircle
              className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#C48864]"
              aria-hidden="true"
            />
            Seu pedido fica registrado na loja e o WhatsApp abre com o resumo pronto para enviar.
          </p>
        </aside>
      </form>
    </div>
  )
}
