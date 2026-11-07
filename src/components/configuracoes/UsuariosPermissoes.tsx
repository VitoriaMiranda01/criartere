/* Lista de contas cadastradas e controle de quem é administrador. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCriartere } from '@/store/CriartereContext'
import { definirPapel, listarUsuarios, mensagemErro, UsuarioSistema } from '@/store/db'
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
import { RefreshCw, Search, ShieldCheck, Users } from 'lucide-react'
import { toast } from 'sonner'

export function UsuariosPermissoes() {
  const { state } = useCriartere()
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [alterando, setAlterando] = useState<UsuarioSistema | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      setUsuarios(await listarUsuarios())
    } catch (e) {
      toast.error(`Não foi possível carregar os usuários. ${mensagemErro(e)}`)
    } finally {
      setCarregando(false)
    }
  }, [])

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
    // Administradores primeiro
    return [...lista].sort((a, b) => (a.papel === b.papel ? 0 : a.papel === 'admin' ? -1 : 1))
  }, [usuarios, busca])

  const totalAdmins = usuarios.filter((u) => u.papel === 'admin').length

  const confirmar = async () => {
    if (!alterando) return
    const novoPapel = alterando.papel === 'admin' ? 'cliente' : 'admin'
    try {
      await definirPapel(alterando.userId, novoPapel)
      toast.success(
        novoPapel === 'admin'
          ? `${alterando.nome || alterando.email} agora é administrador(a).`
          : `${alterando.nome || alterando.email} deixou de ser administrador(a).`,
      )
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
            <Users className="w-4 h-4 text-[#C48864]" />
            Usuários e permissões
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
          Qualquer pessoa pode criar uma conta, mas só <strong>administradores</strong> acessam este
          sistema. Contas novas começam como <strong>cliente</strong>. Somente um administrador pode
          liberar o acesso de outra pessoa.
        </p>

        <div className="relative">
          <Search className="w-4 h-4 text-[#6B4B36]/60 absolute left-3 top-1/2 -translate-y-1/2" />
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
              const admin = u.papel === 'admin'
              const unicoAdmin = admin && totalAdmins <= 1
              return (
                <li
                  key={u.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white"
                >
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        admin
                          ? 'bg-[#4C8A5A]/15 text-[#2F5E3A] border-[#4C8A5A]/40'
                          : 'bg-[#F7F3EA] text-[#6B4B36] border-[#DFC3AE]'
                      }`}
                    >
                      {admin ? 'Administrador(a)' : 'Cliente'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={unicoAdmin}
                      title={
                        unicoAdmin ? 'O sistema precisa ter pelo menos um administrador' : undefined
                      }
                      onClick={() => setAlterando(u)}
                      className={`h-8 text-xs ${
                        admin
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-[#4C8A5A]/40 text-[#2F5E3A] hover:bg-emerald-50'
                      }`}
                    >
                      {admin ? (
                        'Remover admin'
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                          Tornar admin
                        </>
                      )}
                    </Button>
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
              {alterando?.papel === 'admin'
                ? `Remover o acesso de ${alterando?.nome || alterando?.email}?`
                : `Tornar ${alterando?.nome || alterando?.email} administrador(a)?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B4B36]">
              {alterando?.papel === 'admin'
                ? alterando && ehVoce(alterando)
                  ? 'Você perderá o acesso ao sistema de gestão assim que sair ou recarregar a página.'
                  : 'A pessoa não conseguirá mais entrar no sistema de gestão.'
                : 'A pessoa terá acesso completo a pedidos, clientes, finanças e configurações, inclusive para liberar outros administradores.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs border-[#DFC3AE]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmar}
              className={`text-xs text-white ${
                alterando?.papel === 'admin'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#4C8A5A] hover:bg-[#3D6F48]'
              }`}
            >
              {alterando?.papel === 'admin' ? 'Remover admin' : 'Tornar admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
