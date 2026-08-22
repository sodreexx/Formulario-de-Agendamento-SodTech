// Controle de limite de envio — ver a seção "Regra do limite de envio" em
// docs/superpowers/specs/2026-08-22-vercel-supabase-backend-migration-design.md.
//
// Uma única tabela (rate_limit_hits) guarda e-mail e IP juntos em cada
// tentativa bem-sucedida (não bloqueada). A checagem:
//
//   1. IP:    conta tentativas desse IP nos últimos IP_WINDOW_MS.
//   2. Email: conta tentativas desse e-mail vindas de um IP DIFERENTE do
//             atual, dentro de EMAIL_WINDOW_MS.
//
// Efeito: o mesmo aparelho sempre consegue corrigir e reenviar (nunca conta
// contra o próprio limite de e-mail); só um IP diferente tentando o mesmo
// e-mail é bloqueado. O teto de IP vale para todo mundo, sempre.

const IP_WINDOW_MS = 15 * 60 * 1000
const IP_MAX = 5

const EMAIL_WINDOW_MS = 60 * 60 * 1000
const EMAIL_MAX = 1 // qualquer tentativa de outro IP já bloqueia

const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ email: string, ip: string }} params
 * @returns {Promise<{ blocked: false } | { blocked: true, reason: 'ip' | 'email' }>}
 */
export async function checkRateLimit(supabase, { email, ip }) {
  const now = Date.now()

  const ipSince = new Date(now - IP_WINDOW_MS).toISOString()
  const { count: ipCount, error: ipError } = await supabase
    .from('rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', ipSince)

  if (ipError) {
    // Supabase fora do ar não deve derrubar o formulário inteiro — melhor
    // deixar passar uma checagem de limite do que quebrar todo mundo por um
    // soluço do banco. Mesma filosofia de resiliência do restante da API.
    console.error('[rate-limit] falha ao consultar limite por IP:', ipError)
  } else if (ipCount >= IP_MAX) {
    return { blocked: true, reason: 'ip' }
  }

  const emailSince = new Date(now - EMAIL_WINDOW_MS).toISOString()
  const { count: emailCount, error: emailError } = await supabase
    .from('rate_limit_hits')
    .select('*', { count: 'exact', head: true })
    .eq('email', email)
    .neq('ip', ip)
    .gte('created_at', emailSince)

  if (emailError) {
    console.error('[rate-limit] falha ao consultar limite por e-mail:', emailError)
  } else if (emailCount >= EMAIL_MAX) {
    return { blocked: true, reason: 'email' }
  }

  return { blocked: false }
}

/**
 * Registra a tentativa (chamar só depois que checkRateLimit liberou) e
 * aproveita pra apagar, do mesmo e-mail/IP, linhas com mais de um dia — a
 * tabela nunca cresce sem limite, sem precisar de um cron job separado. Cada
 * delete usa o mesmo índice (email, created_at) / (ip, created_at) da
 * consulta acima, então sai barato mesmo rodando a cada requisição.
 *
 * Falha aqui não deve impedir o envio do formulário — só reduz a precisão
 * do limite na próxima tentativa, o que é aceitável.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ email: string, ip: string }} params
 */
export async function recordAttempt(supabase, { email, ip }) {
  const { error } = await supabase.from('rate_limit_hits').insert({ email, ip })
  if (error) {
    console.error('[rate-limit] falha ao gravar tentativa:', error)
  }

  const cutoff = new Date(Date.now() - CLEANUP_AGE_MS).toISOString()
  const [emailCleanup, ipCleanup] = await Promise.all([
    supabase.from('rate_limit_hits').delete().eq('email', email).lt('created_at', cutoff),
    supabase.from('rate_limit_hits').delete().eq('ip', ip).lt('created_at', cutoff),
  ])
  if (emailCleanup.error) console.error('[rate-limit] falha na limpeza por e-mail:', emailCleanup.error)
  if (ipCleanup.error) console.error('[rate-limit] falha na limpeza por IP:', ipCleanup.error)
}

/** Extrai o IP real do cliente. Em produção na Vercel, x-forwarded-for é
 *  preenchido de forma confiável pela borda deles (não é algo que o cliente
 *  final consiga forjar); localmente (sem proxy na frente) cai pro IP da
 *  conexão direta. */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const ip = first?.split(',')[0]?.trim()
  return ip || req.socket?.remoteAddress || 'unknown'
}
