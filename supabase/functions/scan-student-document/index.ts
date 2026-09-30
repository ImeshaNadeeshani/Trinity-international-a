import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={ 'Access-Control-Allow-Origin':Deno.env.get('PORTAL_ORIGIN')??'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const base64=(bytes:Uint8Array)=>{let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));return btoa(binary)}
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return json({error:'Method not allowed'},405)
  const auth=request.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authError}=await client.auth.getUser()
  if(authError||!user)return json({error:'Authentication required'},401)
  const {document_id}=await request.json().catch(()=>({}));if(!document_id)return json({error:'document_id is required.'},400)
  const db=createClient(url,service),[{data:profile},{data:doc},{data:config}]=await Promise.all([
    db.from('portal_profiles').select('role').eq('id',user.id).single(),
    db.from('student_documents').select('*').eq('id',document_id).single(),
    db.from('trinity_configuration').select('document_scanner_provider').eq('id',true).single(),
  ])
  if(!doc||!profile)return json({error:'Document not found.'},404)
  if(profile.role!=='admin'&&profile.role!=='board'&&doc.student_id!==user.id)return json({error:'You cannot scan this document.'},403)
  if(doc.scan_status==='clean'||doc.scan_status==='infected')return json({scan_status:doc.scan_status})
  const endpoint=Deno.env.get('MALWARE_SCAN_GATEWAY_URL'),token=Deno.env.get('MALWARE_SCAN_GATEWAY_API_KEY')
  if(config?.document_scanner_provider==='unconfigured'||!endpoint||!token)return json({scan_status:'pending',reason:'Approved malware scanner is not configured.'})
  if(new URL(endpoint).protocol!=='https:')return json({scan_status:'pending',reason:'The malware scanner gateway must use HTTPS.'})
  const {data:file,error:fileError}=await db.storage.from('student-private-documents').download(doc.storage_path)
  if(fileError||!file)return json({scan_status:'pending',reason:'Document scan is unavailable.'})
  const bytes=new Uint8Array(await file.arrayBuffer())
  const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')
  let response:Response
  try{response=await fetch(new URL('/scan',endpoint),{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({document_id:doc.id,file_name:doc.file_name,mime_type:doc.mime_type,sha256:sha,base64:base64(bytes)}),signal:AbortSignal.timeout(30000)})}catch{return json({scan_status:'pending',reason:'Configured scanner is unavailable.'})}
  if(!response.ok)return json({scan_status:'pending',reason:'Configured scanner could not complete the scan.'})
  const result=await response.json().catch(()=>({})),scan_status=result.scan_status
  if(!['clean','infected'].includes(scan_status))return json({scan_status:'pending',reason:'Scanner returned an invalid result.'})
  const scanTime=new Date().toISOString(),docUpdate:Record<string,unknown>={scan_status,scan_completed_at:scanTime}
  if(scan_status==='infected'){docUpdate.status='rejected';docUpdate.reviewer_comment='Automated malware scan flagged this file. Please upload a new clean copy.'}
  const {error:updateError}=await db.from('student_documents').update(docUpdate).eq('id',doc.id)
  if(updateError)return json({error:'Could not record the scanner result.'},500)
  if(scan_status==='infected')await db.from('student_notifications').insert({student_id:doc.student_id,title:'Document could not be accepted',message:'The document scanner flagged an uploaded file. Please replace it with a clean PDF, JPG, or PNG.'})
  return json({scan_status})
})
