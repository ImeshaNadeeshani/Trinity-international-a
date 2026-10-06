import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { dbClient, json, sha256, verifyWebhook } from '../_shared/portal.ts'
Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const raw = await request.text()
    if (raw.length > 16000) return json({ error: 'Payload too large' }, 413)
    if (!await verifyWebhook(raw, request.headers.get('x-signature') || '', Deno.env.get('PAYMENT_WEBHOOK_SECRET'))) return json({ error: 'Invalid callback signature' }, 401)
    const { payment_id, event_id, gateway_reference, status, amount, currency } = JSON.parse(raw)
    if (![payment_id,event_id,gateway_reference,status,currency].every(v => typeof v === 'string' && v.length > 0 && v.length < 200) || !Number.isFinite(Number(amount))) return json({ error: 'Invalid callback' }, 400)
    const db = dbClient()
    const { data: existing } = await db.from('payment_transactions').select('id').eq('event_id', event_id).maybeSingle()
    if (existing) return json({ received: true, duplicate: true })
    const { data: payment } = await db.from('portal_payments').select('*').eq('id', payment_id).single()
    if (!payment || payment.gateway_reference !== gateway_reference || Number(payment.amount) !== Number(amount) || payment.currency !== currency) return json({ error: 'Payment details do not match' }, 409)
    let path: string | null = null, hash: string | null = null
    if (status === 'successful') {
      const { data: profile } = await db.from('portal_profiles').select('full_name,student_number').eq('id', payment.student_id).single()
      const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica), page = pdf.addPage([595.28, 841.89])
      page.drawText('TRINITY INTERNATIONAL — PAYMENT RECEIPT', { x: 45, y: 780, size: 15, font, color: rgb(0, .4, .25) })
      const lines = [`Receipt: TI-RCT-${payment.id}`, `Student: ${profile?.full_name || profile?.student_number || payment.student_id}`, `Application: ${payment.application_id}`, `Description: ${payment.description}`, `Amount: ${currency} ${Number(amount).toFixed(2)}`, `Gateway reference: ${gateway_reference}`, `Confirmed: ${new Date().toISOString()}`]
      lines.forEach((line, i) => page.drawText(line, { x: 45, y: 725 - i * 32, size: 10, font, maxWidth: 500 }))
      const bytes = await pdf.save(); hash = await sha256(bytes)
      path = `${payment.student_id}/${payment.id}/${crypto.randomUUID()}.pdf`
      const { error } = await db.storage.from('student-private-receipts').upload(path, bytes, { contentType: 'application/pdf', upsert: false })
      if (error) throw new Error('Receipt storage failed; retry callback.')
    }
    const { error } = await db.rpc('portal_record_payment_event', { payment: payment_id, event: event_id, gateway_ref: gateway_reference, event_status: status, event_amount: amount, event_currency: currency, receipt_path: path, receipt_hash: hash })
    if (error) { if (path) await db.storage.from('student-private-receipts').remove([path]); return json({ error: error.message }, 409) }
    // A concurrent duplicate can lose the insert race: remove its unused PDF.
    if (path) {
      const { data: receipt } = await db.from('payment_receipts').select('pdf_path').eq('payment_id', payment_id).single()
      if (receipt?.pdf_path !== path) await db.storage.from('student-private-receipts').remove([path])
    }
    return json({ received: true })
  } catch { return json({ error: 'Callback could not be processed; retry with the same event ID.' }, 500) }
})
