import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../styles/student-design-overview.css'
const screens=[['login','Student Login','Student'],['documents','Upload Documents','Student'],['review','Document Review','Trinity Management Panel'],['notification','Approval Notification','Sent to Student'],['agreement','Open Agreement','Student'],['sign','Add Digital Signature','Student'],['submitted','Signed Agreement Submission','Student'],['management','Final Approval','Trinity Management Panel'],['approved','Agreement Approved','Student Notification']]
function ScreenCard({screen,index}){
  const frame=useRef(null)
  useEffect(()=>{const element=frame.current;const observer=new ResizeObserver(entries=>element.style.setProperty('--screen-scale',String(entries[0].contentRect.width/1120)));observer.observe(element);return()=>observer.disconnect()},[])
  const [key,title,role]=screen
  return <article className="student-design-card"><h2><span>{index+1}</span>{title}<small>({role})</small></h2><Link ref={frame} className="student-design-window" to={'/student-portal/design/'+key} aria-label={'Open '+title+' full page'}><iframe src={'/student-portal/design/'+key+'?board=1'} title={title+' design preview'} tabIndex={-1} loading={index>2?'lazy':'eager'}/><span className="student-design-open">Open full page →</span></Link></article>
}
export default function StudentDesignOverview(){
  return <main className="student-design-overview"><header><div><h1>Student Portal</h1><p>Login, document review and agreement signing — nine connected screens.</p></div><Link to="/student-portal">Open real student portal →</Link></header><div className="student-design-grid">{screens.map((screen,index)=><ScreenCard key={screen[0]} screen={screen} index={index}/>)}</div><p className="student-design-overview-note">Design previews with sample data. Click any screen to open it. No real records, approvals or signatures are changed here.</p></main>
}
