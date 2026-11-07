/* Edição do próprio perfil: foto e nome. */
import { useEffect, useRef, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { atualizarMeuPerfil, enviarFotoPerfil, limparFotosAntigas, mensagemErro } from '@/store/db'
import { prepararFotoPerfil } from '@/lib/imagem'
import { Obrigatorio } from '@/components/common/MarcadorCampo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Camera, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

export function MeuPerfil() {
  const { state, dispatch } = useCriartere()
  const usuario = state.usuarioAtual
  const inputArquivo = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState(usuario.nome)
  const [fotoAtual, setFotoAtual] = useState<string | null>(usuario.avatarUrl ?? null)
  const [novaFoto, setNovaFoto] = useState<{ blob: Blob; extensao: string } | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Libera a memória da pré-visualização
  useEffect(() => () => void (previa && URL.revokeObjectURL(previa)), [previa])

  // Rola até o cartão quando aberto pelo menu (#meu-perfil)
  useEffect(() => {
    if (window.location.hash === '#meu-perfil') {
      document.getElementById('meu-perfil')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const fotoExibida = previa ?? fotoAtual
  const iniciais =
    (nome || usuario.email)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?'

  const alterou =
    nome.trim() !== usuario.nome || !!novaFoto || fotoAtual !== (usuario.avatarUrl ?? null)

  const escolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const foto = await prepararFotoPerfil(arquivo)
      setNovaFoto(foto)
      setPrevia(URL.createObjectURL(foto.blob))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const removerFoto = () => {
    setNovaFoto(null)
    setPrevia(null)
    setFotoAtual(null)
  }

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) {
      toast.error('Informe o seu nome.')
      return
    }
    setSalvando(true)
    try {
      let url = fotoAtual
      if (novaFoto) url = await enviarFotoPerfil(usuario.id, novaFoto)
      await atualizarMeuPerfil(nomeLimpo, url)
      // Remove fotos antigas sem travar a tela
      limparFotosAntigas(usuario.id, url).catch(() => undefined)
      dispatch({
        type: '__MESCLAR',
        payload: { usuarioAtual: { ...usuario, nome: nomeLimpo, avatarUrl: url ?? undefined } },
      })
      setFotoAtual(url)
      setNovaFoto(null)
      setPrevia(null)
      setNome(nomeLimpo)
      toast.success('Perfil atualizado!')
    } catch (err) {
      toast.error(`Não foi possível salvar o perfil. ${mensagemErro(err)}`)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card id="meu-perfil" className="border-[#DFC3AE]/70 bg-white shadow-xs scroll-mt-6">
      <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
        <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center gap-2">
          <UserRound className="w-4 h-4 text-[#C48864]" />
          Meu perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={salvar} className="flex flex-col sm:flex-row gap-6">
          {/* Foto */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              className="relative w-24 h-24 rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C48864] focus-visible:ring-offset-2"
              aria-label="Escolher foto de perfil"
            >
              {fotoExibida ? (
                <img
                  src={fotoExibida}
                  alt="Sua foto de perfil"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#DFC3AE]"
                />
              ) : (
                <span className="w-24 h-24 rounded-full bg-[#F7F3EA] border-2 border-[#DFC3AE] text-[#6B4B36] text-2xl font-semibold flex items-center justify-center">
                  {iniciais}
                </span>
              )}
              <span className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6" />
              </span>
            </button>
            <input
              ref={inputArquivo}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={escolherArquivo}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => inputArquivo.current?.click()}
                className="h-7 text-[11px] text-[#C48864]"
              >
                {fotoExibida ? 'Trocar foto' : 'Adicionar foto'}
              </Button>
              {fotoExibida && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removerFoto}
                  className="h-7 text-[11px] text-red-600"
                  title="Remover foto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-[#6B4B36]/70 text-center max-w-[10rem]">
              JPG, PNG ou WebP. A imagem é recortada em formato quadrado.
            </p>
          </div>

          {/* Dados */}
          <div className="flex-1 space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="perfil-nome"
                className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider"
              >
                Nome
                <Obrigatorio />
              </Label>
              <Input
                id="perfil-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
                autoComplete="name"
                className="h-10 text-sm border-[#DFC3AE]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#6B4B36] uppercase tracking-wider">
                E-mail de acesso
              </Label>
              <Input
                value={usuario.email}
                disabled
                className="h-10 text-sm border-[#DFC3AE] bg-[#F7F3EA]/50"
              />
              <p className="text-[11px] text-[#6B4B36]/70">
                O e-mail é usado para entrar no sistema e não pode ser alterado aqui.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!alterou || salvando}
                className="bg-[#C48864] hover:bg-[#B0764F] text-white text-xs font-semibold h-10 px-5"
              >
                {salvando ? 'Salvando...' : 'Salvar perfil'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
