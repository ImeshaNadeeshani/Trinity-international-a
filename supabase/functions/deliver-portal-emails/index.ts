import { dbClient, json } from '../_shared/portal.ts'
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const token = Deno.env.get('PORTAL_EMAIL_WORKER_SECRET')
  if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) return json({ error: 'Unauthorized' }, 401)
  const key = Deno.env.get('RESEND_API_KEY'), from = Deno.env.get('PORTAL_FROM_EMAIL')
  if (!key || !from) return json({ error: 'Email delivery is not configured' }, 503)
  const db = dbClient()
  const { data: jobs, error } = await db.from('portal_email_outbox').select('*').eq('status', 'pending').lt('attempts', 10).order('created_at').limit(25)
  if (error) return json({ error: 'Queue unavailable' }, 500)
  let sent = 0
  for (const job of jobs || []) {
    const { data: notice } = await db.from('student_notifications').select('*').eq('id', job.notification_id).single()
    if (!notice) continue
    const { data: auth } = await db.auth.admin.getUserById(notice.student_id)
    if (!auth?.user?.email) continue
    try {
      const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `portal-${job.id}` }, body: JSON.stringify({ from, to: [auth.user.email], subject: notice.title, text: 'There is an update in your Trinity International portal. Sign in to view the details.' }), signal: AbortSignal.timeout(15000) })
      await db.from('portal_email_outbox').update({ status: response.ok ? 'sent' : 'pending', attempts: job.attempts + 1, last_attempt_at: new Date().toISOString() }).eq('id', job.id)
      if (response.ok) sent++
    } catch { await db.from('portal_email_outbox').update({ attempts: job.attempts + 1, last_attempt_at: new Date().toISOString() }).eq('id', job.id) }
  }
  return json({ sent })
})
