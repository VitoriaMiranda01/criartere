import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { Obrigatorio, Opcional } from '@/components/common/MarcadorCampo'
import { novoId } from '@/lib/supabase'
import { prepararImagemProduto, ImagemPreparada } from '@/lib/imagem'
import { enviarImagemProduto, mensagemErro } from '@/store/db'
import React, { useEffect, useRef, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { Produto } from '@/types/criartere'
import { formatBRL } from '@/store/periodUtils'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  X,
  ImagePlus,
  Store,
  Star,
  ChevronLeft,
  ChevronRight,
  Images,
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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

export default function Produtos() {
  const { state, dispatch } = useCriartere()

  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Modais
  const [modalFormAberto, setModalFormAberto] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [precoVendaStr, setPrecoVendaStr] = useState('')
  const [custoStr, setCustoStr] = useState('')
  const [categoria, setCategoria] = useState('Impressão 3D')
  // Fotos do produto, em ordem (a primeira é a principal). Fotos novas ainda não foram enviadas.
  const [fotos, setFotos] = useState<FotoForm[]>([])
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null)
  const selecionada = fotos.find((f) => f.chave === fotoSelecionada) ?? fotos[0]
  const indiceSelecionada = selecionada ? fotos.indexOf(selecionada) : -1
  const [arrastando, setArrastando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const inputImagem = useRef<HTMLInputElement>(null)
  const [ativo, setAtivo] = useState(true)
  const [publicadoLoja, setPublicadoLoja] = useState(true)
  const [estoqueStr, setEstoqueStr] = useState('10')
  const [erro, setErro] = useState('')

  const categoriasDisponiveis = [
    'Impressão 3D',
    'Miniaturas e colecionáveis',
    'Peças técnicas e protótipos',
    'Cartões e papelaria',
    'Banners, adesivos e placas',
    'Brindes personalizados',
    'Outros',
  ]

  const abrirNovoProduto = () => {
    setProdutoEditando(null)
    setNome('')
    setDescricao('')
    setPrecoVendaStr('')
    setCustoStr('')
    setCategoria('Impressão 3D')
    limparFotos([])
    setAtivo(true)
    setPublicadoLoja(true)
    setEstoqueStr('12')
    setErro('')
    setModalFormAberto(true)
  }

  const abrirEditarProduto = (prod: Produto) => {
    setProdutoEditando(prod)
    setNome(prod.nome)
    setDescricao(prod.descricao)
    setPrecoVendaStr(prod.precoVenda.toString())
    setCustoStr(prod.custo ? prod.custo.toString() : '')
    setCategoria(prod.categoria)
    limparFotos(
      (prod.imagens?.length
        ? prod.imagens
        : prod.imagemUrl && prod.imagemUrl !== '/placeholder.svg'
          ? [prod.imagemUrl]
          : []
      ).map((url) => ({ chave: url, url })),
    )
    setAtivo(prod.ativo)
    setPublicadoLoja(prod.publicadoLoja ?? true)
    setEstoqueStr(prod.estoqueAproximado ? prod.estoqueAproximado.toString() : '0')
    setErro('')
    setModalFormAberto(true)
  }

  // Troca a lista de fotos liberando as prévias das fotos novas que saíram
  const limparFotos = (novas: FotoForm[]) =>
    setFotos((atuais) => {
      atuais.forEach((f) => {
        if (f.previa && !novas.some((n) => n.chave === f.chave)) URL.revokeObjectURL(f.previa)
      })
      return novas
    })

  const adicionarFotos = async (arquivos?: FileList | File[] | null) => {
    const lista = Array.from(arquivos ?? [])
    if (!lista.length) return
    const vagas = MAX_FOTOS - fotos.length
    if (vagas <= 0) {
      toast.error(`Cada produto pode ter até ${MAX_FOTOS} fotos.`)
      return
    }
    if (lista.length > vagas) {
      toast.warning(
        `Só ${vagas === 1 ? 'mais 1 foto cabe' : `mais ${vagas} fotos cabem`} neste produto (máximo de ${MAX_FOTOS}).`,
      )
    }
    const preparadas: FotoForm[] = []
    for (const arquivo of lista.slice(0, vagas)) {
      try {
        const imagem = await prepararImagemProduto(arquivo)
        preparadas.push({
          chave: crypto.randomUUID(),
          nova: imagem,
          previa: URL.createObjectURL(imagem.blob),
        })
      } catch (err) {
        toast.error(`${arquivo.name}: ${(err as Error).message}`)
      }
    }
    if (preparadas.length) setFotos((atuais) => [...atuais, ...preparadas].slice(0, MAX_FOTOS))
  }

  const removerFoto = (chave: string) => limparFotos(fotos.filter((f) => f.chave !== chave))

  const tornarPrincipal = (chave: string) =>
    setFotos((atuais) => {
      const foto = atuais.find((f) => f.chave === chave)
      return foto ? [foto, ...atuais.filter((f) => f.chave !== chave)] : atuais
    })

  const moverFoto = (chave: string, direcao: -1 | 1) =>
    setFotos((atuais) => {
      const i = atuais.findIndex((f) => f.chave === chave)
      const j = i + direcao
      if (i < 0 || j < 0 || j >= atuais.length) return atuais
      const novas = [...atuais]
      ;[novas[i], novas[j]] = [novas[j], novas[i]]
      return novas
    })

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    const precoVenda = parseFloat(precoVendaStr.replace(',', '.'))
    const custo = parseFloat(custoStr.replace(',', '.')) || 0
    const estoque = parseInt(estoqueStr, 10) || 0

    if (!nome.trim()) {
      setErro('O nome do produto é obrigatório.')
      return
    }

    if (isNaN(precoVenda) || precoVenda <= 0) {
      setErro('Informe um preço de venda válido maior que zero.')
      return
    }

    const id = produtoEditando ? produtoEditando.id : novoId()
    // Envia as fotos novas (na ordem escolhida) e monta a lista final de endereços
    const urls: string[] = []
    if (fotos.some((f) => f.nova)) setSalvando(true)
    try {
      for (const foto of fotos) {
        if (foto.url) urls.push(foto.url)
        else if (foto.nova) {
          // No modo desenvolvedor a imagem fica só neste aparelho (não é enviada)
          urls.push(
            state.modoDemo
              ? URL.createObjectURL(foto.nova.blob)
              : await enviarImagemProduto(id, foto.nova),
          )
        }
      }
    } catch (err) {
      setSalvando(false)
      setErro(`Não foi possível enviar as fotos. ${mensagemErro(err)}`)
      return
    }
    setSalvando(false)

    const payload: Produto = {
      id,
      nome: nome.trim(),
      descricao: descricao.trim(),
      precoVenda,
      custo,
      categoria,
      imagemUrl: urls[0] || '/placeholder.svg',
      imagens: urls,
      ativo,
      publicadoLoja,
      estoqueAproximado: estoque,
    }

    dispatch({ type: 'SALVAR_PRODUTO', payload })
    toast.success(
      produtoEditando
        ? `Produto "${payload.nome}" atualizado!`
        : `Produto "${payload.nome}" cadastrado com sucesso!`,
    )
    limparFotos([])
    setModalFormAberto(false)
  }

  const handleConfirmarExclusao = () => {
    if (!produtoParaExcluir) return
    dispatch({ type: 'EXCLUIR_PRODUTO', payload: produtoParaExcluir.id })
    toast.success(`Produto "${produtoParaExcluir.nome}" foi removido do catálogo.`)
    setProdutoParaExcluir(null)
  }

  // Filtragem
  const produtosFiltrados = state.produtos.filter((p) => {
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      if (!p.nome.toLowerCase().includes(termo) && !p.descricao.toLowerCase().includes(termo)) {
        return false
      }
    }

    if (categoriaFiltro !== 'todas' && p.categoria !== categoriaFiltro) {
      return false
    }

    if (filtroStatus === 'ativos' && !p.ativo) return false
    if (filtroStatus === 'inativos' && p.ativo) return false

    return true
  })

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Catálogo de Produtos"
        descricao={`${state.produtos.length} produtos cadastrados • Prontos para preenchimento ágil nos pedidos`}
        ajuda={
          <DicaAjuda titulo="Catálogo" topico="produtos" lado="bottom">
            <p>Os produtos aparecem para escolha rápida em pedidos e orçamentos, já com o preço.</p>
            <p>Informe o custo para acompanhar a margem de lucro.</p>
          </DicaAjuda>
        }
      />

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por nome ou descrição do produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 pr-8 h-9 text-xs border-[#DFC3AE]"
                />
                {busca && (
                  <button
                    aria-label="Limpar busca"
                    onClick={() => setBusca('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#6B4B36]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="sm:col-span-3">
                <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                  <SelectTrigger
                    aria-label="Filtrar por categoria"
                    className="h-9 text-xs border-[#DFC3AE]"
                  >
                    <SelectValue placeholder="Categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">
                      Todas as Categorias
                    </SelectItem>
                    {categoriasDisponiveis.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-3">
                <Select value={filtroStatus} onValueChange={(val: any) => setFiltroStatus(val)}>
                  <SelectTrigger
                    aria-label="Filtrar por situação"
                    className="h-9 text-xs border-[#DFC3AE]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">
                      Todos os Status
                    </SelectItem>
                    <SelectItem value="ativos" className="text-xs">
                      Somente Ativos
                    </SelectItem>
                    <SelectItem value="inativos" className="text-xs">
                      Somente Inativos
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            onClick={abrirNovoProduto}
            className="bg-[#A5683F] hover:bg-[#8C5636] text-white font-medium text-xs h-10 px-4 rounded-xl shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </Button>
        </div>
      </div>

      {/* GRID DE CARDS DE PRODUTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {produtosFiltrados.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-dashed border-[#DFC3AE] text-center space-y-3">
            <Package className="w-8 h-8 text-[#94603D] mx-auto opacity-70" />
            <p className="text-sm font-semibold text-[#0C1014]">Nenhum produto encontrado</p>
            <p className="text-xs text-[#6B4B36]">
              Ajuste os filtros ou cadastre um novo produto no catálogo.
            </p>
          </div>
        ) : (
          produtosFiltrados.map((prod) => {
            const margem = prod.custo ? prod.precoVenda - prod.custo : null

            return (
              <Card
                key={prod.id}
                className={`border-[#DFC3AE]/70 shadow-xs bg-white rounded-2xl overflow-hidden transition-all flex flex-col ${
                  !prod.ativo ? 'opacity-60 bg-gray-50' : 'hover:shadow-md hover:border-[#C48864]'
                }`}
              >
                {/* Imagem do Produto */}
                <div className="relative h-44 bg-[#F7F3EA] overflow-hidden">
                  <FotoProduto url={prod.imagemUrl} nome={prod.nome} />
                  {/* Badge Ativo / Inativo */}
                  <div className="absolute top-2.5 right-2.5">
                    {prod.ativo ? (
                      <Badge className="bg-[#4C8A5A] text-white border-none text-[10px] font-semibold px-2 py-0.5 shadow-xs">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500 text-white border-none text-[10px] font-semibold px-2 py-0.5 shadow-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>

                  {prod.ativo && (
                    <div className="absolute top-2.5 left-2.5">
                      {prod.publicadoLoja !== false ? (
                        <Badge className="bg-white/90 backdrop-blur-xs text-[#8C5636] border border-[#DFC3AE]/50 text-[10px] font-semibold px-2 py-0.5 gap-1">
                          <Store className="w-3 h-3" /> Na loja
                        </Badge>
                      ) : (
                        <Badge className="bg-white/90 backdrop-blur-xs text-[#6B4B36]/80 border border-[#DFC3AE]/50 text-[10px] font-semibold px-2 py-0.5">
                          Fora da loja
                        </Badge>
                      )}
                    </div>
                  )}

                  {(prod.imagens?.length ?? 0) > 1 && (
                    <div className="absolute bottom-2.5 right-2.5">
                      <Badge className="bg-white/90 backdrop-blur-xs text-[#6B4B36] border border-[#DFC3AE]/50 text-[10px] font-semibold px-2 py-0.5 gap-1">
                        <Images className="w-3 h-3" /> {prod.imagens!.length} fotos
                      </Badge>
                    </div>
                  )}

                  <div className="absolute bottom-2.5 left-2.5">
                    <Badge className="bg-white/90 backdrop-blur-xs text-[#6B4B36] border border-[#DFC3AE]/50 text-[10px] font-semibold px-2 py-0.5">
                      {prod.categoria}
                    </Badge>
                  </div>
                </div>

                {/* Conteúdo */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-serif font-bold text-sm text-[#0C1014] line-clamp-1">
                      {prod.nome}
                    </h3>
                    <p className="text-xs text-[#6B4B36] line-clamp-2 mt-1 leading-relaxed">
                      {prod.descricao || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Preços e Valores */}
                  <div className="pt-2 border-t border-[#DFC3AE]/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6B4B36]">Preço de Venda:</span>
                      <span className="font-serif font-bold text-base text-[#94603D]">
                        {formatBRL(prod.precoVenda)}
                      </span>
                    </div>

                    {prod.custo > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-[#6B4B36]/90">
                        <span>Custo: {formatBRL(prod.custo)}</span>
                        {margem !== null && (
                          <span className="text-[#3F7A4E] font-semibold">
                            Lucro: {formatBRL(margem)}
                          </span>
                        )}
                      </div>
                    )}

                    {prod.estoqueAproximado !== undefined && (
                      <div className="text-[10px] text-[#6B4B36] pt-0.5">
                        Estoque aproximado: <strong>{prod.estoqueAproximado} un</strong>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-2 flex items-center justify-end gap-1 border-t border-[#DFC3AE]/30">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirEditarProduto(prod)}
                      className="h-8 text-xs text-[#6B4B36] hover:text-[#0C1014] px-2"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      aria-label="Excluir produto"
                      size="sm"
                      variant="ghost"
                      onClick={() => setProdutoParaExcluir(prod)}
                      className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* MODAL FORMULÁRIO PRODUTO */}
      <Dialog open={modalFormAberto} onOpenChange={setModalFormAberto}>
        <DialogContent className="sm:max-w-3xl bg-white border-[#DFC3AE] p-5 sm:p-6 max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold text-[#0C1014]">
              {produtoEditando ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarProduto} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5">
              {/* COLUNA ESQUERDA: IMAGEM + ATIVO */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider flex items-center gap-1">
                    Fotos
                    <Opcional />
                    <DicaAjuda titulo="Fotos do produto">
                      <p>
                        Envie até {MAX_FOTOS} fotos. A primeira é a <strong>foto principal</strong>:
                        aparece no catálogo, nos pedidos e quando o link do produto é compartilhado.
                        As demais aparecem na galeria da página do produto na loja.
                      </p>
                    </DicaAjuda>
                  </Label>

                  {/* Foto principal (ou área para enviar a primeira foto) */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fotos.length < MAX_FOTOS && inputImagem.current?.click()}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') &&
                      fotos.length < MAX_FOTOS &&
                      inputImagem.current?.click()
                    }
                    onDragOver={(e) => {
                      e.preventDefault()
                      setArrastando(true)
                    }}
                    onDragLeave={() => setArrastando(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setArrastando(false)
                      adicionarFotos(e.dataTransfer.files)
                    }}
                    className={`relative w-36 h-36 sm:w-[200px] sm:h-[200px] mx-auto sm:mx-0 rounded-xl border-2 border-dashed overflow-hidden cursor-pointer group transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] ${
                      arrastando
                        ? 'border-[#C48864] bg-[#C48864]/10'
                        : 'border-[#DFC3AE] bg-[#F7F3EA]/60 hover:border-[#C48864]'
                    }`}
                    aria-label={fotos.length ? 'Adicionar mais fotos' : 'Enviar fotos do produto'}
                  >
                    {fotos.length ? (
                      <>
                        <img
                          src={fotos[0].previa || fotos[0].url}
                          alt="Foto principal do produto"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#8C5636] shadow-xs">
                          <Star className="w-3 h-3 fill-[#C48864] text-[#C48864]" /> Principal
                        </span>
                        {fotos.length < MAX_FOTOS && (
                          <span className="absolute inset-0 bg-black/40 text-white text-xs font-semibold flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ImagePlus className="w-5 h-5" />
                            Adicionar fotos
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-[#6B4B36] text-center px-3">
                        <ImagePlus className="w-7 h-7 text-[#94603D]" />
                        <span className="text-xs font-semibold">Enviar fotos</span>
                        <span className="text-[10px] text-[#6B4B36]/90">
                          Clique ou arraste aqui
                          <br />
                          Até {MAX_FOTOS} fotos · JPG, PNG ou WebP
                        </span>
                      </span>
                    )}
                  </div>
                  <input
                    ref={inputImagem}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      adicionarFotos(e.target.files)
                      e.target.value = ''
                    }}
                  />

                  {/* Todas as fotos: ordem, principal e remoção */}
                  {fotos.length > 0 && (
                    <div className="w-36 sm:w-[200px] mx-auto sm:mx-0 space-y-1.5">
                      <div className="grid grid-cols-4 gap-1.5">
                        {fotos.map((foto, i) => (
                          <button
                            key={foto.chave}
                            type="button"
                            onClick={() => setFotoSelecionada(foto.chave)}
                            aria-label={`Selecionar foto ${i + 1}${i === 0 ? ' (principal)' : ''}`}
                            aria-pressed={selecionada?.chave === foto.chave}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                              selecionada?.chave === foto.chave
                                ? 'border-[#A5683F]'
                                : 'border-[#DFC3AE]/70 hover:border-[#C48864]'
                            }`}
                          >
                            <img
                              src={foto.previa || foto.url}
                              alt={`Foto ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {i === 0 && (
                              <Star className="absolute top-0.5 left-0.5 w-3 h-3 fill-[#C48864] text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                        {fotos.length < MAX_FOTOS && (
                          <button
                            type="button"
                            onClick={() => inputImagem.current?.click()}
                            aria-label="Adicionar mais fotos"
                            className="aspect-square rounded-lg border border-dashed border-[#DFC3AE] bg-[#F7F3EA]/60 text-[#94603D] hover:border-[#C48864] flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {selecionada && (
                        <div className="flex items-center justify-between gap-1 rounded-lg border border-[#DFC3AE]/70 bg-[#F7F3EA] p-1">
                          <button
                            type="button"
                            onClick={() => moverFoto(selecionada.chave, -1)}
                            disabled={indiceSelecionada <= 0}
                            aria-label="Mover foto para a esquerda"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B4B36] hover:bg-white disabled:opacity-30"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          {indiceSelecionada === 0 ? (
                            <span className="flex-1 text-center text-[10px] font-semibold text-[#8C5636]">
                              Foto principal
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => tornarPrincipal(selecionada.chave)}
                              className="flex-1 h-7 rounded-md text-[10px] font-semibold text-[#8C5636] hover:bg-white flex items-center justify-center gap-1"
                            >
                              <Star className="w-3 h-3" /> Tornar principal
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => moverFoto(selecionada.chave, 1)}
                            disabled={indiceSelecionada >= fotos.length - 1}
                            aria-label="Mover foto para a direita"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B4B36] hover:bg-white disabled:opacity-30"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removerFoto(selecionada.chave)}
                            aria-label="Remover foto selecionada"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-red-600 hover:bg-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="text-[10px] text-[#6B4B36]/90 leading-snug">
                        {fotos.length} de {MAX_FOTOS} fotos · toque numa miniatura para mudar a
                        ordem, escolher a principal ou remover.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 bg-[#F7F3EA] rounded-xl border border-[#DFC3AE]/60">
                  <Label
                    htmlFor="ativo"
                    className="text-xs font-bold text-[#0C1014] cursor-pointer flex items-center gap-1"
                  >
                    Ativo no catálogo
                    <DicaAjuda titulo="Ativo × Inativo">
                      <p>
                        Produtos inativos não aparecem para escolha em pedidos e orçamentos nem na
                        loja virtual, mas o histórico de vendas continua. Útil para itens fora de
                        linha.
                      </p>
                    </DicaAjuda>
                  </Label>
                  <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 bg-[#F7F3EA] rounded-xl border border-[#DFC3AE]/60">
                  <Label
                    htmlFor="publicado-loja"
                    className="text-xs font-bold text-[#0C1014] cursor-pointer flex items-center gap-1"
                  >
                    Publicado na loja virtual
                    <DicaAjuda titulo="Loja virtual">
                      <p>
                        Quando ligado (e o produto está ativo), ele aparece no catálogo público da
                        loja com foto, nome, descrição, preço e categoria. O custo e o estoque nunca
                        são mostrados aos clientes. Com estoque acima de zero o produto aparece como
                        "Pronta entrega"; com zero, como "Sob encomenda".
                      </p>
                    </DicaAjuda>
                  </Label>
                  <Switch
                    id="publicado-loja"
                    checked={publicadoLoja}
                    onCheckedChange={setPublicadoLoja}
                  />
                </div>
              </div>

              {/* COLUNA DIREITA: DADOS */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="nome"
                    className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                  >
                    Nome do Produto
                    <Obrigatorio />
                  </Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Chaveiro 3D personalizado ou Cartão de visita (1000 un.)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="h-10 text-xs border-[#DFC3AE]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="desc"
                    className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                  >
                    Descrição
                    <Opcional />
                  </Label>
                  <Textarea
                    id="desc"
                    placeholder="Material (PLA, PETG, resina, papel), cores, dimensões, acabamento, prazo..."
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    className="text-xs border-[#DFC3AE] min-h-[60px] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="preco"
                      className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                    >
                      Preço de venda (R$)
                      <Obrigatorio />
                    </Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={precoVendaStr}
                      onChange={(e) => setPrecoVendaStr(e.target.value)}
                      className="h-10 text-xs border-[#DFC3AE]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="custo"
                      className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                    >
                      Custo (R$)
                      <Opcional />
                    </Label>
                    <Input
                      id="custo"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={custoStr}
                      onChange={(e) => setCustoStr(e.target.value)}
                      className="h-10 text-xs border-[#DFC3AE]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="produtos-campo-1"
                      className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                    >
                      Categoria
                      <Obrigatorio />
                    </Label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger
                        id="produtos-campo-1"
                        className="h-10 text-xs border-[#DFC3AE]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoriasDisponiveis.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="est"
                      className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
                    >
                      Estoque (un)
                      <Opcional />
                    </Label>
                    <Input
                      id="est"
                      type="number"
                      min="0"
                      value={estoqueStr}
                      onChange={(e) => setEstoqueStr(e.target.value)}
                      className="h-10 text-xs border-[#DFC3AE]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {erro && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                {erro}
              </div>
            )}

            <DialogFooter className="gap-2">
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
                disabled={salvando}
                className="bg-[#A5683F] hover:bg-[#8C5636] text-white h-10 text-xs font-semibold"
              >
                {salvando ? 'Enviando fotos...' : 'Salvar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(produtoParaExcluir)}
        onOpenChange={(open) => !open && setProdutoParaExcluir(null)}
      >
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-lg font-bold text-[#0C1014] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#A84A34]" />
              Excluir Produto do Catálogo?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              Tem certeza que deseja remover <strong>{produtoParaExcluir?.nome}</strong>? Os pedidos
              históricos já registrados que contêm este produto não serão alterados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#DFC3AE] text-[#6B4B36] text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              className="bg-[#B5533C] hover:bg-red-700 text-white text-xs font-semibold"
            >
              Sim, Excluir Produto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Foto do produto no card; sem foto (ou se falhar ao carregar), mostra um ícone. */
function FotoProduto({ url, nome }: { url?: string; nome: string }) {
  const [falhou, setFalhou] = useState(false)
  useEffect(() => setFalhou(false), [url])
  if (!url || url === '/placeholder.svg' || falhou) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#C9A68C]">
        <Package className="w-10 h-10" strokeWidth={1.25} />
        <span className="text-[10px] font-medium text-[#6B4B36]/90">Sem foto</span>
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={nome}
      onError={() => setFalhou(true)}
      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      loading="lazy"
    />
  )
}

const MAX_FOTOS = 8

interface FotoForm {
  chave: string
  url?: string // foto já salva
  nova?: ImagemPreparada // foto escolhida agora (enviada ao salvar)
  previa?: string // endereço temporário para mostrar a foto nova
}
