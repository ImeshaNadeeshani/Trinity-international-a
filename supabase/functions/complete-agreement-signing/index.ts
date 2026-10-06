import { createClient } from 'npm:@supabase/supabase-js@2'

const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}})
const digest=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')
function same(a:string,b:string){if(a.length!==b.length)return false;let value=0;for(let i=0;i<a.length;i++)value|=a.charCodeAt(i)^b.charCodeAt(i);return value===0}
async function notify(db:ReturnType<typeof createClient>,studentId:string,title:string,message:string){
  await db.from('student_notifications').insert({student_id:studentId,title,message})
  const {data:config}=await db.from('trinity_configuration').select('email_provider').eq('id',true).single()
  if(config?.email_provider!=='resend'||Deno.env.get('EMAIL_PROVIDER')!=='resend'||!Deno.env.get('RESEND_API_KEY')||!Deno.env.get('PORTAL_FROM_EMAIL'))return
  const {data}=await db.auth.admin.getUserById(studentId),email=data?.user?.email;if(!email)return
  await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${Deno.env.get('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('PORTAL_FROM_EMAIL'),to:[email],subject:title,text:message})})
}
Deno.serve(async(request)=>{
  if(request.method!=='POST')return response({error:'Method not allowed'},405)
  const secret=Deno.env.get('SIGNATURE_WEBHOOK_SECRET'),provided=request.headers.get('x-signature')??''
  if(!secret||!provided)return response({error:'Signature webhook is not configured.'},503)
  const raw=await request.text()
  if(raw.length>30_000_000)return response({error:'Payload too large.'},413)
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const expected=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))).map(b=>b.toString(16).padStart(2,'0')).join('')
  if(!same(expected,provided.toLowerCase()))return response({error:'Invalid provider signature.'},401)
  const {request_id,envelope_id,event,signed_pdf_base64}=JSON.parse(raw)
  if(event!=='signed'||typeof signed_pdf_base64!=='string'||signed_pdf_base64.length>28_000_000)return response({error:'Invalid signing completion payload.'},400)
  const url=Deno.env.get('SUPABASE_URL')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,db=createClient(url,service)
  const {data:session,error:sessionError}=await db.from('agreement_signing_sessions').select('*').eq('id',request_id).eq('provider_envelope_id',envelope_id).single()
  if(sessionError||!session)return response({error:'Signing request not found.'},404)
  const {data:agreement,error:agreementError}=await db.from('student_agreements').select('*').eq('id',session.agreement_id).single()
  if(agreementError||!agreement)return response({error:'Signing agreement not found.'},404)
  if(agreement.workflow_version===2)return response({error:'This agreement uses the student-first portal signature workflow.'},409)
  if(session.status!=='envelope_open')return response({ok:true,duplicate:true})
  const step=session.signer_role==='student'?'student':'head'
  if((step==='head'&&agreement.status!=='awaiting_head_signature')||(step==='student'&&agreement.status!=='awaiting_student_signature'))return response({error:'Agreement is not awaiting this signer.'},409)
  const bytes=Uint8Array.from(atob(signed_pdf_base64),c=>c.charCodeAt(0)),hash=await digest(bytes)
  if(bytes.length<5||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return response({error:'The signing provider did not return a PDF document.'},400)
  const suffix=step==='head'?'head-signed':'completed',path=`${agreement.student_id}/${agreement.application_id}/${agreement.reference_number}-${suffix}.pdf`
  const {error:uploadError}=await db.storage.from('student-private-agreements').upload(path,bytes,{contentType:'application/pdf',upsert:false})
  if(uploadError)return response({error:'Unable to store the signed agreement.'},500)
  const now=new Date().toISOString()
  const update=step==='head'
    ? {status:'awaiting_student_signature',head_signed_at:now,private_pdf_path:path,signature_envelope_id:envelope_id}
    : {status:'completed',student_signed_at:now,completed_pdf_path:path,signature_envelope_id:envelope_id}
  const {error:updateError}=await db.from('student_agreements').update(update).eq('id',agreement.id)
  if(updateError){await db.storage.from('student-private-agreements').remove([path]);return response({error:'Unable to release the signed agreement.'},500)}
  await db.from('agreement_signing_sessions').update({status:'signed',signed_at:now}).eq('id',session.id)
  await db.from('agreement_signing_audit').insert({agreement_id:agreement.id,signer_id:session.signer_id,signer_role:step,action:step==='head'?'head_signed':'student_signed',document_sha256:hash})
  await db.from('application_activity').insert({application_id:agreement.application_id,actor_id:session.signer_id,event_type:step==='head'?'agreement_sent_to_student':'student_agreement_signed',details:{agreement_reference:agreement.reference_number,document_sha256:hash}})
  await notify(db,agreement.student_id,step==='head'?'Your Trinity agreement is ready':'Your signed agreement is complete',step==='head'?'The Trinity authorized signatory has signed your agreement. Sign in to review and complete your signature. Your payment schedule is now unlocked in Payments.':'Both signatures have been recorded. Your completed agreement is available in the student portal.')
  return response({ok:true,status:step==='head'?'awaiting_student_signature':'completed'})
})
