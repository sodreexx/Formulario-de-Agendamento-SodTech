import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import nodemailer from 'nodemailer'
import { validateAgendamento } from './validation.js'

const PORT = parseInt(process.env.PORT || '4000', 10)
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.GMAIL_USER
const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
// Origem do front-end que pode chamar esta API. Em produção, aponte para o
// domínio real do site (ex: https://agendamento.sodtech.com.br).
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:8443'

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

function buildEmail(data) {
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
function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    })
  }
  return transporter
}

const app = express()

// Em produção a API fica atrás do proxy da hospedagem (Render), então o IP da
// conexão é sempre o do proxy. Sem isto, o limite por IP abaixo viraria um
// limite único somado entre TODOS os visitantes. O valor 1 (um salto) faz o
// Express ler o IP real do X-Forwarded-For sem confiar no que o cliente
// mandou: o proxy acrescenta o IP verdadeiro por último, e é esse que vale.
app.set('trust proxy', 1)

app.use(cors({ origin: ALLOWED_ORIGIN }))
app.use(express.json())

// No máximo 5 envios por IP a cada 15 minutos — protege o formulário de
// scripts automatizados martelando o endpoint (spam de e-mail, abuso da
// conta Gmail). O health check fica de fora, não é preciso limitar.
const agendamentoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mailConfigured: Boolean(getTransporter()) })
})

app.post('/api/agendamento', agendamentoLimiter, async (req, res) => {
  const result = validateAgendamento(req.body)
  if (!result.ok) {
    return res.status(400).json({ ok: false, errors: result.errors })
  }

  const mailer = getTransporter()
  if (!mailer) {
    // Detalhe fica só no log do servidor — quem chama a API só sabe que
    // falhou, não que o motivo é uma credencial ausente.
    console.error(
      '[agendamento] GMAIL_USER/GMAIL_APP_PASSWORD não configurados. Veja server/.env.example.',
    )
    return res.status(500).json({
      ok: false,
      error: 'Não foi possível processar sua solicitação. Tente novamente mais tarde.',
    })
  }

  const { subject, text } = buildEmail(result.data)

  try {
    await mailer.sendMail({
      from: `Agendamento Sod Tech <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL,
      replyTo: result.data.email,
      subject,
      text,
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error('[agendamento] Falha ao enviar e-mail:', err)
    return res.status(502).json({ ok: false, error: 'Não foi possível enviar o e-mail. Tente novamente.' })
  }
})

app.listen(PORT, () => {
  console.log(`[agendamento] Servidor rodando em http://localhost:${PORT}`)
  if (!getTransporter()) {
    console.warn(
      '[agendamento] Aviso: GMAIL_USER/GMAIL_APP_PASSWORD ausentes — crie server/.env a partir de server/.env.example.',
    )
  }
})
