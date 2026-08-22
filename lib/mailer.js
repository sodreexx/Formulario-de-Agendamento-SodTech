import nodemailer from 'nodemailer'

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || GMAIL_USER

const SIZE_LABELS = {
  A: 'Microempresa (1 a 9 colaboradores)',
  B: 'Pequena empresa (10 a 49 colaboradores)',
  C: 'Média empresa (50 a 199 colaboradores)',
  D: 'Grande empresa (200 colaboradores ou mais)',
}

function formatDateBR(iso) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}/${m}/${y}` : iso
}

export function buildEmail(data) {
  const subject = `Novo agendamento: ${data.name} · ${data.company}`
  const lines = [
    `Nome: ${data.name}`,
    `Empresa: ${data.company}`,
    `WhatsApp: ${data.dial} ${data.phone}`,
    `E-mail: ${data.email}`,
    `Porte: ${SIZE_LABELS[data.size] ?? data.size}`,
    `Objetivo: ${data.goal}`,
    `Data e horário desejados: ${formatDateBR(data.date)} às ${data.time}`,
    `Observações: ${data.notes || '—'}`,
  ]
  return { subject, text: lines.join('\n') }
}

let transporter = null

/** Retorna null se as credenciais do Gmail não estiverem configuradas. */
export function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  }
  return transporter
}

/** Envia o e-mail de notificação do lead. Lança em caso de falha — quem
 *  chama decide o que fazer (ver a tabela de resiliência da spec). */
export async function sendLeadEmail(data) {
  const mailer = getTransporter()
  if (!mailer) {
    throw new Error('GMAIL_USER/GMAIL_APP_PASSWORD não configurados')
  }
  const { subject, text } = buildEmail(data)
  await mailer.sendMail({
    from: `Agendamento Sod Tech <${GMAIL_USER}>`,
    to: NOTIFY_EMAIL,
    replyTo: data.email,
    subject,
    text,
  })
}
