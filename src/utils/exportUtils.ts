export function exportarParaCSV(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: (string | number)[][],
) {
  // UTF-8 BOM para garantir acentos perfeitos no Microsoft Excel no Brasil
  const BOM = '\uFEFF'

  const conteudoLinhas = linhas.map((linha) =>
    linha
      .map((item) => {
        const str = String(item ?? '')
        // Escapa aspas
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(';'),
  )

  const csvCompleto = [cabecalhos.join(';'), ...conteudoLinhas].join('\r\n')
  const blob = new Blob([BOM + csvCompleto], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${nomeArquivo}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function imprimirRelatorio(titulo: string) {
  const originalTitle = document.title
  document.title = `Criartere - ${titulo}`
  window.print()
  document.title = originalTitle
}
