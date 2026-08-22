import { getTransporter } from '../lib/mailer.js'
import { getSupabase } from '../lib/supabase.js'

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    mailConfigured: Boolean(getTransporter()),
    dbConfigured: Boolean(getSupabase()),
  })
}
