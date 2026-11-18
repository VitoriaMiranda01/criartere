/* Loja virtual → Avisos: frases do letreiro no topo da loja.
   Adaptado do AnnouncementSettings (site da Fran Wig Laces): liga/desliga, lista de
   frases (editar, adicionar com botão ou Enter, remover, mudar a ordem) e prévia ao vivo. */
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, ExternalLink, Megaphone, Plus, Save, Trash2 } from 'lucide-react'
import { CabecalhoPagina } from '@/components/common/CabecalhoPagina'
import { AbasSecao, SECAO_LOJA_VIRTUAL } from '@/components/common/AbasSecao'
import { DicaAjuda } from '@/components/common/DicaAjuda'
import { useCriartere } from '@/store/CriartereContext'
import { BarraAvisos } from '@/loja/BarraAvisos'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const MAX_CARACTERES = 80
const MAX_FRASES = 20

export default function Avisos() {
  const { state, dispatch } = useCriartere()
  const salvo = state.config

  const [ativa, setAtiva] = useState(salvo.barraAvisosAtiva)
  const [frases, setFrases] = useState<string[]>(salvo.barraAvisos)
  const [nova, setNova] = useState('')

  // Recarrega quando os valores salvos mudarem de verdade (ex.: outro aparelho salvou)
  const chaveSalva = JSON.stringify([salvo.barraAvisosAtiva, salvo.barraAvisos])
  useEffect(() => {
    const [a, f] = JSON.parse(chaveSalva) as [boolean, string[]]
    setAtiva(a)
    setFrases(f)
  }, [chaveSalva])

  const limpas = frases.map((f) => f.trim()).filter(Boolean)
  const alterado = JSON.stringify([ativa, limpas]) !== chaveSalva

  const adicionar = () => {
    const t = nova.trim()
    if (!t) return
    if (frases.length >= MAX_FRASES) return void toast.error(`Use até ${MAX_FRASES} frases.`)
    setFrases((l) => [...l, t])
    setNova('')
  }
  const atualizar = (i: number, v: string) => setFrases((l) => l.map((x, j) => (j === i ? v : x)))
  const remover = (i: number) => setFrases((l) => l.filter((_, j) => j !== i))
  const mover = (i: number, direcao: -1 | 1) =>
    setFrases((l) => {
      const j = i + direcao
      if (j < 0 || j >= l.length) return l
      const c = [...l]
      ;[c[i], c[j]] = [c[j], c[i]]
      return c
    })

  const salvar = () => {
    if (ativa && limpas.length === 0)
      return void toast.error('Adicione ao menos uma frase ou desligue a barra.')
    dispatch({
      type: 'ATUALIZAR_CONFIG',
      payload: { barraAvisosAtiva: ativa, barraAvisos: limpas },
    })
    setFrases(limpas)
    toast.success(
      state.modoDemo
        ? 'Modo desenvolvedor: a alteração não é gravada na loja.'
        : ativa
          ? 'Barra de avisos salva e no ar na loja!'
          : 'Barra de avisos salva (desligada).',
    )
  }

  const btnIcone = 'h-9 w-9 text-[#6B4B36] shrink-0'

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Barra de Avisos"
        descricao="Frases que passam em sequência no topo de todas as páginas da loja"
        ajuda={
          <DicaAjuda titulo="Barra de avisos" topico="avisos" lado="bottom">
            <p>
              Use para avisos rápidos: frete grátis, prazo de produção, datas especiais, cupom da
              semana.
            </p>
            <p>O cliente pode pausar passando o mouse em cima e fechar no ✕.</p>
          </DicaAjuda>
        }
      />
      <AbasSecao abas={SECAO_LOJA_VIRTUAL} rotulo="Loja virtual" />

      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#DFC3AE]/70 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Switch id="avisos-ativa" checked={ativa} onCheckedChange={setAtiva} />
          <Label
            htmlFor="avisos-ativa"
            className="text-sm font-semibold text-[#0C1014] cursor-pointer"
          >
            Mostrar a barra de avisos na loja
          </Label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {alterado && (
            <span className="text-xs font-semibold text-[#A5683F]">Alterações não salvas</span>
          )}
          <Button
            asChild
            variant="outline"
            className="border-[#DFC3AE] text-[#6B4B36] text-xs h-9 px-3 rounded-lg"
          >
            <a href="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1.5" />
              Ver na loja
            </a>
          </Button>
          <Button
            onClick={salvar}
            disabled={!alterado}
            className="bg-[#A5683F] hover:bg-[#8C5636] text-white text-xs h-9 px-4 rounded-lg font-semibold"
          >
            <Save className="w-4 h-4 mr-1.5" />
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* FRASES */}
        <section className="bg-white p-5 rounded-2xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
          <h2 className="font-serif font-bold text-base text-[#0C1014]">
            Frases{' '}
            <span className="text-xs font-sans font-normal text-[#6B4B36]">
              ({frases.length}/{MAX_FRASES})
            </span>
          </h2>

          {frases.length === 0 ? (
            <div className="py-8 text-center space-y-2 rounded-xl border border-dashed border-[#DFC3AE] bg-[#F7F3EA]/50">
              <Megaphone className="w-7 h-7 mx-auto text-[#94603D] opacity-70" />
              <p className="text-xs text-[#6B4B36]">
                Nenhuma frase ainda. Adicione a primeira abaixo.
              </p>
            </div>
          ) : (
            <ol className="space-y-2">
              {frases.map((frase, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="w-5 text-right text-[11px] font-bold text-[#6B4B36] shrink-0">
                    {i + 1}.
                  </span>
                  <Input
                    aria-label={`Frase ${i + 1}`}
                    value={frase}
                    maxLength={MAX_CARACTERES}
                    onChange={(e) => atualizar(i, e.target.value)}
                    className="h-9 text-sm border-[#DFC3AE] flex-1 min-w-0"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Subir frase ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => mover(i, -1)}
                    className={btnIcone}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Descer frase ${i + 1}`}
                    disabled={i === frases.length - 1}
                    onClick={() => mover(i, 1)}
                    className={btnIcone}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover frase ${i + 1}`}
                    onClick={() => remover(i)}
                    className="h-9 w-9 shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}

          <div className="flex gap-2 pt-1">
            <Input
              aria-label="Nova frase"
              value={nova}
              maxLength={MAX_CARACTERES}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  adicionar()
                }
              }}
              placeholder="Nova frase (ex.: Frete grátis acima de R$ 150)"
              className="h-9 text-sm border-[#DFC3AE] flex-1 min-w-0"
            />
            <Button
              type="button"
              onClick={adicionar}
              disabled={!nova.trim()}
              className="h-9 bg-[#0C1014] hover:bg-[#2a2a2a] text-white text-xs font-semibold shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <p className="text-[10px] text-[#6B4B36]/90">
            Até {MAX_CARACTERES} caracteres por frase. Aperte Enter para adicionar.
          </p>
        </section>

        {/* PRÉVIA */}
        <section className="bg-white p-5 rounded-2xl border border-[#DFC3AE]/70 shadow-xs space-y-3">
          <h2 className="font-serif font-bold text-base text-[#0C1014]">Prévia</h2>
          <div className="rounded-xl overflow-hidden border border-[#DFC3AE]/70">
            {ativa && limpas.length > 0 ? (
              <BarraAvisos frases={limpas} fechavel={false} />
            ) : (
              <p className="p-4 text-xs text-[#6B4B36] italic">
                {ativa ? 'Adicione frases para ver a prévia.' : 'A barra está desligada.'}
              </p>
            )}
            <div className="h-10 bg-[#F7F3EA] border-t border-[#DFC3AE]/60 flex items-center px-3 text-[11px] text-[#6B4B36]">
              Cabeçalho da loja
            </div>
          </div>
          <p className="text-[11px] text-[#6B4B36]">
            Passe o mouse sobre a prévia para pausar, como o cliente faz na loja.
          </p>
        </section>
      </div>
    </div>
  )
}
