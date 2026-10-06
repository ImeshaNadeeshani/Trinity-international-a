import { createClient } from 'npm:@supabase/supabase-js@2'
import { authenticated } from '../_shared/portal.ts'

const headers = { 'Access-Control-Allow-Origin': Deno.env.get('PORTAL_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' }
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    await authenticated(request, 'ocr', 20)
    const authorization = request.headers.get('Authorization') ?? ''
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await client.auth.getUser()
    if (!user) return reply({ error: 'Sign in first.' }, 401)
    const { document_id } = await request.json()
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: doc } = await db.from('student_documents').select('*').eq('id', document_id).eq('student_id', user.id).single()
    if (!doc) return reply({ error: 'Document not found.' }, 404)
    if (doc.scan_status !== 'clean' || ['rejected', 'replaced'].includes(doc.status)) return reply({ error: 'The document must pass its security scan before details can be extracted.' }, 409)
    const { data: existing } = await db.from('document_extractions').select('*').eq('document_id', doc.id).maybeSingle()
    if (existing) return reply(existing)
    const endpoint = Deno.env.get('DOCUMENT_OCR_GATEWAY_URL'), key = Deno.env.get('DOCUMENT_OCR_GATEWAY_API_KEY')
    if (!endpoint || !key) return reply({ error: 'Automatic document reading is not configured yet. You can complete My Profile while Trinity configures it.' }, 503)
    if (new URL(endpoint).protocol !== 'https:') return reply({ error: 'The document reader must use HTTPS.' }, 503)
    const { data: file, error } = await db.storage.from('student-private-documents').download(doc.storage_path)
    if (error || !file) throw new Error('Unable to read the uploaded document.')
    const bytes = new Uint8Array(await file.arrayBuffer())
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const response = await fetch(new URL('/extract', endpoint), { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ document_id: doc.id, category: doc.category, mime_type: doc.mime_type, base64: btoa(binary) }), signal: AbortSignal.timeout(45000) })
    if (!response.ok) throw new Error('Document reading failed. Try again or upload a clearer copy.')
    const result = await response.json()
    const fields: Record<string, string> = {}, confidence: Record<string, number> = {}
    for (const field of ['full_name', 'identification_number', 'residential_address', 'passport_number', 'date_of_birth', 'nationality']) {
      if (typeof result.fields?.[field] === 'string') fields[field] = result.fields[field].trim().slice(0, field === 'residential_address' ? 1000 : 200)
      const score = result.confidence?.[field]
      if (typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 1) confidence[field] = score
    }
    if (!Object.values(fields).some(Boolean)) return reply({ error: 'No readable details were found. Upload a clearer document or complete My Profile.' }, 422)
    // OCR is a suggestion, never an identity verification or automatic profile overwrite.
    const manual_review_required = ['full_name','identification_number'].some(field => !fields[field] || (confidence[field] ?? 0) < 0.85)
    const { error: saveError } = await db.from('document_extractions').upsert({ document_id: doc.id, student_id: user.id, fields, confidence, manual_review_required }, { onConflict: 'document_id', ignoreDuplicates: true })
    if (saveError) throw new Error('Unable to save extracted details.')
    const { data, error: readError } = await db.from('document_extractions').select('*').eq('document_id', doc.id).single()
    if (readError) throw new Error('Unable to load extracted details.')
    return reply(data)
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Document reading is unavailable.' }, 502) }
})
