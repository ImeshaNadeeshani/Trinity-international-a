import { Check, Clock3, ShieldCheck, ClipboardList, CreditCard, Bell } from 'lucide-react'
export default function WorkflowProgress({ profile, application, documents, agreements, approvalLetters=[], payments=[], onNavigate }) {
  const docs=documents.filter(document=>document.application_id===application?.id&&document.status!=='replaced')
  const agreement=agreements.find(row=>row.application_id===application?.id&&row.status!=='voided')
  const verified=!!application?.id && (approvalLetters.some(letter=>letter.application_id===application.id) || ['documents_verified','application_approved'].includes(application.status))
  const reviewing=application?.status==='under_board_review'||verified
  const paid=payments.some(payment=>payment.application_id===application?.id&&payment.status==='successful')
  const steps=[['Profile completed',!!(profile.full_name&&profile.phone&&profile.nic_number&&profile.passport_number&&profile.date_of_birth&&profile.residential_address)],['Documents uploaded',docs.length>0],['Trinity document review',reviewing],['Documents verified',verified],['Agreement generated',!!agreement],['Student signature',!!agreement?.student_signed_at],['Management review',agreement?.status==='completed'],['Agreement completed',agreement?.status==='completed'],['Payments',paid]]
  const current=steps.findIndex(([,complete])=>!complete)
  const milestones=[['Profile completed',steps[0][1]],['Documents uploaded',docs.length>0],['Trinity review',verified],['Agreement signed',!!agreement?.student_signed_at],['Completed',agreement?.status==='completed']]
  const activeMilestone=milestones.findIndex(([,complete])=>!complete)
  let message='Complete your profile and study application, then upload your supporting documents.'
  if(docs.length&&!verified)message='Your uploaded documents are awaiting Trinity verification. We will update your application after review.'
  if(verified&&!agreement)message='Your documents have been verified. Trinity will prepare your agreement after the application and agreement requirements are approved.'
  if(agreement?.status==='awaiting_student_signature')message='Your agreement is ready. Open Agreements to read the PDF and submit your signature.'
  if(agreement?.status==='awaiting_head_signature')message='Your signature has been submitted. Trinity management will review and countersign your agreement.'
  if(agreement?.status==='completed')message='Your agreement is complete. Download your copy from Agreements and continue your study application.'
  return <section className="portal-card portal-process-journey"><div className="portal-card-head"><div><h2>My Application</h2><p>{application?`${application.destination} · ${application.course_interest}`:'Track your study abroad journey.'}</p></div><ShieldCheck size={24}/></div>
    <ol className="student-application-milestones" aria-label="Application progress">{milestones.map(([label,complete],index)=><li key={label} className={complete?'done':index===activeMilestone?'current':''} aria-current={index===activeMilestone?'step':undefined}><span>{complete?<Check size={19}/>:index===activeMilestone?<Clock3 size={19}/>:null}</span><strong>{label}</strong><small>{complete?'Complete':index===activeMilestone?'In progress':'Pending'}</small></li>)}</ol>
    <div className={`portal-process-message ${agreement?.status==='completed'?'complete':''}`} role="status">{agreement?.status==='completed'?<ShieldCheck size={24}/>:<Clock3 size={24}/>}<p>{message}</p></div>
    <details className="student-process-details"><summary>View all application steps</summary><ol className="portal-workflow">{steps.map(([label,complete],index)=><li className={complete?'done':index===current?'current':''} key={label}><span>{complete?<Check size={16}/>:index===current?<Clock3 size={16}/>:index+1}</span><strong>{label}</strong><small>{complete?'Complete':index===current?'Next step':'Pending'}</small></li>)}</ol></details>
    {onNavigate && agreement?.status==='completed' && <div className="student-continue-cards">{[['application','Application details','View your study application',ClipboardList],['payments','Payments','View fees and receipts',CreditCard],['notifications','Notifications','Read your account updates',Bell]].map(([key,title,description,Icon])=><button key={key} onClick={()=>onNavigate(key)}><Icon size={25}/><strong>{title}</strong><small>{description}</small></button>)}</div>}
  </section>
}
