import { useRef, useState } from 'react'
import { Send, Mail } from 'lucide-react'
import { invokePortal } from '../../lib/portalFunctions'

export default function StaffApprovalLetters({applications,people,documents,onChanged,initialApplication}){
 const [applicationId,setApplicationId]=useState(initialApplication||'')
 const [subject,setSubject]=useState('Your documents have been approved - agreement ready')
 const [message,setMessage]=useState('Dear Student,\n\nTrinity International has reviewed and approved your submitted documents. Please open Agreements in your student portal to generate and review your agreement, add your digital signature and submit it to management.\n\nThank you,\nTrinity International')
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[sent,setSent]=useState(false)
 const requestId=useRef(crypto.randomUUID())
 const app=applications.find(a=>a.id===applicationId),person=people.find(p=>p.id===app?.student_id)
 const docs=documents.filter(d=>d.application_id===applicationId&&d.status!=='replaced'),ready=docs.length>0&&docs.every(d=>d.status==='verified'&&d.scan_status==='clean')
 async function send(event){
  event.preventDefault();setBusy(true);setError('');setNotice('')
  try{
   const result=await invokePortal('send-approval-message',{application_id:applicationId,subject,message,request_id:requestId.current})
   setSent(true)
   setNotice(result.email_status==='sent'?'Approval message saved in the student portal. Email accepted for sending to '+result.recipient_email+'.':result.email_status==='not_configured'?'Approval message sent to the student portal. Personal email has NOT been sent: Trinity email delivery must be configured.': 'Approval message sent to the student portal. Personal email is queued; delivery has not been confirmed. Retry the email below.')
   await onChanged()
  }catch(e){setError(e.message||'Unable to send the approval message.')}finally{setBusy(false)}
 }
 return <section className="portal-card portal-form-card staff-letter-messages"><h2><Mail size={22}/> Send approval message</h2><p>Send an email-style approval message with a secure agreement link. No PDF letter is required. Personal email uses the email address registered to the student account.</p><form onSubmit={send}><label>Student application<select required value={applicationId} disabled={busy} onChange={e=>{setApplicationId(e.target.value);requestId.current=crypto.randomUUID();setNotice('');setError('');setSent(false)}}><option value="">Choose a student application</option>{applications.map(a=><option key={a.id} value={a.id}>{people.find(p=>p.id===a.student_id)?.full_name||'Student'} - {a.destination} - {a.id.slice(0,8)}</option>)}</select></label>{app&&<p className={ready?'portal-notice':'portal-pending'}>{person?.full_name||'Student'}: {docs.filter(d=>d.status==='verified').length} of {docs.length} documents approved. {!ready&&'Complete document review before sending.'}</p>}<label>Subject<input required maxLength={180} value={subject} disabled={busy||sent} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea required rows={9} maxLength={5000} value={message} disabled={busy||sent} onChange={e=>setMessage(e.target.value)}/></label><p className="portal-muted">The student's agreement link is added automatically. Email delivery requires a configured sender and email provider.</p>{error&&<p className="portal-error" role="alert">{error}</p>}{notice&&<p className="portal-notice" role="status">{notice}</p>}<button className="portal-primary" disabled={busy||!ready}><Send size={17}/>{busy?'Sending...':sent?'Retry email delivery':'Send approval message & email'}</button></form></section>
}
