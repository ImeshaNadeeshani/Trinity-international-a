import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={ 'Access-Control-Allow-Origin':Deno.env.get('PORTAL_ORIGIN')??'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const base64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary)}
const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return json({error:'Method not allowed'},405)
  const auth=request.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authError}=await client.auth.getUser()
  if(authError||!user)return json({error:'Authentication required'},401)
  const {agreement_id,explicit_approval}=await request.json().catch(()=>({}))
  if(!agreement_id||explicit_approval!==true)return json({error:'Review the agreement and explicitly confirm before requesting a signature.'},400)
  const db=createClient(url,service),[{data:profile},{data:agreement},{data:config}]=await Promise.all([
    db.from('portal_profiles').select('role').eq('id',user.id).single(),
    db.from('student_agreements').select('*').eq('id',agreement_id).single(),
    db.from('trinity_configuration').select('signature_provider').eq('id',true).single(),
  ])
  if(!agreement||!profile)return json({error:'Agreement not found.'},404)
  if(agreement.workflow_version===2)return json({error:'Use the portal signature page for this agreement.'},409)
  const {data:template}=agreement.template_id?await db.from('agreement_templates').select('approval_status,active').eq('id',agreement.template_id).single():{data:null}
  if(!template||template.approval_status!=='approved'||!template.active)return json({error:'This agreement template is no longer approved for signature.'},409)
  const isHead=['head','delegate','signatory'].includes(profile.role)
  const isStudent=profile.role==='student'&&agreement.student_id===user.id
  const step=isHead&&agreement.status==='awaiting_head_signature'?'head':isStudent&&agreement.status==='awaiting_student_signature'?'student':null
  if(!step)return json({error:'This account cannot sign at the current agreement stage.'},403)
  const provider=config?.signature_provider
  const gateway=Deno.env.get('SIGNATURE_GATEWAY_URL'),gatewayKey=Deno.env.get('SIGNATURE_GATEWAY_API_KEY')
  if(!provider||provider==='unconfigured'||!gateway||!gatewayKey)return json({error:'Signing is safely disabled until management selects an approved signing provider and its server credentials are configured.'},409)
  if(new URL(gateway).protocol!=='https:')return json({error:'The signing gateway must use HTTPS.'},503)
  const storedPath=step==='head'?agreement.private_pdf_path:agreement.private_pdf_path
  if(!storedPath)return json({error:'The agreement PDF is not available.'},409)
  const {data:file,error:fileError}=await db.storage.from('student-private-agreements').download(storedPath)
  if(fileError||!file)return json({error:'Could not securely load the agreement for signing.'},500)
  const bytes=new Uint8Array(await file.arrayBuffer()),digest=await sha256(bytes),internalRequestId=crypto.randomUUID()
  const {data:signerRecord}=await db.auth.admin.getUserById(user.id),signerEmail=signerRecord?.user?.email
  if(!signerEmail)return json({error:'The signing account has no verified email address.'},409)
  const portalOrigin=Deno.env.get('PORTAL_ORIGIN')
  const payload={request_id:internalRequestId,provider,agreement_reference:agreement.reference_number,agreement_id:agreement.id,signer:{user_id:user.id,email:signerEmail,role:step},document:{filename:`${agreement.reference_number}.pdf`,content_type:'application/pdf',sha256:digest,base64:base64(bytes)},explicit_approval:true,return_url:`${portalOrigin}/${step==='student'?'student-portal':'staff-portal'}`,callback_url:`${url}/functions/v1/complete-agreement-signing`}
  let response:Response
  try{response=await fetch(new URL('/envelopes',gateway),{method:'POST',headers:{Authorization:`Bearer ${gatewayKey}`,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)})}
  catch{return json({error:'The configured signing gateway is unavailable.'},502)}
  if(!response.ok)return json({error:'The signing provider could not create a signing session.'},502)
  const envelope=await response.json().catch(()=>({}))
  let link:URL
  try{link=new URL(envelope.signing_url)}catch{return json({error:'Signing provider returned an invalid signing session.'},502)}
  if(typeof envelope.envelope_id!=='string'||link.protocol!=='https:'||link.origin!==new URL(gateway).origin)return json({error:'Signing provider returned an invalid signing session.'},502)
  const {error:sessionError}=await db.from('agreement_signing_sessions').insert({id:internalRequestId,agreement_id,signer_id:user.id,signer_role:step,provider,provider_envelope_id:envelope.envelope_id,status:'envelope_open',document_sha256:digest})
  if(sessionError)return json({error:'Could not record the signing session.'},500)
  await db.from('agreement_signing_audit').insert({agreement_id,signer_id:user.id,signer_role:step,action:'signing_session_created',document_sha256:digest})
  return json({signing_url:link.toString()})
})
