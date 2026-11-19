import { ArrowRight, ClipboardCheck, FileClock, CircleCheck, PenLine } from 'lucide-react'

export default function ManagementDashboard({ documents, agreements, applications, onNavigate, canSign, canGenerate }) {
  const pending = documents.filter(d => d.status === 'pending').length
  const signatures = agreements.filter(a => a.status === 'awaiting_student_signature').length
  const final = agreements.filter(a => a.status === 'awaiting_head_signature').length
  const now = new Date()
  const completed = agreements.filter(a => { const date = new Date(a.head_signed_at); return a.status === 'completed' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).length
  return <section className="management-dashboard">
    <div className="management-stat-grid">{[[FileClock,pending,'Pending Documents','amber','documents'],[PenLine,signatures,'Pending Student Signatures','blue','agreements'],[CircleCheck,completed,'Approved This Month','green','agreements']].map(([Icon,value,label,color,target]) => <button key={label} className={`management-stat ${color}`} onClick={() => onNavigate(target)}><Icon size={24}/><strong>{value}</strong><span>{label}</span></button>)}</div>
    <section className="portal-card management-workflow"><h2>Application Workflow</h2><div>{[[ClipboardCheck,'Documents Review',`${pending} pending`,'documents'],[PenLine,'Agreement Signing',`${signatures} with students`,'agreements'],[CircleCheck,'Final Approval',`${final} pending`,canSign?'signing':'agreements']].map(([Icon,label,count,target],index)=><div className="management-workflow-step" key={label}><button onClick={()=>onNavigate(target)}><Icon size={22}/><strong>{label}</strong><span>{count}</span></button>{index<2&&<ArrowRight size={20}/>}</div>)}</div></section>
    <div className="management-dashboard-note"><div><strong>{applications.length} student applications</strong><p>Open a student record to review their profile and documents.</p></div><button className="portal-outline" onClick={()=>onNavigate('students')}>View students <ArrowRight size={16}/></button>{canGenerate&&<button className="portal-primary" onClick={()=>onNavigate('generation')}>Prepare agreements</button>}</div>
  </section>
}
