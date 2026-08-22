import { validateAgendamento } from '../lib/validation.js'
import { getSupabase } from '../lib/supabase.js'
import { checkRateLimit, recordAttempt, getClientIp } from '../lib/rate-limit.js'
import { sendLeadEmail } from '../lib/mailer.js'

const MESSAGES = {
  ip: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  email: 'Já recebemos sua solicitação recentemente. Nosso time vai entrar em contato em breve.',
  submit: 'Não foi possível processar sua solicitação. Tente novamente mais tarde.',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const result = validateAgendamento(req.body)
  if (!result.ok) {
    return res.status(400).json({ ok: false, errors: result.errors })
  }
  const data = result.data

  const supabase = getSupabase()
  const ip = getClientIp(req)

  if (supabase) {
    const rate = await checkRateLimit(supabase, { email: data.email, ip })
    if (rate.blocked) {
      return res.status(429).json({ ok: false, error: MESSAGES[rate.reason] })
    }
    // Grava só depois de passar nas checagens — um retry após falha de
    // envio não consome o limite de graça, e um bloqueio nunca "suja" a
    // tabela com uma tentativa que nem chegou a acontecer de fato.
    await recordAttempt(supabase, { email: data.email, ip })
  } else {
    console.warn(
      '[agendamento] SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — seguindo sem limite de envio nem histórico. Veja supabase/schema.sql.',
    )
  }

  // Lead e e-mail falham de forma independente, não em cascata: só volta
  // erro pro usuário se os DOIS falharem (ver a tabela de resiliência na
  // spec). Isso evita perder uma solicitação por causa de um Gmail
  // temperamental, e evita bloquear o envio por um soluço no Supabase.
  let leadId = null
  if (supabase) {
    const { data: inserted, error } = await supabase
      .from('leads')
      .insert({ ...data, email_sent: false })
      .select('id')
      .single()
    if (error) {
      console.error('[agendamento] falha ao salvar lead:', error)
    } else {
      leadId = inserted.id
    }
  }

  let emailSent = false
  try {
    await sendLeadEmail(data)
    emailSent = true
  } catch (err) {
    console.error('[agendamento] falha ao enviar e-mail:', err)
  }

  if (leadId && emailSent) {
    const { error } = await supabase.from('leads').update({ email_sent: true }).eq('id', leadId)
    if (error) console.error('[agendamento] falha ao marcar email_sent:', error)
  }

  if (leadId || emailSent) {
    return res.status(200).json({ ok: true })
  }

  return res.status(502).json({ ok: false, error: MESSAGES.submit })
}
