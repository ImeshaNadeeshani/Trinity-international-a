import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronRight, ClipboardList, CreditCard, FileCheck2, FileText, FolderOpen, LayoutDashboard, LockKeyhole, MessageCircle, ShieldCheck, UserRound, CircleAlert, Clock3, Download, Mail, Upload } from 'lucide-react'
import '../styles/portal.css'

const pages = [
  ['overview', 'Dashboard', LayoutDashboard],
  ['profile', 'My Profile', UserRound],
  ['application', 'My Application', ClipboardList],
  ['documents', 'Upload Documents', FolderOpen],
  ['status', 'Application Status', ShieldCheck],
  ['letters', 'Approval Letters', FileCheck2],
  ['agreements', 'Agreements', FileText],
  ['payments', 'Payments', CreditCard],
  ['notifications', 'Notifications', Bell],
  ['support', 'Support', MessageCircle],
]

const milestones = ['Application submitted', 'Documents uploaded', 'Under board review', 'Documents verified', 'Application approved', 'Agreement and signature']
const documentTypes = ['Passport copy', 'NIC / national ID', 'O/L certificates', 'A/L certificates', 'Degree / diploma certificates', 'English qualification', 'Financial documents', 'Updated CV']

function StudentPortalPreview() {
  const [view, setView] = useState('overview')
  const selectedPage = pages.find(([key]) => key === view)
  const SelectedIcon = selectedPage?.[2] || FileText

  return <main className="portal-page portal-preview-page">
    <header className="portal-topbar"><Link to="/" className="portal-brand"><img src="/trinity-logo.jpeg" alt="Trinity International"/><span>Student Services Portal</span></Link><div className="portal-preview-header"><span><LockKeyhole size={14}/> Preview only - no student records</span><Link to="/student-portal"><ArrowLeft size={15}/> Student Login</Link></div></header>
    <div className="portal-layout">
      <aside className="portal-sidebar"><div className="portal-user"><div className="portal-avatar"><UserRound/></div><strong>Portal Preview</strong><span>Sign in to view your account</span></div><nav>{pages.map(([key,label,Icon])=><button className={view===key?'active':''} key={key} onClick={()=>setView(key)}><Icon size={17}/>{label}<ChevronRight size={15}/></button>)}</nav><Link className="portal-signout portal-preview-login" to="/student-portal"><LockKeyhole size={16}/> Sign in to your account</Link></aside>
      <section className="portal-content">
        <div className="portal-preview-banner"><ShieldCheck size={17}/><span>This is a read-only design preview. Sign in to access personal application information and actions.</span></div>
        <div className="portal-page-heading"><div><span className="portal-eyebrow">TRINITY INTERNATIONAL - STUDENT PORTAL PREVIEW</span><h1>{view==='overview'?'Student Dashboard':selectedPage?.[1]}</h1><p>Preview the portal layout. Personal student information is hidden until sign-in.</p></div><span className="portal-secure"><LockKeyhole size={15}/> Read-only preview</span></div>

        {view==='overview' ? <>
          <div className="portal-stat-grid"><article><span>Student ID</span><strong>-</strong><small>Shown after sign-in</small></article><article><span>Applications</span><strong>-</strong><small>Shown after sign-in</small></article><article><span>Documents</span><strong>-</strong><small>Shown after sign-in</small></article><article><span>Agreement</span><strong>-</strong><small>Shown after sign-in</small></article></div>
          <div className="portal-preview-dashboard-grid"><div className="portal-card portal-progress"><div className="portal-card-head"><div><h2>Application progress</h2><p>Your milestones appear here after sign-in.</p></div><span className="portal-tag">No account data</span></div><div className="portal-preview-milestones">{milestones.map((step,index)=><div className="portal-preview-milestone" key={step}><span>{index+1}</span><b>{step}</b></div>)}</div></div><div className="portal-card portal-preview-next"><h2>Your next steps</h2><p>Sign in to see tasks for your application.</p><div className="portal-preview-locked"><LockKeyhole size={18}/><span>Private student checklist</span></div><Link className="portal-primary portal-link-button" to="/student-portal">Student Login <ChevronRight size={15}/></Link></div></div>
          <div className="portal-card portal-preview-journey"><div><span className="portal-eyebrow">YOUR STUDY JOURNEY</span><h2>One secure place for your application</h2><p>Upload documents, follow verification, review official letters and manage agreement signing from your account.</p></div><div className="portal-preview-journey-icon"><FileCheck2 size={27}/></div></div>
        </> : <PreviewSection view={view} title={selectedPage?.[1]} Icon={SelectedIcon} />}
        <footer className="portal-footnote">No live student data is displayed in preview mode.</footer>
      </section>
    </div>
  </main>
}

