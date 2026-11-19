import { useRef, useState } from 'react'
import { FileText, Send, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function StaffApprovalLetters({applications,people,documents,letters,onChanged,onOpen,initialApplication}){
 const [applicationId,setApplicationId]=useState(initialApplication||''),[subject,setSubject]=useState('Your documents are approved - approval letter available'),[message,setMessage]=useState('Your submitted documents have been reviewed and approved by Trinity International. Please open your approval letter using the link below.'),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const pending=useRef(null),requestId=useRef(crypto.randomUUID())
 const app=applications.find(a=>a.id===applicationId),person=people.find(p=>p.id===app?.student_id),letter=letters.find(l=>l.application_id===applicationId)
 const docs=documents.filter(d=>d.application_id===applicationId&&d.status!=='replaced'),ready=docs.length>0&&docs.every(d=>d.status==='verified'&&d.scan_status==='clean')
 async function send(event){
  event.preventDefault();setBusy(true);setError('');setNotice('')
  try{
   if(!app||!ready)throw Error('Choose an application with approved documents.')
   if(!letter&&!pending.current){
    if(!file||file.type!=='application/pdf'||file.size>5*1024*1024)throw Error('Attach a PDF approval letter no larger than 5 MB.')
    const bytes=new Uint8Array(await file.slice(0,5).arrayBuffer());if(new TextDecoder().decode(bytes)!=='%PDF-')throw Error('The attachment must contain a valid PDF.')
    const path=`${app.student_id}/${app.id}/${crypto.randomUUID()}-approval.pdf`
    const {error}=await supabase.storage.from('student-private-letters').upload(path,file,{contentType:'application/pdf',upsert:false});if(error)throw error;pending.current=path
   }
   const {error}=await supabase.rpc('portal_send_approval_letter',{app_id:app.id,pdf_path:letter?.storage_path||pending.current,subject,body:message,request_id:requestId.current});if(error)throw error
   pending.current=null;requestId.current=crypto.randomUUID();setFile(null);await onChanged();setNotice('Approval letter and message sent to the student portal. No email was sent.')
  }catch(e){setError(e.message||'Unable to send the approval letter.')}finally{setBusy(false)}
 }
 return <section className="portal-card portal-form-card staff-letter-messages"><h2>Send Approval Letter &amp; Message</h2><p>Attach the management-approved PDF. The student receives a private letter link in Notifications.</p><form onSubmit={send}><label>Student application<select required value={applicationId} disabled={busy} onChange={e=>{setApplicationId(e.target.value);setFile(null);pending.current=null;requestId.current=crypto.randomUUID();setNotice('');setError('')}}><option value="">Choose a student application</option>{applications.map(a=><option key={a.id} value={a.id}>{people.find(p=>p.id===a.student_id)?.full_name||'Student'} - {a.destination} - {a.id.slice(0,8)}</option>)}</select></label>{app&&<p className={ready?'portal-notice':'portal-pending'}>{person?.full_name||'Student'}: {docs.filter(d=>d.status==='verified').length} of {docs.length} documents approved. {!ready&&'Complete document review before sending.'}</p>}{letter?<div className="portal-notice"><FileText size={18}/> Existing letter: {letter.reference_number}<button type="button" className="portal-outline compact" onClick={()=>onOpen(letter.storage_path,'student-private-letters')}>View PDF</button></div>:<label><Upload size={18}/> Approval letter PDF<input type="file" accept="application/pdf" required disabled={busy} onChange={e=>{setFile(e.target.files[0]||null);pending.current=null}}/><small>PDF only, maximum 5 MB. Use the final approved letter.</small></label>}<label>Subject<input required maxLength={180} value={subject} disabled={busy} onChange={e=>setSubject(e.target.value)}/></label><label>Message<textarea required rows={6} maxLength={5000} value={message} disabled={busy} onChange={e=>setMessage(e.target.value)}/></label>{error&&<p className="portal-error" role="alert">{error}</p>}{notice&&<p className="portal-notice" role="status">{notice}</p>}<button className="portal-primary" disabled={busy||!ready||!!notice}><Send size={17}/>{busy?'Sending...':'Send approval letter & message'}</button></form></section>
}
