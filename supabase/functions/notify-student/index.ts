import { createClient } from 'npm:@supabase/supabase-js@2'

const cors={ 'Access-Control-Allow-Origin':Deno.env.get('PORTAL_ORIGIN')??'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS' }
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}})
const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
Deno.serve(async(request)=>{
  if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(request.method!=='POST')return json({error:'Method not allowed'},405)
  const auth=request.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}}),{data:{user},error:authError}=await userClient.auth.getUser()
  if(authError||!user)return json({error:'Authentication required'},401)
  const admin=createClient(url,service),{data:actor}=await admin.from('portal_profiles').select('role').eq('id',user.id).single()
  if(!['board','admin','head','delegate','signatory'].includes(actor?.role||''))return json({error:'Trinity staff access required'},403)
  const {student_id,title,message}=await request.json().catch(()=>({}))
  if(!student_id||!title||!message||String(title).length>180||String(message).length>5000)return json({error:'student_id, a short title, and message are required.'},400)
  const {error:noticeError}=await admin.from('student_notifications').insert({student_id,title,message})
  if(noticeError)return json({error:'Could not save the student notification.'},500)
  const [{data:config},{data:authRecord,error:userError}]=await Promise.all([
    admin.from('trinity_configuration').select('email_provider').eq('id',true).single(),
    admin.auth.admin.getUserById(student_id),
  ])
  const provider=Deno.env.get('EMAIL_PROVIDER')??'unconfigured',apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('PORTAL_FROM_EMAIL')
  if(provider!=='resend'||config?.email_provider!=='resend'||!apiKey||!from)return json({notification_saved:true,email_sent:false,reason:'Email provider is not configured.'})
  const email=authRecord?.user?.email
  if(userError||!email)return json({notification_saved:true,email_sent:false,reason:'Student email address is unavailable.'})
  const text=String(message),subject=String(title)
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject,text,html:`<main style="font-family:Arial,sans-serif;color:#19372d"><h2>${escapeHtml(subject)}</h2><p>${escapeHtml(text).replaceAll('\n','<br>')}</p><p>Sign in to your Trinity International Student Services Portal to view your application.</p></main>`})})
  if(!response.ok)return json({notification_saved:true,email_sent:false,reason:'The transactional email provider rejected the message.'})
  return json({notification_saved:true,email_sent:true})
})
