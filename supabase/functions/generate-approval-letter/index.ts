import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { trinityLogoBase64 } from '../_shared/trinity-logo.ts'

const cors = { 'Access-Control-Allow-Origin': Deno.env.get('PORTAL_ORIGIN') ?? '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const safeLine=(value:unknown)=>String(value??'').replace(/\s+/g,' ').replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Authentication required' }, 401)
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return json({ error: 'Authentication required' }, 401)
  const admin = createClient(url, serviceKey)
  const { data: actor } = await admin.from('portal_profiles').select('role,full_name').eq('id', user.id).single()
  const { data: officer } = await admin.from('authorized_approval_officers').select('designation,can_approve_applications,active').eq('user_id', user.id).maybeSingle()
  if (actor?.role !== 'admin' && !(actor?.role==='board'&&officer?.active && officer.can_approve_applications)) return json({ error: 'Authorized approval officer access required' }, 403)

  const { application_id } = await request.json().catch(() => ({}))
  if (!application_id) return json({ error: 'application_id is required' }, 400)
  const { data: application, error: appError } = await admin.from('student_applications').select('id,student_id,destination,status,submitted_at').eq('id', application_id).single()
  if (appError || !application) return json({ error: 'Application not found' }, 404)
  if (application.status !== 'application_approved') return json({ error: 'Approve the application before generating its internal approval letter.' }, 409)
  const { data: existing } = await admin.from('approval_letters').select('id,reference_number').eq('application_id', application_id).maybeSingle()
  if (existing) return json({ error: 'An approval letter already exists for this application.', reference_number: existing.reference_number }, 409)
  const [{ data: student }, { data: config }] = await Promise.all([
    admin.from('portal_profiles').select('student_number,full_name').eq('id', application.student_id).single(),
    admin.from('trinity_configuration').select('registered_business_name,registered_address,official_email,approval_officer_name,approval_officer_designation').eq('id', true).single(),
  ])
  if (!student || !config) return json({ error: 'Student or Trinity configuration is missing.' }, 409)
  const approvalName=actor?.role==='board'?actor.full_name:config.approval_officer_name
  const approvalDesignation=actor?.role==='board'?officer?.designation:config.approval_officer_designation
  const required=[config.registered_business_name,config.registration_number,config.registered_address,config.official_email,approvalName,approvalDesignation]
  if(required.some((value)=>!value||value.startsWith('Pending')))return json({error:'Complete Trinity registered business details and authorized approval officer details before generating an official letter.'},409)
  const ref = `TI-APP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const pdf = await PDFDocument.create(), page = pdf.addPage([595.28, 841.89]), font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const green = rgb(0, 0.33, 0.19), gray = rgb(0.28, 0.34, 0.31)
  const trinityLogoBytes=Uint8Array.from(atob(trinityLogoBase64),c=>c.charCodeAt(0))
  const logo=await pdf.embedJpg(trinityLogoBytes),logoSize=logo.scale(Math.min(58/logo.width,58/logo.height))
  page.drawImage(logo,{x:55,y:770,width:logoSize.width,height:logoSize.height})
  page.drawText(safeLine(config.registered_business_name || 'Trinity International'), { x: 125, y: 790, size: 18, font: bold, color: green })
  page.drawText('OVERSEAS EDUCATION CONSULTANCY', { x: 125, y: 769, size: 9, font: bold, color: gray })
  page.drawText(safeLine(config.registered_address || ''), { x: 55, y: 744, size: 9, font, color: gray })
  if (config.official_email && !config.official_email.startsWith('Pending')) page.drawText(safeLine(config.official_email), { x: 55, y: 729, size: 9, font, color: gray })
  page.drawLine({ start: { x: 55, y: 711 }, end: { x: 540, y: 711 }, thickness: 1.5, color: green })
  page.drawText('INTERNAL APPLICATION APPROVAL', { x: 55, y: 665, size: 17, font: bold, color: green })
  page.drawText(`Reference: ${ref}`, { x: 55, y: 635, size: 10, font, color: gray })
  page.drawText(`Date: ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' })}`, { x: 55, y: 617, size: 10, font, color: gray })
  page.drawText(safeLine(`Student: ${student.full_name || 'Student'}`), { x: 55, y: 570, size: 12, font: bold, color: gray })
  page.drawText(`Student ID: ${student.student_number || 'Pending'}`, { x: 55, y: 548, size: 11, font, color: gray })
  page.drawText(safeLine(`Preferred study destination: ${application.destination}`), { x: 55, y: 526, size: 11, font, color: gray })
  const body = 'Trinity International confirms that the student application identified above has received internal approval following the consultancy review process. This letter records an internal Trinity International application decision.'
  page.drawText(body, { x: 55, y: 466, size: 11, font, color: gray, maxWidth: 485, lineHeight: 19 })
  const caution = 'This is an internal consultancy approval only. It is not a university admission offer, scholarship award, or visa approval. Admission and visa decisions are made by the relevant institutions and authorities.'
  page.drawText(caution, { x: 55, y: 378, size: 10, font: bold, color: gray, maxWidth: 485, lineHeight: 17 })
  page.drawText('Authorized approval officer', { x: 55, y: 270, size: 10, font: bold, color: green })
  page.drawText(safeLine(approvalName), { x: 55, y: 247, size: 11, font, color: gray })
  page.drawText(safeLine(approvalDesignation), { x: 55, y: 229, size: 10, font, color: gray })
  page.drawText('Generated electronically by Trinity International.', { x: 55, y: 75, size: 9, font, color: gray })
  const bytes = await pdf.save(), path = `${application.student_id}/${application.id}/${ref}.pdf`
  const { error: uploadError } = await admin.storage.from('student-private-letters').upload(path, bytes, { contentType: 'application/pdf', upsert: false })
  if (uploadError) return json({ error: 'Letter PDF storage failed.' }, 500)
  const { error: insertError } = await admin.from('approval_letters').insert({ application_id, student_id: application.student_id, reference_number: ref, storage_path: path, approved_by: user.id })
  if (insertError) { await admin.storage.from('student-private-letters').remove([path]); return json({ error: 'Could not register the approval letter.' }, 500) }
  await admin.from('application_activity').insert({ application_id, actor_id: user.id, event_type: 'approval_letter_generated', details: { reference_number: ref } })
  return json({ reference_number: ref })
})
