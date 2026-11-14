/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
// @ts-expect-error - uidPlugin is a custom plugin
import uidPlugin from './vite-plugin-react-uid'
import { seoPrerender } from './scripts/seo-prerender'

/** Carimba uma versão nova no service worker a cada build: o app instalado
    percebe a atualização, oferece recarregar e apaga os arquivos antigos. */
function versaoServiceWorker() {
  let pastaSaida = 'dist'
  return {
    name: 'criartere-versao-sw',
    apply: 'build' as const,
    configResolved(config: { build: { outDir: string }; root: string }) {
      pastaSaida = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const arquivo = path.join(pastaSaida, 'sw.js')
      if (!fs.existsSync(arquivo)) return
      const versao = `criartere-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`
      fs.writeFileSync(arquivo, fs.readFileSync(arquivo, 'utf8').replace('criartere-dev', versao))
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
  server: {
    host: '::',
    port: 8080,
  },
  build: {
    outDir: mode === 'development' ? 'dev-dist' : 'dist',
    minify: mode !== 'development',
    // lightningcss in every mode so dev/QA catches the same CSS errors as prod
    cssMinify: 'lightningcss',
    sourcemap: mode === 'development',
    rolldownOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      },
    },
  },
  plugins: [
    mode === 'development' ? uidPlugin() : undefined,
    react(),
    versaoServiceWorker(),
    // SEO: páginas da loja pré-geradas e sitemap com os produtos publicados
    mode === 'development'
      ? undefined
      : seoPrerender({
          supabaseUrl: env.VITE_SUPABASE_URL || 'https://kitarrykwoaxlrydethm.supabase.co',
          chave: env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cZrsEHE3NBApXxQRheeGjA_ouLJg4Pq',
        }),
  ].filter(Boolean),
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode ?? process.env.NODE_ENV ?? 'production'),
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
      {
        find: /zod\/v4\/core/,
        replacement: path.resolve(__dirname, 'node_modules', 'zod', 'v4', 'core'),
      }
    ],
  },
}
})
