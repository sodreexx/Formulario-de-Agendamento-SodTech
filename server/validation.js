// Validação dos dados do formulário de agendamento.
// Espelha as regras do front-end (src/App.tsx) como segunda linha de defesa:
// qualquer chamada direta à API também passa por aqui.

const VALID_SIZES = new Set(['A', 'B', 'C', 'D'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Conta apenas os dígitos de um telefone (ignora máscara). */
function digitsOf(value) {
  return String(value ?? '').replace(/\D/g, '')
}

/**
 * Valida o payload recebido em POST /api/agendamento.
 * Retorna { ok: true, data } com os campos normalizados, ou
 * { ok: false, errors } com um erro por campo inválido/ausente.
 */
export function validateAgendamento(body) {
  const errors = {}
  const b = body && typeof body === 'object' ? body : {}

  const dial = String(b.dial ?? '').trim()
  const phone = String(b.phone ?? '').trim()
  if (digitsOf(phone).length < 10) {
    errors.phone = 'Informe um WhatsApp completo com DDD.'
  }

  const name = String(b.name ?? '').trim()
  if (!name) {
    errors.name = 'Informe o nome completo.'
  }

  const company = String(b.company ?? '').trim()
  if (!company) {
    errors.company = 'Informe o nome da empresa.'
  }

  const email = String(b.email ?? '').trim()
  if (!EMAIL_RE.test(email)) {
    errors.email = 'Informe um e-mail válido.'
  }

  const size = String(b.size ?? '').trim()
  if (!VALID_SIZES.has(size)) {
    errors.size = 'Selecione o porte da empresa.'
  }

  const goal = String(b.goal ?? '').trim()
  if (!goal) {
    errors.goal = 'Conte o objetivo da reunião.'
  }

  const date = String(b.date ?? '').trim()
  const time = String(b.time ?? '').trim()
  if (!date || !time) {
    errors.slot = 'Escolha uma data e um horário.'
  }

  // Observações é opcional — nada a validar.
  const notes = String(b.notes ?? '').trim()

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: { dial, phone, name, company, email, size, goal, date, time, notes },
  }
}
