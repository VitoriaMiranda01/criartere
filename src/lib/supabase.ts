import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://kitarrykwoaxlrydethm.supabase.co'
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cZrsEHE3NBApXxQRheeGjA_ouLJg4Pq'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/** Gera um identificador único (UUID) compatível com as tabelas do banco. */
export function novoId(): string {
  return crypto.randomUUID()
}
