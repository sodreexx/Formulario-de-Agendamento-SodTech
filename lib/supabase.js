import { createClient } from '@supabase/supabase-js'

let client = null

/**
 * Cliente Supabase, reaproveitado enquanto a instância serverless estiver
 * "quente" (a Vercel pode reciclar o mesmo processo entre invocações). Como
 * o supabase-js fala com o banco via REST/HTTP (PostgREST), não existe uma
 * conexão persistente a gerenciar — este cache só evita recriar o objeto à
 * toa a cada chamada dentro da mesma instância.
 *
 * Retorna null se as variáveis de ambiente não estiverem configuradas, pra
 * quem chama decidir como se comportar (mesmo padrão do getTransporter em
 * lib/mailer.js).
 */
export function getSupabase() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  client = createClient(url, key, {
    auth: { persistSession: false },
  })
  return client
}
