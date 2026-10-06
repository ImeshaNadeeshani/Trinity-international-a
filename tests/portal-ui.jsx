// Development-only component fixture. Not imported by the production application.
import React from 'react'
import { createRoot } from 'react-dom/client'
import '../src/styles/portal.css'
import WorkflowProgress from '../src/components/portal/WorkflowProgress'
import ProfileForm from '../src/components/portal/ProfileForm'
import Payments from '../src/components/portal/Payments'
import AgreementWorkspace from '../src/components/portal/AgreementWorkspace'
const profile={id:'qa-student',full_name:'Sample Student',student_number:'QA-ONLY',nic_number:'SYNTHETIC',passport_number:'SYNTHETIC',date_of_birth:'2000-01-01',residential_address:'Synthetic test address',phone:'+94 700000000',role:'student'}
createRoot(document.getElementById('root')).render(<main className="portal-page" style={{padding:'24px',maxWidth:1200,margin:'auto'}}><p>Component QA · Synthetic data · Do not submit forms</p><WorkflowProgress profile={profile} application={{id:'qa',destination:'Ireland',course_interest:'Computing',status:'under_board_review'}} documents={[{application_id:'qa',status:'pending'}]} agreements={[]}/><Payments schedules={[]} agreements={[]} payments={[]} receipts={[]} profile={profile}/><AgreementWorkspace agreements={[]} profile={profile} onChanged={()=>{}}/><ProfileForm profile={profile} email="student@example.test" onSaved={()=>{}}/></main>)