function PreviewSection({view,title,Icon}) {
  const signIn = <Link className="portal-primary portal-link-button" to="/student-portal">Sign in to continue <ChevronRight size={15}/></Link>
  if(view==='profile') return <><div className="portal-card"><div className="portal-card-head"><div><h2>Personal details</h2><p>Your profile details are private and appear here after sign-in.</p></div><span className="portal-tag">Private</span></div><div className="portal-preview-form-grid">{[['First and last name'],['Email address'],['Phone number'],['Student ID'],['Residential address'],['NIC or passport number']].map(([label])=><label key={label}>{label}<input disabled placeholder="Available after sign-in"/></label>)}</div>{signIn}</div><div className="portal-preview-note"><LockKeyhole size={17}/> Sign in to view or update your personal information.</div></>
  if(view==='application') return <><div className="portal-card"><div className="portal-card-head"><div><h2>Study application</h2><p>Review your study destination and course preferences.</p></div><span className="portal-tag">No application data</span></div><div className="portal-preview-form-grid">{[['Preferred destination'],['Course or subject'],['Highest education'],['Intake'],['Institution preferences'],['Special requirements']].map(([label])=><label key={label}>{label}<input disabled placeholder="Available after sign-in"/></label>)}</div>{signIn}</div><div className="portal-card portal-preview-info"><CircleAlert size={18}/><span>Trinity will review application details after they are submitted. No admission or visa decision is represented in this preview.</span></div></>
  if(view==='documents') return <><div className="portal-card"><div className="portal-card-head"><div><h2>Documents checklist</h2><p>Supported document types are listed below. Your uploaded files remain private.</p></div><span className="portal-tag">No files shown</span></div><div className="portal-preview-upload"><Upload size={20}/><div><strong>Upload documents securely</strong><small>Sign in to select an application and submit a document.</small></div><button className="portal-outline" disabled>Sign in required</button></div>{documentTypes.map(name=><article className="portal-document" key={name}><span className="portal-doc-icon"><FileText size={18}/></span><span className="portal-doc-info"><strong>{name}</strong><small>Document status appears here after sign-in.</small></span><span className="portal-tag">Not available</span></article>)}{signIn}</div></>
  if(view==='status') return <div className="portal-card portal-progress"><div className="portal-card-head"><div><h2>Application status timeline</h2><p>Progress updates are connected to your student account.</p></div><span className="portal-tag">No status data</span></div><div className="portal-preview-status-list">{milestones.map((item,index)=><div className="portal-preview-status-step" key={item}><span>{index+1}</span><div><strong>{item}</strong><small>Status is visible after sign-in.</small></div><Clock3 size={16}/></div>)}</div>{signIn}</div>
  if(view==='letters') return <div className="portal-card portal-preview-empty"><div className="portal-preview-empty-icon"><FileCheck2 size={25}/></div><span className="portal-eyebrow">OFFICIAL DOCUMENTS</span><h2>Approval letters</h2><p>Internal Trinity approval letters will be listed here if they are released for your application.</p><span className="portal-tag">No letters shown in preview</span>{signIn}</div>
  if(view==='agreements') return <><div className="portal-card"><div className="portal-card-head"><div><h2>Agreement management</h2><p>Agreements are available only after required internal and legal approvals.</p></div><span className="portal-tag">No agreement data</span></div><div className="portal-preview-agreement"><FileText size={24}/><div><strong>Student consultancy service agreement</strong><small>Sign in to download your agreement once it has been released.</small></div><Link className="portal-outline portal-link-button" to="/student-portal"><Download size={15}/> Sign in to download</Link></div><div className="portal-preview-info"><ShieldCheck size={18}/><span>Unapproved templates remain drafts and cannot be signed.</span></div>{signIn}</div></>
  if(view==='payments') return <div className="portal-card"><div className="portal-card-head"><div><h2>Payment schedule</h2><p>Your agreed fees and deadlines will appear here after sign-in.</p></div><span className="portal-tag">No schedule data</span></div><div className="portal-preview-payment-grid">{[['Total consultancy fee'],['Initial payment'],['Remaining balance']].map(([label])=><article key={label}><span>{label}</span><strong>-</strong><small>Set by Trinity for each student</small></article>)}</div><div className="portal-preview-installments"><strong>Instalments and due dates</strong><p>No payment figures or deadlines are shown in this preview.</p></div>{signIn}</div>
  if(view==='notifications') return <div className="portal-card portal-preview-empty"><div className="portal-preview-empty-icon"><Bell size={25}/></div><span className="portal-eyebrow">ACCOUNT UPDATES</span><h2>Notifications</h2><p>Document reviews, application updates, and released agreements will appear here after sign-in.</p><span className="portal-tag">No notifications shown in preview</span>{signIn}</div>
  if(view==='support') return <div className="portal-card portal-preview-empty"><div className="portal-preview-empty-icon"><Mail size={25}/></div><span className="portal-eyebrow">TRINITY STUDENT SUPPORT</span><h2>How can we help?</h2><p>For help with registration, portal access or your study application, contact Trinity International.</p><Link className="portal-outline portal-link-button" to="/contact">Open contact page <ChevronRight size={15}/></Link>{signIn}</div>
  return <div className="portal-card portal-preview-empty"><div className="portal-preview-empty-icon"><Icon size={25}/></div><span className="portal-eyebrow">PORTAL PREVIEW</span><h2>{title}</h2><p>Sign in to access this part of the student portal.</p>{signIn}</div>
}

export default StudentPortalPreview
