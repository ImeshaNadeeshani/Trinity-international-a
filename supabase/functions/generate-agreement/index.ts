import { createClient } from 'npm:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { authenticated } from '../_shared/portal.ts'

const cors={ 'Access-Control-Allow-Origin':Deno.env.get('PORTAL_ORIGIN')??'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return json({error:'Method not allowed'},405)
  try{await authenticated(request,'generate-agreement',20)}catch(e){return json({error:e.message},429)}
  const auth=request.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authError}=await userClient.auth.getUser()
  if(authError||!user)return json({error:'Authentication required'},401)
  const db=createClient(url,service),{data:actor}=await db.from('portal_profiles').select('role').eq('id',user.id).single()
  const {data:officer}=await db.from('authorized_approval_officers').select('active,can_approve_applications').eq('user_id',user.id).maybeSingle()
  if(actor?.role!=='admin'&&!(actor?.role==='board'&&officer?.active&&officer.can_approve_applications))return json({error:'Authorized approval officer access required'},403)
  const {application_id}=await request.json().catch(()=>({}));if(!application_id)return json({error:'application_id is required'},400)
  const {data:app}=await db.from('student_applications').select('*').eq('id',application_id).single()
  if(!app||app.status!=='application_approved')return json({error:'The application must have internal approval first.'},409)
  const [{data:old},{data:templates},{data:schedule},{data:profile},{data:config},{data:docs}]=await Promise.all([
    db.from('student_agreements').select('id,reference_number').eq('application_id',application_id).neq('status','voided').maybeSingle(),
    db.from('agreement_templates').select('id,name,body,version').eq('approval_status','approved').eq('active',true).order('approved_at',{ascending:false}).limit(1),
    db.from('student_payment_schedules').select('*,payment_installments(*)').eq('application_id',application_id).single(),
    db.from('portal_profiles').select('*').eq('id',app.student_id).single(),
    db.from('trinity_configuration').select('*').eq('id',true).single(),
    db.from('student_documents').select('category,status,scan_status').eq('application_id',application_id).neq('status','replaced'),
  ])
  if(old)return json({error:'An agreement already exists for this application.',reference_number:old.reference_number},409)
  const template=templates?.[0]
  if(!template)return json({error:'No approved and active agreement template is available. Student signing is disabled until management and legal approval.'},409)
  if(!schedule||!profile||!config)return json({error:'A complete student profile, approved payment schedule, and Trinity configuration are required.'},409)
  if(Math.round((schedule.payment_installments||[]).reduce((sum,i)=>sum+Number(i.amount),0)*100)!==Math.round(Number(schedule.balance)*100))return json({error:'Payment installments must total the remaining balance.'},409)
  const businessDetails=[config.registered_business_name,config.registration_number,config.registered_address,config.official_email]
  if(businessDetails.some((value)=>!value||value.startsWith('Pending')))return json({error:'Management must confirm Trinity registered business details before generating an agreement.'},409)
  if(!profile.full_name||!profile.identification_number||!profile.residential_address)return json({error:'Student name, identification number, and residential address must be completed before agreement generation.'},409)
  if(!docs?.length||docs.some((d)=>d.status!=='verified'||d.scan_status!=='clean'))return json({error:'All current student documents must be scanned and verified before agreement generation.'},409)
  const {data:ready,error:readyError}=await db.rpc('portal_application_ready',{app_id:application_id})
  if(readyError||!ready)return json({error:'Approve all mandatory documents, confirm NIC details and complete the profile before generating an agreement.'},409)
  const {data:ref,error:refError}=await db.rpc('portal_next_agreement_reference')
  if(refError)return json({error:'Unable to allocate an agreement reference.'},500)
  const scheduleText=[`Total consultancy fee: ${schedule.currency} ${Number(schedule.total_fee).toFixed(2)}`,`Initial payment: ${schedule.currency} ${Number(schedule.initial_payment).toFixed(2)}`,`Remaining balance: ${schedule.currency} ${Number(schedule.balance).toFixed(2)}`,...(schedule.payment_installments||[]).map((i)=>`${i.label}: ${schedule.currency} ${Number(i.amount).toFixed(2)} due ${i.due_at}`),`Accepted payment methods: ${(schedule.payment_methods||[]).join(', ')||'To be agreed'}`].join('\n')
  const services=(schedule.included_services||[]).join(', '),excluded=(schedule.excluded_expenses||[]).join(', ')
  const replacements:Record<string,string>={
    '[Insert Registered Name]':config.registered_business_name,'[Insert Number]':config.registration_number,'[Insert Address]':config.registered_address,
    '[Student Name]':profile.full_name||'Pending student information','[Identification Number]':profile.identification_number||'Pending verified identification','[System Generated ID]':profile.student_number||'Pending','[Student Address]':profile.residential_address||'Pending student information',
    '[Automatically Generated]':ref,'[Full Name]':'Pending authorized Trinity signatory assignment','[Official Designation]':'Pending authorized signatory designation',
    '[Signature: Authenticated Electronic Signature]':'Pending authorized electronic signature','[Authenticated Electronic Signature]':'Pending authorized electronic signature','[Date: Automatically Generated]':'Pending authorized signing',
  }
  const {data:studentAuth}=await db.auth.admin.getUserById(app.student_id)
  Object.assign(replacements,{'[NIC Number]':profile.nic_number,'[Passport Number]':profile.passport_number,'[Email]':studentAuth?.user?.email||'','[Phone Number]':profile.phone,'[Selected Country]':app.destination,'[Selected Course]':app.course_interest,'[Intake]':app.intake,'[Institution]':app.institution,'[Agreement Date]':new Date().toISOString().slice(0,10),'[Agreement Reference Number]':ref})
  let agreementText=template.body
  // The legacy template repeats the reference token in signature dates.
  agreementText=agreementText.replaceAll('Date: [Automatically Generated]', 'Date: Pending signature')
  for(const [key,value] of Object.entries(replacements))agreementText=agreementText.split(key).join(value)
  agreementText=agreementText.replaceAll('[Service and Payment Schedule]',scheduleText).replaceAll('[Consultancy Fee and Payment Schedule]',scheduleText).replaceAll('[Included Services]',services||'Included services to be confirmed in the service schedule').replaceAll('[Excluded Expenses]',excluded||'No excluded expenses specified in the service schedule')
  const refundSummary=config.refund_policy_status==='approved'?JSON.stringify(config.refund_policy):'PENDING MANAGEMENT AND LEGAL APPROVAL; no unapproved refund percentages, deductions or cancellation deadlines are enforced'
  agreementText=agreementText.replaceAll('[Approved Refund Policy]',refundSummary)
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold),green=rgb(0,0.33,0.19),ink=rgb(0.16,0.22,0.18)
  agreementText=agreementText.replace(/[–—]/g,'-').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/•/g,'-')
  const lines=agreementText.split(/\r?\n/),wrap=(line:string,max=92)=>{const words=line.split(/\s+/),out:string[]=[];let current='';for(const word of words){const next=current?`${current} ${word}`:word;if(next.length>max&&current){out.push(current);current=word}else current=next}if(current)out.push(current);return out.length?out:['']}
  let page=pdf.addPage([595.28,841.89]),y=790
  for(let lineNo=0;lineNo<lines.length;lineNo++){
    const original=lines[lineNo].trim(),isHeading=/^(\d+\.|TRINITY INTERNATIONAL|STUDENT CONSULTANCY SERVICE AGREEMENT|Draft)/i.test(original)
    for(const text of wrap(original)){
      if(y<58){page=pdf.addPage([595.28,841.89]);y=790}
      if(isHeading&&text===wrap(original)[0]){page.drawText(text,{x:48,y,size:lineNo<4?13:10,font:bold,color:green,maxWidth:490});y-=22}else{page.drawText(text,{x:48,y,size:9,font,color:ink,maxWidth:495});y-=13}
    }
    if(!original)y-=5
  }
  const path=`${app.student_id}/${app.id}/${ref}-unsigned.pdf`,bytes=await pdf.save()
  const {error:up}=await db.storage.from('student-private-agreements').upload(path,bytes,{contentType:'application/pdf',upsert:false})
  if(up)return json({error:'Unable to store the generated agreement securely.'},500)
  const status='awaiting_student_signature'
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')
  const {error:insert}=await db.rpc('portal_register_generated_agreement',{app_id:app.id,template:template.id,reference:ref,pdf_path:path,document_hash:hash,actor:user.id,template_data:template,student_data:{...profile,application:app,payment_schedule:schedule}})
  if(insert){await db.storage.from('student-private-agreements').remove([path]);return json({error:'Unable to register the generated agreement.'},500)}
  await db.from('application_activity').insert({application_id:app.id,actor_id:user.id,event_type:'agreement_generated',details:{reference_number:ref,template_version:template.version}})
  return json({reference_number:ref,status})
})
