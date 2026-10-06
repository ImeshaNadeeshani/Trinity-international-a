import { Check, LockKeyhole } from 'lucide-react'
export default function WorkflowProgress({ profile, application, documents, agreements, payments=[] }) {
  const docs=documents.filter(d=>d.application_id===application?.id&&d.status!=='replaced')
  const agreement=agreements.find(a=>a.application_id===application?.id&&a.status!=='voided')
  const paid=payments.some(p=>p.application_id===application?.id&&p.status==='successful')
  const steps=[['Profile completed',!!(profile.full_name&&profile.nic_number&&profile.passport_number&&profile.date_of_birth&&profile.residential_address)],['Documents uploaded',docs.length>0],['Documents under review',['under_board_review','documents_verified','application_approved'].includes(application?.status)],['Documents approved',['documents_verified','application_approved'].includes(application?.status)],['Agreement generated',!!agreement],['Student signature submitted',!!agreement?.student_signed_at],['Trinity approval',agreement?.status==='completed'],['Payment',paid],['Application processing',paid]]
  const current=steps.findIndex(([,done])=>!done)
  return <div className="portal-card"><div className="portal-card-head"><div><h2>Your application journey</h2><p>{application?`${application.destination} · ${application.course_interest}`:'Complete your profile and start a study application.'}</p></div><LockKeyhole/></div><ol className="portal-workflow">{steps.map(([label,done],i)=><li className={done?'done':i===current?'current':''} key={label}><span>{done?<Check size={15}/>:i+1}</span><strong>{label}</strong><small>{done?'Complete':i===current?'Next step':'Upcoming'}</small></li>)}</ol></div>
}
