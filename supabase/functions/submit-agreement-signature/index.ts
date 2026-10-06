import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { authenticated, cors, decodePng, json, sha256 } from '../_shared/portal.ts'
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const { user, profile, db } = await authenticated(request, 'sign', 12)
    const raw = await request.text()
    if (raw.length > 2_900_000) return json({ error: 'Signature is too large.' }, 413)
    const { agreement_id, document_hash, signature, method, consent } = JSON.parse(raw)
    if (consent !== true || !['drawn','uploaded'].includes(method)) return json({ error: 'Review the agreement and explicitly confirm your signature.' }, 400)
    const { data: agreement } = await db.from('student_agreements').select('*').eq('id', agreement_id).single()
    if (!agreement || agreement.workflow_version !== 2) return json({ error: 'Agreement not found or uses the legacy signing workflow.' }, 404)
    const student = profile.role === 'student' && agreement.student_id === user.id && agreement.status === 'awaiting_student_signature'
    const management = ['head','delegate','signatory'].includes(profile.role) && user.id !== agreement.student_id && agreement.status === 'awaiting_head_signature' && agreement.student_signed_at
    if (!student && !management) return json({ error: 'You cannot sign at this agreement stage.' }, 403)
    if (document_hash !== agreement.document_sha256) return json({ error: 'The agreement changed. Reload and review it again.' }, 409)
    const imageBytes = decodePng(signature)
    const source = student ? agreement.private_pdf_path : agreement.student_signed_pdf_path
    const { data: file, error } = await db.storage.from('student-private-agreements').download(source)
    if (error || !file) throw new Error('Unable to load the agreement.')
    const original = new Uint8Array(await file.arrayBuffer())
    if (await sha256(original) !== document_hash) throw new Error('Agreement integrity check failed.')
    const pdf = await PDFDocument.load(original), mark = await pdf.embedPng(imageBytes)
    const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
    const page = pdf.addPage([595.28, 841.89]), now = new Date().toISOString()
    const label = student ? 'STUDENT SIGNATURE' : 'TRINITY MANAGEMENT APPROVAL'
    page.drawText(label, { x: 48, y: 780, size: 15, font: bold, color: rgb(0, .4, .26) })
    const lines = [agreement.reference_number, `Signer: ${profile.full_name}`, `Account: ${user.id}`, `Submitted: ${now}`, `Method: ${method}`, 'I confirm that I have reviewed the agreement and intend', 'to apply this signature to this agreement.']
    for (let i = 0; i < lines.length; i++) page.drawText(lines[i], { x: 48, y: 740 - i * 23, size: 10, font })
    const size = mark.scale(Math.min(260 / mark.width, 110 / mark.height))
    page.drawImage(mark, { x: 48, y: 425, width: size.width, height: size.height })
    page.drawText(`Reviewed document SHA-256:`, { x: 48, y: 360, size: 9, font })
    page.drawText(document_hash, { x: 48, y: 342, size: 8, font })
    const bytes = await pdf.save(), hash = await sha256(bytes)
    const path = `${agreement.student_id}/${agreement.application_id}/${agreement.reference_number}-${student ? 'student' : 'completed'}-${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await db.storage.from('student-private-agreements').upload(path, bytes, { contentType: 'application/pdf', upsert: false })
    if (uploadError) throw new Error('Unable to store the signed agreement.')
    const { data: status, error: saveError } = await db.rpc('portal_submit_signature', { agreement: agreement.id, actor: user.id, signature_method: method, input_hash: document_hash, output_hash: hash, pdf_path: path, metadata: { user_agent: request.headers.get('user-agent')?.slice(0, 500), request_id: crypto.randomUUID() } })
    if (saveError) { await db.storage.from('student-private-agreements').remove([path]); return json({ error: saveError.message }, 409) }
    return json({ status })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Signature could not be submitted.' }, 400) }
})
