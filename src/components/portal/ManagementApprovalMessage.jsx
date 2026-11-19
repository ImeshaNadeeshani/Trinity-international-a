import { useState } from 'react'
import { Check, Mail, Send } from 'lucide-react'
import { invokePortal } from '../../lib/portalFunctions'

export default function ManagementApprovalMessage({ person, agreement }) {
  const link = `${window.location.origin}/student-portal/agreements`
  const [subject,setSubject] = useState('Your Documents are Approved - Please Sign the Agreement')
  const [message,setMessage] = useState(`Dear ${person?.full_name || 'Student'},\n\nYour submitted documents have been reviewed and approved by Trinity International.\n\nYour Student Service Agreement (${agreement.reference_number || 'agreement'}) is ready. Please open the link below, sign in, review the complete agreement and add your signature.\n\n${link}\n\nThank you,\nTrinity International`)
  const [busy,setBusy] = useState(false), [result,setResult] = useState(''), [error,setError] = useState('')
  async function send(event) {
    event.preventDefault();setBusy(true);setError('');setResult('')
    try {
      const data=await invokePortal('notify-student',{student_id:agreement.student_id,title:subject,message})
      setResult(data.email_sent?'Notification saved and email sent.':'Notification saved in the student portal. Email was not sent: '+(data.reason||'check email provider setup.'))
    } catch(e){setError(e.message)}finally{setBusy(false)}
  }
  return <form className="management-approval-message" onSubmit={send}>
    <header><Check size={30}/><h3>Documents Approved</h3><p>The agreement is ready for the student to review and sign.</p></header>
    <h4><Mail size={20}/> Send Approval Message to Student</h4>
    <label>To<input readOnly value={person?.full_name||'Student'}/></label>
    <p>Delivered to this student's portal and registered account email when email delivery is configured.</p>
    <label>Subject<input required maxLength={180} value={subject} onChange={e=>{setSubject(e.target.value);setResult('')}}/></label>
    <label>Message<textarea required rows={12} maxLength={5000} value={message} onChange={e=>{setMessage(e.target.value);setResult('')}}/></label>
    {error&&<p className="portal-error" role="alert">{error}</p>}{result&&<p className="portal-notice" role="status">{result}</p>}
    <button className="portal-primary" disabled={busy||!!result}><Send size={16}/>{busy?'Sending...':'Send to Student'}</button>
  </form>
}
