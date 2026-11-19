import { dbClient, json } from '../_shared/portal.ts'
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const token = Deno.env.get('PORTAL_EMAIL_WORKER_SECRET')
  if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) return json({ error: 'Unauthorized' }, 401)
  const key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('PORTAL_FROM_EMAIL')
  if (!key || !from) return json({ error: 'Email delivery is not configured' }, 503)
  const origin = Deno.env.get('PORTAL_ORIGIN')
  if (!origin) return json({ error: 'Configure PORTAL_ORIGIN for secure student portal links' }, 503)
  let portalOrigin: string
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname))) throw new Error('Invalid portal origin')
    portalOrigin = parsed.origin
  } catch { return json({ error: 'PORTAL_ORIGIN must be the HTTPS portal origin' }, 503) }
  const db = dbClient()
  const { data: jobs, error } = await db.from('portal_email_outbox').select('*').eq('status', 'pending').lt('attempts', 10).order('created_at').limit(25)
  if (error) return json({ error: 'Queue unavailable' }, 500)
  let sent = 0
  for (const job of jobs || []) {
    const { data: notice } = await db.from('student_notifications').select('*').eq('id', job.notification_id).single()
    if (!notice) continue
    const { data: auth } = await db.auth.admin.getUserById(notice.student_id)
    if (!auth?.user?.email) continue
    const { data: recipient } = await db.from('portal_profiles').select('role').eq('id', notice.student_id).single()
    if (!recipient) continue
    const student = recipient.role === 'student'
    const agreementUpdate = /agreement|signature/i.test(notice.title || '')
    const link = `${portalOrigin}${!student ? '/staff-portal' : agreementUpdate ? '/student-portal/agreements' : '/student-portal'}`
    const text = `${notice.message}\n\n${!student ? 'Sign in to the Trinity management portal' : agreementUpdate ? 'Review your agreement and sign in securely' : 'Sign in to view your application'}:\n${link}\n\nAccount authentication is required to access private documents.`
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `portal-${job.id}` }, body: JSON.stringify({ from, to: [auth.user.email], subject: notice.title, text }), signal: AbortSignal.timeout(15000) })
      await db.from('portal_email_outbox').update({ status: response.ok ? 'sent' : 'pending', attempts: job.attempts + 1, last_attempt_at: new Date().toISOString() }).eq('id', job.id)
      if (response.ok) sent++
    } catch { await db.from('portal_email_outbox').update({ attempts: job.attempts + 1, last_attempt_at: new Date().toISOString() }).eq('id', job.id) }
  }
  return json({ sent })
})
