import { useEffect, useState } from 'react'
import { UserRound, CalendarDays, ContactRound, BookUser, Mail, Phone, MapPin, Pencil, Globe } from 'lucide-react'
import PortalBrand from './PortalBrand'
import profileReference from '../../assets/images/profile-design-reference.png'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const fields = [['full_name','Full name as on passport'],['first_name','First name'],['last_name','Last name'],['date_of_birth','Date of birth','date'],['gender','Gender'],['nic_number','NIC number'],['passport_number','Passport number'],['nationality','Nationality'],['phone','Phone with country code','tel'],['residential_address','Residential address']]
export default function ProfileForm({ profile, email, photographPath, onSaved, preview = false }) {
  const [draft,setDraft]=useState(profile),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  const [dirty, setDirty] = useState(false)
  const [editing, setEditing] = useState(false)
  const [portrait, setPortrait] = useState('')
  useEffect(() => {
    let active = true
    setPortrait('')
    if (photographPath) supabase.storage.from('student-private-documents').createSignedUrl(photographPath, 600).then(({data, error}) => { if (active && !error) setPortrait(data.signedUrl) }).catch(() => {})
    return () => { active = false }
  }, [photographPath])
  useEffect(() => { if (!dirty) setDraft(profile) }, [profile, dirty])
  async function save(event) {
    event.preventDefault();setBusy(true);setMessage('')
    try {
      const values=Object.fromEntries(fields.map(([key])=>[key,key==='date_of_birth'?(draft[key]||null):(draft[key]||'').trim()]))
      const {data,error}=await supabase.from('portal_profiles').update({...values,identification_number:values.nic_number||values.passport_number}).eq('id',profile.id).select('*').single()
      if(error)throw error
      setDraft(data)
      await onSaved(); setDirty(false); setEditing(false); setMessage('Profile saved. Changes to approved details require Trinity review.')
    }catch(error){setMessage(error.message)}finally{setBusy(false)}
  }
  const rows = [
    ['Full Name', profile.full_name, UserRound],
    ['Date of Birth', profile.date_of_birth ? new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric', timeZone:'UTC' }).format(new Date(profile.date_of_birth)) : '', CalendarDays],
    ['NIC Number', profile.nic_number, ContactRound],
    ['Passport Number', profile.passport_number, BookUser],
    ['Email', email, Mail],
    ['Contact Number', profile.phone, Phone],
    ['Nationality', profile.nationality, Globe],
    ['Residential Address', profile.residential_address, MapPin],
  ]
  return <section className="portal-profile-page">
    <header className="portal-profile-heading"><h2>My Profile</h2><div className="portal-profile-brand"><PortalBrand/></div><p>Keep your personal information up to date.</p></header>
    <div className="portal-card portal-profile-summary">
      <div className="portal-profile-identity"><div className="portal-profile-avatar" aria-hidden="true">{preview ? <svg className="portal-profile-reference-portrait" viewBox="506 254 174 174"><image href={profileReference} width="1594" height="987"/></svg> : portrait ? <img src={portrait} alt="Your profile photograph" onError={()=>setPortrait('')}/> : profile.full_name ? profile.full_name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase() : <UserRound size={30}/>}</div><div><h3>{profile.full_name || 'Complete your profile'}</h3><p>Student ID: <strong>{profile.student_number || 'Not assigned'}</strong></p></div><div className="portal-profile-edit-action">{preview ? <Link className="portal-outline compact" to="/student-portal/profile"><Pencil size={20}/>Edit Profile</Link> : <button className="portal-outline compact" disabled={busy} onClick={()=>{setEditing(!editing);setMessage('')}}><Pencil size={20}/>{editing ? 'View Profile' : 'Edit Profile'}</button>}</div></div>
      {message && <p role="status" className="portal-pending">{message}</p>}
      {!editing ? <dl className="portal-profile-rows">{rows.slice(0,6).map(([label,value,Icon])=><div key={label}><dt><Icon size={18}/>{label}</dt><dd>{value || <span className="portal-profile-missing">Not provided</span>}</dd></div>)}</dl> : <div className="portal-form-card portal-profile-editor"><p>Your confirmed details are used in your agreement. Check spellings and identity numbers carefully.</p><form onSubmit={save}><div className="portal-form-grid">{fields.map(([key,label,type])=><label key={key}>{label}<input type={type||'text'} maxLength={key==='residential_address'?1000:200} required={!['gender','first_name','last_name'].includes(key)} value={draft[key]||''} disabled={busy} onChange={e=>{setDirty(true);setDraft({...draft,[key]:e.target.value})}}/></label>)}<label>Account email<input type="email" value={email||''} readOnly/></label></div><div className="portal-action-row"><button className="portal-primary" disabled={busy}>{busy?'Saving...':'Save profile'}</button><button type="button" className="portal-outline" disabled={busy} onClick={()=>{setDraft(profile);setDirty(false);setEditing(false);setMessage('')}}>Cancel</button></div></form></div>}
    </div>
  </section>
}
