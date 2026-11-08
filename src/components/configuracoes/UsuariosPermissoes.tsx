import { DicaAjuda } from '@/components/common/DicaAjuda'
/* Lista de contas cadastradas e controle do papel de cada uma. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import {
  definirPapel,
  listarUsuarios,
  mensagemErro,
  type PapelUsuario,
  type UsuarioSistema,
} from '@/store/db'
import { USUARIOS_DEMO } from '@/store/demo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDataBR } from '@/store/periodUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { RefreshCw, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

const NOME_PAPEL: Record<PapelUsuario, string> = {
  admin: 'Administrador(a)',
  desenvolvedor: 'Desenvolvedor(a)',
  cliente: 'Cliente',
}

const ESTILO_PAPEL: Record<PapelUsuario, string> = {
  admin: 'bg-[#4C8A5A]/15 text-[#2F5E3A] border-[#4C8A5A]/40',
  desenvolvedor: 'bg-[#5A7D8A]/15 text-[#2F4A55] border-[#5A7D8A]/40',
  cliente: 'bg-[#F7F3EA] text-[#6B4B36] border-[#DFC3AE]',
}

const ORDEM_PAPEL: Record<PapelUsuario, number> = { admin: 0, desenvolvedor: 1, cliente: 2 }

export function UsuariosPermissoes() {
  const { state } = useCriartere()
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [alterando, setAlterando] = useState<{
    usuario: UsuarioSistema
    papel: PapelUsuario
  } | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      if (state.modoDemo) {
        // Modo desenvolvedor: contas de exemplo (a lista real não é lida)
        setUsuarios([
          {
            userId: state.usuarioAtual.id,
            email: state.usuarioAtual.email,
            nome: state.usuarioAtual.nome,
            papel: 'desenvolvedor',
            avatarUrl: state.usuarioAtual.avatarUrl ?? null,
            criadoEm: new Date().toISOString(),
          },
          ...USUARIOS_DEMO.map((u, i) => ({
            ...u,
            userId: `demo-${i}`,
            avatarUrl: null,
            criadoEm: new Date().toISOString(),
          })),
        ])
        return
      }
      setUsuarios(await listarUsuarios())
    } catch (e) {
      toast.error(`Não foi possível carregar os usuários. ${mensagemErro(e)}`)
    } finally {
      setCarregando(false)
    }
  }, [state.modoDemo, state.usuarioAtual])

  useEffect(() => {
    carregar()
  }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const lista = t
      ? usuarios.filter(
          (u) => u.email.toLowerCase().includes(t) || (u.nome ?? '').toLowerCase().includes(t),
        )
      : usuarios
    // Administradores primeiro, depois desenvolvedores e clientes
    return [...lista].sort((a, b) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel])
  }, [usuarios, busca])

  const totalAdmins = usuarios.filter((u) => u.papel === 'admin').length

  const confirmar = async () => {
    if (!alterando) return
    const { usuario, papel } = alterando
    if (state.modoDemo) {
      setUsuarios((lista) => lista.map((u) => (u.userId === usuario.userId ? { ...u, papel } : u)))
      toast.success(`Modo desenvolvedor: papel alterado só nesta tela (nada foi salvo).`)
      setAlterando(null)
      return
    }
    try {
      await definirPapel(usuario.userId, papel)
      toast.success(`${usuario.nome || usuario.email} agora é ${NOME_PAPEL[papel].toLowerCase()}.`)
      await carregar()
    } catch (e) {
      toast.error(mensagemErro(e))
    } finally {
      setAlterando(null)
    }
  }

  const ehVoce = (u: UsuarioSistema) => u.email === state.usuarioAtual.email.toLowerCase()

  return (
    <Card className="border-[#DFC3AE]/70 bg-white shadow-xs">
      <CardHeader className="pb-3 border-b border-[#DFC3AE]/40">
        <CardTitle className="font-serif text-base font-bold text-[#0C1014] flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#94603D]" />
            Usuários e permissões
            <DicaAjuda topico="configuracoes">
              <p>
                Para liberar alguém: a pessoa cria a conta no site e você escolhe o papel dela ao
                lado do nome.
              </p>
              <p>
                Desenvolvedor(a) usa o sistema com dados fictícios e não vê nenhum dado real.
                Clientes não acessam o sistema.
              </p>
            </DicaAjuda>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={carregar}
            disabled={carregando}
            className="h-8 text-xs text-[#6B4B36]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <p className="text-xs text-[#6B4B36]">
          Qualquer pessoa pode criar uma conta, mas só <strong>administradores</strong> veem os
          dados da loja. <strong>Desenvolvedores</strong> usam o sistema com dados fictícios, para
          manutenção, sem acesso a clientes, pedidos ou finanças. Contas novas começam como{' '}
          <strong>cliente</strong> (sem acesso). Somente um administrador muda o papel de alguém.
        </p>

        <div className="relative">
          <Search className="w-4 h-4 text-[#6B4B36]/90 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9 text-xs border-[#DFC3AE]"
          />
        </div>

        {carregando && usuarios.length === 0 ? (
          <p className="text-xs text-[#6B4B36] py-4 text-center">Carregando usuários...</p>
        ) : filtrados.length === 0 ? (
          <p className="text-xs text-[#6B4B36] py-4 text-center">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="divide-y divide-[#DFC3AE]/40 border border-[#DFC3AE]/60 rounded-xl overflow-hidden">
            {filtrados.map((u) => {
              const unicoAdmin = u.papel === 'admin' && totalAdmins <= 1
              const podeAlterar = state.modoDemo || !unicoAdmin
              return (
                <li
                  key={u.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {u.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-[#DFC3AE] shrink-0"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-[#F7F3EA] border border-[#DFC3AE] text-[#6B4B36] text-xs font-semibold flex items-center justify-center shrink-0">
                        {(u.nome || u.email)[0]?.toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0C1014] truncate">
                        {u.nome || u.email.split('@')[0]}
                        {ehVoce(u) && (
                          <span className="ml-1.5 text-[10px] font-normal text-[#6B4B36]">
                            (você)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#6B4B36] truncate">
                        {u.email} &bull; desde {formatDataBR(u.criadoEm.slice(0, 10))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={u.papel}
                      disabled={!podeAlterar}
                      onValueChange={(papel: PapelUsuario) =>
                        papel !== u.papel && setAlterando({ usuario: u, papel })
                      }
                    >
                      <SelectTrigger
                        aria-label={`Papel de ${u.nome || u.email}`}
                        title={
                          podeAlterar
                            ? undefined
                            : 'O sistema precisa ter pelo menos um administrador'
                        }
                        className={`h-8 w-[180px] text-xs font-semibold ${ESTILO_PAPEL[u.papel]}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" className="text-xs">
                          Administrador(a)
                        </SelectItem>
                        <SelectItem value="desenvolvedor" className="text-xs">
                          Desenvolvedor(a)
                        </SelectItem>
                        <SelectItem value="cliente" className="text-xs">
                          Cliente (sem acesso)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!alterando} onOpenChange={(v) => !v && setAlterando(null)}>
        <AlertDialogContent className="bg-white border-[#DFC3AE]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">
              Tornar {alterando?.usuario.nome || alterando?.usuario.email}{' '}
              {alterando && NOME_PAPEL[alterando.papel].toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              {alterando?.papel === 'admin'
                ? 'A pessoa terá acesso completo a pedidos, clientes, finanças e configurações, inclusive para mudar o papel de outras contas.'
                : alterando?.papel === 'desenvolvedor'
                  ? 'A pessoa vai usar o sistema com dados fictícios, sem ver clientes, pedidos ou finanças reais, e não poderá salvar nada.'
                  : 'A pessoa não conseguirá mais entrar no sistema de gestão.'}
              {alterando && ehVoce(alterando.usuario) && alterando.papel !== 'admin'
                ? ' Você perderá o acesso aos dados reais assim que sair ou recarregar a página.'
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs border-[#DFC3AE]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmar}
              className="text-xs text-white bg-[#A5683F] hover:bg-[#8C5636]"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
