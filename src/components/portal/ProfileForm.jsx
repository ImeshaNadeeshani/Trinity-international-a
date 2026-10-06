import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const fields = [['full_name','Full name as on passport'],['first_name','First name'],['last_name','Last name'],['date_of_birth','Date of birth','date'],['gender','Gender'],['nic_number','NIC number'],['passport_number','Passport number'],['nationality','Nationality'],['phone','Phone with country code','tel'],['residential_address','Residential address']]
export default function ProfileForm({ profile, email, onSaved }) {
  const [draft,setDraft]=useState(profile),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
  async function save(event) {
    event.preventDefault();setBusy(true);setMessage('')
    try {
      const values=Object.fromEntries(fields.map(([key])=>[key,key==='date_of_birth'?(draft[key]||null):(draft[key]||'').trim()]))
      const {error}=await supabase.from('portal_profiles').update({...values,identification_number:values.nic_number||values.passport_number}).eq('id',profile.id)
      if(error)throw error
      setMessage('Profile saved. Changes to approved details require Trinity review.');await onSaved()
    }catch(error){setMessage(error.message)}finally{setBusy(false)}
  }
  return <div className="portal-card portal-form-card"><h2>My profile</h2><p>Your confirmed details are used in your agreement. Check spellings and identity numbers carefully.</p>{message&&<p role="status" className="portal-pending">{message}</p>}<form onSubmit={save}><div className="portal-form-grid">{fields.map(([key,label,type])=><label key={key}>{label}<input type={type||'text'} maxLength={key==='residential_address'?1000:200} required={!['gender','first_name','last_name'].includes(key)} value={draft[key]||''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}<label>Verified email<input type="email" value={email||''} readOnly/></label></div><button className="portal-primary" disabled={busy}>{busy?'Saving…':'Save profile'}</button></form></div>
}
