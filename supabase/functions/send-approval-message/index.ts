import { authenticated, cors, json } from '../_shared/portal.ts'
Deno.serve(async request => {
 if(request.method==='OPTIONS')return new Response('ok',{headers:cors})
 if(request.method!=='POST')return json({error:'Method not allowed'},405)
 try{
  const {client,db}=await authenticated(request,'send-approval-message',30)
  const input=await request.json()
  const {data:notificationId,error}=await client.rpc('portal_send_approval_message',{app_id:input.application_id,subject:input.subject,body:input.message,request_id:input.request_id})
  if(error)throw Error(error.message)
  const {data:notice,error:noticeError}=await db.from('student_notifications').select('*').eq('id',notificationId).single()
  if(noticeError||!notice)return json({notification_id:notificationId,email_status:'pending'})
  const {data:job}=await db.from('portal_email_outbox').select('*').eq('notification_id',notificationId).single()
  const {data:account}=await db.auth.admin.getUserById(notice.student_id)
  const email=account?.user?.email
  if(!job||!email)return json({notification_id:notificationId,email_status:'pending'})
  if(job.status==='sent')return json({notification_id:notificationId,email_status:'sent',recipient_email:email})
  const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('PORTAL_FROM_EMAIL'),origin=Deno.env.get('PORTAL_ORIGIN')
  if(!key||!from||!origin)return json({notification_id:notificationId,email_status:'not_configured'})
  let parsed:URL
  try{parsed=new URL(origin);if(parsed.protocol!=='https:'&&!(parsed.protocol==='http:'&&['localhost','127.0.0.1'].includes(parsed.hostname)))throw Error()}catch{return json({notification_id:notificationId,email_status:'not_configured'})}
  const link=parsed.origin+'/student-portal/agreements?application='+notice.approved_application_id
  const text=notice.message+'\n\nOpen your agreement and sign in securely:\n'+link+'\n\nTrinity International\nAccount authentication is required to access your private agreement.'
  let sent=false
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'portal-'+job.id},body:JSON.stringify({from,to:[email],subject:notice.title,text}),signal:AbortSignal.timeout(15000)})
   sent=response.ok
  }catch{sent=false}
  const {error:saveError}=await db.from('portal_email_outbox').update({status:sent?'sent':'pending',attempts:job.attempts+1,last_attempt_at:new Date().toISOString()}).eq('id',job.id)
  return json({notification_id:notificationId,email_status:sent&&!saveError?'sent':'pending',...(sent?{recipient_email:email}:{})})
 }catch(e){return json({error:e instanceof Error?e.message:'Unable to send approval message'},400)}
})
