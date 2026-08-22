import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import logo from '@/imports/marca_black.png'
import symbol from '@/imports/Logo_sod-selectiono.png'

/* The PNG carries a wide transparent margin, so the visible artwork is cropped
   out of it: content sits at x 317..609, y 65..117 within a 924×184 canvas. */
const ART = { x: 317, y: 65, w: 293, h: 53, iw: 924, ih: 184 }

function Logo({ height = 22, className = '' }: { height?: number; className?: string }) {
  const s = height / ART.h
  return (
    <span
      className={`block overflow-hidden ${className}`}
      style={{ width: ART.w * s, height }}
      aria-label="Sod Tech"
      role="img"
    >
      <img
        src={logo}
        alt=""
        className="max-w-none dark:invert"
        style={{
          width: ART.iw * s,
          height: ART.ih * s,
          marginLeft: -ART.x * s,
          marginTop: -ART.y * s,
        }}
      />
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* i18n                                                                */
/* ------------------------------------------------------------------ */

type Lang = 'pt' | 'en'

const SIZES: Record<Lang, { key: string; label: string; hint: string; short: string }[]> = {
  pt: [
    { key: 'A', label: 'Microempresa', hint: '1 a 9 colaboradores', short: 'Micro · 1 a 9 colaboradores' },
    { key: 'B', label: 'Pequena empresa', hint: '10 a 49 colaboradores', short: 'Pequena · 10 a 49 colaboradores' },
    { key: 'C', label: 'Média empresa', hint: '50 a 199 colaboradores', short: 'Média · 50 a 199 colaboradores' },
    { key: 'D', label: 'Grande empresa', hint: '200 colaboradores ou mais', short: 'Grande · 200 ou mais' },
  ],
  en: [
    { key: 'A', label: 'Micro business', hint: '1 to 9 employees', short: 'Micro · 1 to 9 employees' },
    { key: 'B', label: 'Small business', hint: '10 to 49 employees', short: 'Small · 10 to 49 employees' },
    { key: 'C', label: 'Medium business', hint: '50 to 199 employees', short: 'Medium · 50 to 199 employees' },
    { key: 'D', label: 'Large business', hint: '200 employees or more', short: 'Large · 200 or more' },
  ],
}

type Copy = {
  back: string
  press: string
  ok: string
  send: string
  sending: string
  review: string
  question: string
  of: string
  edit: string
  coFallback: string
  intro: { title: string; body: string; bodyMobile: string; cta: string; time: string }
  q: { title: (who: string, co: string) => string; hint: string; placeholder?: string }[]
  slotHint: string
  notesHint: ReactNode
  reviewTitle: string
  reviewSub: string
  labels: string[]
  doneTitle: (first: string) => string
  doneBody: (date: string, time: string) => string
  again: string
  errors: {
    required: string
    phone: string
    email: string
    size: string
    slot: string
    submit: string
    missingSummary: string
    modalTitle: string
    retry: string
    dismiss: string
  }
}

const DICT: Record<Lang, Copy> = {
  pt: {
    back: '← Voltar',
    press: 'pressione',
    ok: 'OK',
    send: 'Enviar',
    sending: 'Enviando…',
    review: 'Revisão',
    question: 'Pergunta',
    of: 'de',
    edit: 'editar',
    coFallback: 'sua empresa',
    intro: {
      title: 'Vamos conversar sobre o futuro da sua empresa',
      body: 'Preencha rapidinho seus dados para que nosso time entre em contato e agende uma reunião personalizada. Estamos prontos para entender suas necessidades e encontrar a melhor solução.',
      bodyMobile: 'Preencha seus dados para agendar uma reunião personalizada com nosso time e entender suas necessidades.',
      cta: 'Começar',
      time: 'Leva cerca de 2 minutos',
    },
    q: [
      { title: () => 'Qual o seu WhatsApp para contato?', hint: 'É por aqui que vamos confirmar o melhor horário com você. Sem spam, prometemos.' },
      { title: () => 'Qual é o seu nome completo?', hint: 'Assim sabemos como te chamar na nossa conversa.', placeholder: 'Digite aqui seu nome...' },
      { title: (who) => `${who} qual é o nome da sua empresa?`.trim(), hint: 'Use o nome pelo qual sua empresa é conhecida no mercado.', placeholder: 'Digite o nome da empresa...' },
      { title: (who) => `${who} qual o melhor e-mail para enviarmos a confirmação?`.trim(), hint: 'Enviaremos a confirmação da reunião para este endereço.', placeholder: 'nome@empresa.com.br' },
      { title: (who, co) => `${who} qual o porte da ${co}?`.trim(), hint: 'Isso nos ajuda a direcionar você ao especialista certo.' },
      { title: (who) => `${who} qual o principal objetivo da reunião com a Sod Tech?`.trim(), hint: 'Pode ser breve — só pra chegarmos preparados. Ex: automatizar processos, migrar para a nuvem...', placeholder: 'Conte em poucas palavras...' },
      { title: (who, co) => `${who} qual o momento ideal para conversarmos sobre a ${co}?`.trim(), hint: 'Escolha o dia e um horário livre na nossa agenda.' },
      { title: (who) => `${who} quer incluir algum detalhe ou observação?`.trim(), hint: 'Opcional — mas quanto mais contexto, melhor preparamos a conversa.', placeholder: 'Escreva aqui... (opcional)' },
    ],
    slotHint: 'Escolha o dia e um horário livre (conversa de até 45 min)',
    notesHint: (
      <>
        <span className="font-bold text-muted">Shift + Enter</span> para quebrar linha ·{' '}
        <span className="font-bold text-muted">Enter</span> para avançar
      </>
    ),
    reviewTitle: 'Está tudo certo?',
    reviewSub: 'Confira seus dados antes de enviar. Você pode editar qualquer item.',
    labels: ['WhatsApp', 'Nome', 'Empresa', 'E-mail', 'Porte', 'Objetivo', 'Melhor contato', 'Observações'],
    doneTitle: (first) => `Recebemos tudo${first ? `, ${first}` : ''}!`,
    doneBody: (date, time) => `Nosso time vai confirmar${date ? ` ${date}` : ''}${time ? ` às ${time}` : ''} pelo WhatsApp. Até breve.`,
    again: 'Enviar outra solicitação',
    errors: {
      required: 'Esse campo é obrigatório.',
      phone: 'Informe um WhatsApp completo com DDD.',
      email: 'Informe um e-mail válido.',
      size: 'Selecione o porte da empresa.',
      slot: 'Escolha uma data e um horário.',
      submit: 'Não foi possível enviar. Tente novamente.',
      missingSummary: 'Complete os campos obrigatórios antes de enviar.',
      modalTitle: 'Algo deu errado',
      retry: 'Tentar novamente',
      dismiss: 'Voltar à revisão',
    },
  },
  en: {
    back: '← Back',
    press: 'press',
    ok: 'OK',
    send: 'Send',
    sending: 'Sending…',
    review: 'Review',
    question: 'Question',
    of: 'of',
    edit: 'edit',
    coFallback: 'your company',
    intro: {
      title: "Let's talk about the future of your company",
      body: 'Fill in your details quickly so our team can reach out and schedule a personalized meeting. We are ready to understand your needs and find the best solution.',
      bodyMobile: 'Fill in your details so our team can schedule a personalized meeting and understand your needs.',
      cta: 'Get started',
      time: 'Takes about 2 minutes',
    },
    q: [
      { title: () => "What's your WhatsApp for contact?", hint: "This is how we'll confirm the best time with you. No spam, we promise." },
      { title: () => "What's your full name?", hint: 'So we know what to call you in our conversation.', placeholder: 'Type your name here...' },
      { title: (who) => `${who} what's the name of your company?`.trim(), hint: 'Use the name your company is known by in the market.', placeholder: 'Type your company name...' },
      { title: (who) => `${who} what's the best email for the confirmation?`.trim(), hint: "We'll send the meeting confirmation to this address.", placeholder: 'name@company.com' },
      { title: (who, co) => `${who} what's the size of ${co}?`.trim(), hint: 'This helps us direct you to the right specialist.' },
      { title: (who) => `${who} what's the main goal of the meeting with Sod Tech?`.trim(), hint: 'Keep it short — just so we come prepared. E.g. automate processes, migrate to the cloud...', placeholder: 'Tell us in a few words...' },
      { title: (who, co) => `${who} when's the ideal time to talk about ${co}?`.trim(), hint: 'Pick a day and a free time on our calendar.' },
      { title: (who) => `${who} want to add any detail or note?`.trim(), hint: 'Optional — but the more context, the better we prepare.', placeholder: 'Write here... (optional)' },
    ],
    slotHint: 'Pick a day and a free slot (up to a 45 min chat)',
    notesHint: (
      <>
        <span className="font-bold text-muted">Shift + Enter</span> for a new line ·{' '}
        <span className="font-bold text-muted">Enter</span> to continue
      </>
    ),
    reviewTitle: 'Is everything correct?',
    reviewSub: 'Review your details before sending. You can edit any item.',
    labels: ['WhatsApp', 'Name', 'Company', 'Email', 'Size', 'Goal', 'Best time', 'Notes'],
    doneTitle: (first) => `We got everything${first ? `, ${first}` : ''}!`,
    doneBody: (date, time) => `Our team will confirm${date ? ` ${date}` : ''}${time ? ` at ${time}` : ''} via WhatsApp. See you soon.`,
    again: 'Send another request',
    errors: {
      required: 'This field is required.',
      phone: 'Enter a complete WhatsApp number with area code.',
      email: 'Enter a valid email address.',
      size: 'Select the company size.',
      slot: 'Pick a date and a time.',
      submit: "Couldn't send it. Please try again.",
      missingSummary: 'Complete the required fields before sending.',
      modalTitle: 'Something went wrong',
      retry: 'Try again',
      dismiss: 'Back to review',
    },
  },
}

/* ------------------------------------------------------------------ */
/* Preloader                                                           */
/* ------------------------------------------------------------------ */

function Preloader({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1000)
    const t2 = setTimeout(() => onDone(), 1500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      className="paper-grid paper-wash fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-canvas"
      style={{
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img
        src={symbol}
        alt=""
        className="select-none dark:invert"
        style={{
          width: 64,
          height: 64,
          animation: 'star-spin 1.6s cubic-bezier(0.4,0,0.2,1) infinite',
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const TOTAL = 8

const SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']

const DIAL_CODES = [
  { flag: 'BR', code: '+55' },
  { flag: 'PT', code: '+351' },
  { flag: 'US', code: '+1' },
  { flag: 'AR', code: '+54' },
]

type Form = {
  dial: string
  phone: string
  name: string
  company: string
  email: string
  size: string
  goal: string
  date: string
  time: string
  notes: string
}

const EMPTY: Form = {
  dial: '+55',
  phone: '',
  name: '',
  company: '',
  email: '',
  size: '',
  goal: '',
  date: '',
  time: '',
  notes: '',
}

/* ------------------------------------------------------------------ */
/* Teclado virtual                                                    */
/* ------------------------------------------------------------------ */

/** Espelha a viewport *visível* do navegador.
 *
 *  No iOS o teclado não encolhe a viewport de layout — só a visual. É por isso
 *  que `position: fixed` some atrás do teclado: ele se ancora na de layout,
 *  que continua do tamanho da tela inteira.
 *
 *  Tentativas anteriores calculavam, por elemento, quanto empurrar de volta
 *  com `translateY`. Isso errou por dois motivos difíceis de acertar: a barra
 *  de endereço do Safari mexe nas mesmas medidas, e cada elemento precisava da
 *  sua própria conta. Aqui a medida é usada uma vez só, pra dimensionar o
 *  container do app; cabeçalho, conteúdo e botão então se acomodam por fluxo
 *  normal, sem conta nenhuma. */
function useVisualViewport() {
  const [vp, setVp] = useState<{ height: number | null; offsetTop: number }>({
    height: null,
    offsetTop: 0,
  })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    let frame = 0
    const update = () => {
      // O iOS dispara vários eventos durante a animação do teclado; agrupar
      // por frame evita re-render a cada um deles.
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVp({ height: vv.height, offsetTop: vv.offsetTop }))
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return vp
}

/** Painel de diagnóstico — só aparece com `?debug` na URL. Serve pra ler os
 *  valores reais num aparelho físico, já que emulação não reproduz o teclado
 *  do iOS com fidelidade. */
function DebugOverlay() {
  const [v, setV] = useState<Record<string, unknown>>({})

  useEffect(() => {
    const vv = window.visualViewport
    const update = () =>
      setV({
        vvH: Math.round(vv?.height ?? 0),
        vvTop: Math.round(vv?.offsetTop ?? 0),
        innH: window.innerHeight,
        scrollY: Math.round(window.scrollY),
        foco: document.activeElement?.tagName ?? '-',
      })

    update()
    const id = setInterval(update, 250)
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    return () => {
      clearInterval(id)
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[9999] bg-black/80 px-1.5 py-1 font-mono text-[11px] leading-tight text-green-400"
      style={{ transform: `translateY(${(v.vvTop as number) ?? 0}px)` }}
    >
      vvH {String(v.vvH)} · top {String(v.vvTop)} · innH {String(v.innH)} · scr {String(v.scrollY)} · {String(v.foco)}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Chrome                                                             */
/* ------------------------------------------------------------------ */

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-11 w-11 place-items-center rounded-full border border-line/80 bg-surface/70 text-ink-2 transition-colors hover:border-ink/30 hover:text-ink sm:h-9 sm:w-9"
    >
      {children}
    </button>
  )
}

function Header({
  step,
  t,
  lang,
  dark,
  onToggleLang,
  onToggleDark,
}: {
  step: number
  t: Copy
  lang: Lang
  dark: boolean
  onToggleLang: () => void
  onToggleDark: () => void
}) {
  const progress = step === 0 ? 0 : Math.min(step / TOTAL, 1)

  return (
    <header className="relative z-20 flex-none">
      <div className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo height={20} />
        <div className="flex items-center gap-3">
          {step > 0 && (
            <p className="hidden text-[13px] text-muted sm:block">
              {step > TOTAL ? t.review : (
                <>
                  {t.question} <span className="font-bold text-ink-2">{step}</span> {t.of} {TOTAL}
                </>
              )}
            </p>
          )}
          <button
            type="button"
            onClick={onToggleLang}
            className="rounded-full border border-line/80 bg-surface/70 px-3.5 py-2 text-[12px] font-bold text-ink-2 transition-colors hover:border-ink/30 hover:text-ink sm:px-3 sm:py-1.5"
            aria-label="Toggle language"
          >
            {lang === 'pt' ? 'EN' : 'PT'}
          </button>
          <IconButton onClick={onToggleDark} label="Toggle theme">
            {dark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </IconButton>
        </div>
      </div>
      <div className="relative h-[3px] w-full bg-line/60">
        <div
          className="h-full transition-[width] duration-700 ease-out"
          style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #6c7ba6 0%, #8f9fc2 100%)',
          }}
        />
      </div>
    </header>
  )
}

function StepBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[12px] font-semibold text-ink-2">
      {children}
    </span>
  )
}

function Question({
  badge,
  title,
  hint,
  children,
}: {
  badge: ReactNode
  title: ReactNode
  hint?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="step-in w-full max-w-[720px]">
      <StepBadge>{badge}</StepBadge>
      <h1 className="mt-5 text-[clamp(1.85rem,4.4vw,2.65rem)] font-extrabold leading-[1.12] tracking-[-0.028em] text-ink">
        {title}
      </h1>
      {hint && <p className="mt-3 max-w-[600px] text-[15px] leading-relaxed text-ink-2/80">{hint}</p>}
      {children && <div className="mt-10">{children}</div>}
    </div>
  )
}

const lineInput =
  'w-full border-b border-line bg-transparent pb-3 text-[clamp(1.25rem,2.6vw,1.6rem)] font-medium text-ink outline-none transition-colors placeholder:text-faint focus:border-ink/60'

function Footer({
  onBack,
  onNext,
  label,
  t,
  hintKey = true,
  disabled = false,
}: {
  onBack?: () => void
  onNext: () => void
  label: string
  t: Copy
  hintKey?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className="relative z-20 flex flex-none items-center gap-4 px-6 pt-5 sm:px-16"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 rounded-lg px-2 py-2.5 text-[15px] font-medium text-ink-2 transition-opacity hover:opacity-60"
        >
          {t.back}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled}
        className={`rounded-2xl bg-ink px-7 py-3.5 text-[15px] font-bold text-canvas shadow-[0_10px_24px_-14px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-px active:translate-y-0 ${
          disabled ? 'cursor-not-allowed opacity-40 hover:translate-y-0' : ''
        }`}
      >
        {label} <span className="ml-1">→</span>
      </button>
      {hintKey && (
        <p className="hidden items-center gap-2 text-[13px] text-faint sm:flex">
          {t.press}
          <kbd className="rounded-md bg-canvas-2 px-2 py-0.5 text-[12px] font-semibold text-muted">Enter</kbd>
          <span className="text-[11px]">⏎</span>
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  const head = d.slice(0, 2)
  const rest = d.slice(2)
  if (rest.length <= 4) return `(${head}) ${rest}`
  if (rest.length <= 8) return `(${head}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${head}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

function formatDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function digitsOf(raw: string) {
  return raw.replace(/\D/g, '')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* ------------------------------------------------------------------ */
/* Modal                                                              */
/* ------------------------------------------------------------------ */

function ErrorModal({
  isOpen,
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  isOpen: boolean
  title: string
  message: string
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void
  onSecondary: () => void
}) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onSecondary()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onSecondary])

  if (!isOpen) return null

  return (
    <div
      className="modal-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-md"
      onClick={onSecondary}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="modal-pop w-full max-w-[420px] rounded-3xl border border-line/70 bg-surface p-8 text-center shadow-[0_32px_64px_-20px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[19px] font-extrabold tracking-[-0.01em] text-ink">{title}</h2>
        <p className="mx-auto mt-2.5 max-w-[320px] text-[14px] leading-relaxed text-ink-2/80">{message}</p>

        <div className="mt-8 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPrimary}
            className="rounded-2xl bg-ink px-4 py-3 text-[14px] font-bold text-canvas transition-transform hover:-translate-y-px active:translate-y-0"
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-2xl px-4 py-3 text-[14px] font-semibold text-ink-2"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* App                                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [ready, setReady] = useState(false)
  const [step, setStep] = useState(0) // 0 = intro, 1..8 = perguntas, 9 = revisão, 10 = enviado
  const [form, setForm] = useState<Form>(EMPTY)
  const [lang, setLang] = useState<Lang>('pt')
  const [dark, setDark] = useState(false)
  const [stepError, setStepError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Quando a pergunta foi aberta pelo "editar" da revisão, confirmar (ou
  // voltar) devolve pra revisão em vez de seguir o fluxo normal de perguntas.
  const [editingFromReview, setEditingFromReview] = useState(false)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const t = DICT[lang]
  const sizes = SIZES[lang]
  const viewport = useVisualViewport()
  const debug = typeof window !== 'undefined' && window.location.search.includes('debug')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // A cada troca de pergunta, começa sem erro visível — mas um erro
  // levantado pela própria tentativa de avançar (mesma pergunta) permanece.
  useEffect(() => {
    setStepError(null)
  }, [step])

  // Ao abrir o teclado, a área de conteúdo encolhe e um campo alto (a caixa de
  // observações) pode ficar parcialmente abaixo dela. Traz o campo em foco de
  // volta pra área visível assim que a altura assenta.
  const lastHeight = useRef<number | null>(null)
  useEffect(() => {
    const height = viewport.height
    if (height == null) return
    const previous = lastHeight.current
    lastHeight.current = height
    // Só encolhimentos grandes são teclado; a barra do navegador é bem menor.
    if (previous == null || height >= previous - 100) return

    const field = document.activeElement
    if (!(field instanceof HTMLElement)) return
    if (field.tagName !== 'INPUT' && field.tagName !== 'TEXTAREA') return

    const id = setTimeout(() => field.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 280)
    return () => clearTimeout(id)
  }, [viewport.height])

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setStepError(null)
  }

  const first = form.name.trim().split(' ')[0]
  const who = first ? `${first},` : ''
  const co = form.company.trim() || t.coFallback

  /** Valida a pergunta `s` (1..8). Retorna a mensagem de erro, ou null se ok. */
  const validateStep = (s: number): string | null => {
    switch (s) {
      case 1:
        return digitsOf(form.phone).length < 10 ? t.errors.phone : null
      case 2:
        return form.name.trim() ? null : t.errors.required
      case 3:
        return form.company.trim() ? null : t.errors.required
      case 4:
        return EMAIL_RE.test(form.email.trim()) ? null : t.errors.email
      case 5:
        return form.size ? null : t.errors.size
      case 6:
        return form.goal.trim() ? null : t.errors.required
      case 7:
        return form.date && form.time ? null : t.errors.slot
      default:
        return null // step 8 (observações) é opcional
    }
  }

  const hasMissing = useMemo(
    () => [1, 2, 3, 4, 5, 6, 7].some((s) => validateStep(s) !== null),
    [form, t],
  )

  const REVIEW = 9

  /** Abre uma pergunta a partir do "editar" da revisão. */
  const editFromReview = (target: number) => {
    setEditingFromReview(true)
    setStep(target)
  }

  /** Volta pra revisão, encerrando o modo de edição. */
  const backToReview = () => {
    setEditingFromReview(false)
    setStep(REVIEW)
  }

  const back = () => {
    // Durante uma edição, "voltar" desiste da alteração de rota e retorna pra
    // revisão — não faz sentido cair na pergunta anterior.
    if (editingFromReview) {
      backToReview()
      return
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  const submit = async () => {
    setSending(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/agendamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setSubmitError(json?.error || t.errors.submit)
        return
      }
      setStep(10)
    } catch {
      setSubmitError(t.errors.submit)
    } finally {
      setSending(false)
    }
  }

  /** Avança respeitando validação (perguntas) e envio (revisão). */
  const advance = () => {
    if (step === 0) {
      setStep(1)
      return
    }
    if (step >= 1 && step <= 8) {
      const error = validateStep(step)
      if (error) {
        setStepError(error)
        return
      }
      if (editingFromReview) {
        backToReview()
        return
      }
      setStep(step + 1)
      return
    }
    if (step === 9) {
      if (hasMissing || sending) return
      void submit()
    }
  }

  const onEnter = (event: KeyboardEvent) => {
    if (event.key !== 'Enter') return
    if ((event.target as HTMLElement).tagName === 'TEXTAREA') {
      // Em telas de toque não há como segurar Shift no teclado virtual, então o
      // Enter vira quebra de linha normal — o usuário avança pelo botão.
      const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
      if (isTouch || event.shiftKey) return
    }
    event.preventDefault()
    advance()
  }

  const summary = useMemo(
    () => [
      { label: t.labels[0], value: `${form.dial} ${form.phone}`.trim(), go: 1, missing: validateStep(1) !== null },
      { label: t.labels[1], value: form.name, go: 2, missing: validateStep(2) !== null },
      { label: t.labels[2], value: form.company, go: 3, missing: validateStep(3) !== null },
      { label: t.labels[3], value: form.email, go: 4, missing: validateStep(4) !== null },
      { label: t.labels[4], value: sizes.find((s) => s.key === form.size)?.short ?? '', go: 5, missing: validateStep(5) !== null },
      { label: t.labels[5], value: form.goal, go: 6, missing: validateStep(6) !== null },
      { label: t.labels[6], value: [formatDate(form.date), form.time].filter(Boolean).join(' · '), go: 7, missing: validateStep(7) !== null },
      { label: t.labels[7], value: form.notes, go: 8, missing: false },
    ],
    [form, t, sizes],
  )

  return (
    <>
      {!ready && <Preloader onDone={() => setReady(true)} />}
      {debug && <DebugOverlay />}
    <div
      className="fixed inset-x-0 top-0 flex flex-col overflow-hidden bg-canvas"
      style={{
        // Altura da viewport *visível*: encolhe junto com o teclado, e é isso
        // que reposiciona pergunta, campo e botão — sem deslocar nada à mão.
        height: viewport.height ? `${viewport.height}px` : '100dvh',
        // Acompanha a rolagem que o iOS aplica na viewport visual ao focar.
        transform: viewport.offsetTop ? `translateY(${viewport.offsetTop}px)` : undefined,
        opacity: ready ? 1 : 0,
        transition:
          'height 0.25s cubic-bezier(0.25,0.1,0.25,1), transform 0.25s cubic-bezier(0.25,0.1,0.25,1), opacity 0.4s ease 0.1s',
      }}
    >
      <div className="paper-wash pointer-events-none absolute inset-0" />
      <div className="paper-grid pointer-events-none absolute inset-0" />

      <Header
        step={step}
        t={t}
        lang={lang}
        dark={dark}
        onToggleLang={() => setLang((l) => (l === 'pt' ? 'en' : 'pt'))}
        onToggleDark={() => setDark((d) => !d)}
      />

      <main
        className="relative z-10 flex min-h-0 flex-1 overflow-y-auto px-6 sm:px-10"
        onKeyDown={onEnter}
      >
        {/* `m-auto` centraliza sem cortar o topo quando o conteúdo é mais alto
            que a área disponível — o que acontece com o teclado aberto. */}
        <div className="m-auto flex w-full max-w-[1180px] justify-center py-8">
        {step === 0 && (
          <div className="step-in mx-auto max-w-[720px] text-center">
            <div className="flex justify-center">
              <Logo height={30} />
            </div>
            <h1 className="mt-8 text-[clamp(2.1rem,5.6vw,3.4rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink">
              {t.intro.title}
            </h1>
            {/* No mobile o texto é mais curto e justificado (cabe em 3
                linhas em vez de 5); no desktop segue o texto completo,
                centralizado como sempre foi. */}
            <p className="mx-auto mt-6 hidden max-w-[600px] text-[15px] leading-[1.75] text-ink-2/80 sm:block">
              {t.intro.body}
            </p>
            <p className="mx-auto mt-6 max-w-[600px] text-justify text-[15px] leading-[1.75] text-ink-2/80 sm:hidden">
              {t.intro.bodyMobile}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={advance}
                className="rounded-2xl bg-ink px-8 py-4 text-[15px] font-bold text-canvas shadow-[0_14px_30px_-16px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-px"
              >
                {t.intro.cta} <span className="ml-1">→</span>
              </button>
              <p className="flex items-center gap-2 text-[13px] text-faint">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                {t.intro.time}
              </p>
            </div>
          </div>
        )}

        {step >= 1 && step <= 8 && (() => {
          const q = t.q[step - 1]
          return (
            <Question badge={<>{step} →</>} title={q.title(who, co)} hint={q.hint}>
              {step === 1 && (
                <div className="flex items-end gap-5">
                  <div className="relative shrink-0">
                    <select
                      value={form.dial}
                      onChange={(e) => set('dial', e.target.value)}
                      className="w-[110px] appearance-none border-b border-line bg-transparent pb-3 pr-6 text-[clamp(1.25rem,2.6vw,1.6rem)] font-medium text-ink outline-none focus:border-ink/60"
                    >
                      {DIAL_CODES.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.flag} {d.code}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute bottom-4 right-1 text-muted">▾</span>
                  </div>
                  <input
                    autoFocus
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', maskPhone(e.target.value))}
                    placeholder="(62) 99999-9999"
                    className={lineInput}
                  />
                </div>
              )}

              {step === 2 && (
                <input autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={q.placeholder} className={lineInput} />
              )}

              {step === 3 && (
                <input autoFocus value={form.company} onChange={(e) => set('company', e.target.value)} placeholder={q.placeholder} className={lineInput} />
              )}

              {step === 4 && (
                <input autoFocus type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder={q.placeholder} className={lineInput} />
              )}

              {step === 5 && (
                <div className="flex flex-col gap-4">
                  {sizes.map((option) => {
                    const active = form.size === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => set('size', option.key)}
                        className={`flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all ${
                          active
                            ? 'border-accent bg-surface shadow-[0_12px_28px_-20px_rgba(0,0,0,0.5)]'
                            : 'border-line/80 bg-surface/70 hover:border-line hover:bg-surface'
                        }`}
                      >
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${
                            active ? 'bg-ink text-canvas' : 'bg-canvas-2 text-muted'
                          }`}
                        >
                          {option.key}
                        </span>
                        <span>
                          <span className="block text-[16px] font-bold text-ink">{option.label}</span>
                          <span className="block text-[13px] text-muted">{option.hint}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {step === 6 && (
                <input autoFocus value={form.goal} onChange={(e) => set('goal', e.target.value)} placeholder={q.placeholder} className={lineInput} />
              )}

              {step === 7 && (
                <div>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                    className="w-[240px] border-b border-line bg-transparent pb-3 text-[clamp(1.15rem,2.4vw,1.45rem)] font-medium text-ink outline-none focus:border-ink/60"
                  />
                  <p className="mt-5 text-[12px] text-faint">{t.slotHint}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {SLOTS.map((slot) => {
                      const active = form.time === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => set('time', slot)}
                          className={`rounded-full border px-5 py-2.5 text-[14px] font-semibold transition-all ${
                            active
                              ? 'border-transparent bg-ink text-canvas'
                              : 'border-line/80 bg-surface text-ink-2 hover:border-ink/30'
                          }`}
                        >
                          {slot}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 8 && (
                <div>
                  <textarea
                    autoFocus
                    ref={notesRef}
                    rows={4}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder={q.placeholder}
                    className="w-full resize-none rounded-2xl border border-line/80 bg-surface/60 p-5 text-[17px] leading-relaxed text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
                  />
                  <p className="mt-3 text-[12px] text-faint pointer-coarse:hidden">{t.notesHint}</p>
                </div>
              )}

              {stepError && (
                <p className="mt-4 text-[13px] font-semibold text-red-500 dark:text-red-400">{stepError}</p>
              )}
            </Question>
          )
        })()}

        {step === 9 && (
          <div className="step-in mx-auto w-full max-w-[720px]">
            <StepBadge>{t.review}</StepBadge>
            <h1 className="mt-5 text-[clamp(2rem,4.8vw,2.9rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
              {t.reviewTitle}
            </h1>
            {/* No mobile a largura é limitada pra o texto cair em 3 linhas,
                evitando a última linha órfã. No desktop volta ao normal. */}
            <p className="mt-3 max-w-[15rem] text-[15px] text-ink-2/80 sm:max-w-none">{t.reviewSub}</p>

            <ul className="mt-10 overflow-hidden rounded-2xl border border-line/70 bg-surface/70">
              {summary.map((row, index) => (
                <li
                  key={row.label}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[150px_1fr_auto] sm:gap-4 sm:px-6 ${
                    index > 0 ? 'border-t border-line/60' : ''
                  }`}
                >
                  <span className="text-[13px] text-muted">{row.label}</span>
                  <span
                    className={`text-right text-[15px] font-semibold sm:text-center ${
                      row.missing ? 'text-red-500 dark:text-red-400' : 'text-ink'
                    }`}
                  >
                    {row.value || <span className={row.missing ? '' : 'text-faint'}>—</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => editFromReview(row.go)}
                    className="text-[13px] font-medium text-ink-2 underline-offset-4 transition-opacity hover:underline hover:opacity-70"
                  >
                    {t.edit}
                  </button>
                </li>
              ))}
            </ul>

            {hasMissing && (
              <p className="mt-5 text-[13px] font-semibold text-red-500 dark:text-red-400">
                {t.errors.missingSummary}
              </p>
            )}
          </div>
        )}

        {step === 10 && (
          <div className="step-in mx-auto max-w-[620px] text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-ink">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="mt-8 text-[clamp(2rem,5vw,2.9rem)] font-extrabold leading-[1.1] tracking-[-0.03em] text-ink">
              {t.doneTitle(first)}
            </h1>
            <p className="mx-auto mt-5 max-w-[480px] text-[15px] leading-[1.75] text-ink-2/80">
              {t.doneBody(formatDate(form.date), form.time)}
            </p>
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY)
                setSubmitError(null)
                setEditingFromReview(false)
                setStep(0)
              }}
              className="mt-10 text-[14px] font-medium text-muted underline underline-offset-4 hover:text-ink-2"
            >
              {t.again}
            </button>
          </div>
        )}
        </div>
      </main>

      {step >= 1 && step <= 8 && (
        <Footer onBack={step > 1 ? back : undefined} onNext={advance} label={t.ok} t={t} />
      )}
      {step === 9 && (
        <Footer
          onBack={back}
          onNext={advance}
          label={sending ? t.sending : t.send}
          t={t}
          disabled={sending || hasMissing}
        />
      )}
    </div>

    <ErrorModal
      isOpen={!!submitError}
      title={t.errors.modalTitle}
      message={submitError || ''}
      primaryLabel={t.errors.retry}
      secondaryLabel={t.errors.dismiss}
      onPrimary={() => {
        setSubmitError(null)
        void submit()
      }}
      onSecondary={() => setSubmitError(null)}
    />
    </>
  )
}
