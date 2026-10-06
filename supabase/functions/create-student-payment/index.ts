import { authenticated } from '../_shared/portal.ts'
const headers = { 'Access-Control-Allow-Origin': Deno.env.get('PORTAL_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    const {user,db}=await authenticated(request,'checkout',20)
    const { schedule_id, installment_id } = await request.json()
    const {data:payment,error:paymentError}=await db.rpc('portal_begin_payment',{schedule:schedule_id,item:installment_id||'initial',actor:user.id})
    if(paymentError)return reply({error:paymentError.message},409)
    const endpoint = Deno.env.get('PAYMENT_GATEWAY_URL'), key = Deno.env.get('PAYMENT_GATEWAY_API_KEY'), origin = Deno.env.get('PORTAL_ORIGIN')
    if (!endpoint || !key || !origin) return reply({ error: 'Online payments are not configured yet. Contact Trinity using your agreement reference.' }, 503)
    if (new URL(endpoint).protocol !== 'https:') throw new Error('Payment gateway requires HTTPS.')
    const response = await fetch(new URL('/checkout', endpoint), { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idempotency_key: payment.id, payment_id: payment.id, student_id: user.id, amount: payment.amount, currency: payment.currency, callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`, return_url: `${origin}/student-portal` }), signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error('Unable to open payment checkout. Please try again.')
    const result = await response.json(), link = new URL(result.checkout_url)
    const allowed = (Deno.env.get('PAYMENT_CHECKOUT_ORIGINS') || '').split(',').map(s => s.trim())
    if (link.protocol !== 'https:' || !allowed.includes(link.origin)) throw new Error('The payment provider returned an unapproved checkout address.')
    if(typeof result.gateway_reference!=='string'||!result.gateway_reference)throw new Error('Payment provider did not return a transaction reference.')
    const {error:saveError}=await db.from('portal_payments').update({status:'processing',gateway_reference:result.gateway_reference,checkout_url:link.href}).eq('id',payment.id).in('status',['pending','processing','failed'])
    if(saveError)throw new Error('Unable to record the checkout reference.')
    return reply({ checkout_url: link.href })
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Payment is unavailable.' }, 502) }
})
