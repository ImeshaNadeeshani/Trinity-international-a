import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { invokePortal } from '../lib/portalFunctions'

export function ExtractedDetails({ documents, uploadedDocument, profile, onSaved }) {
  const [reading, setReading] = useState('')
  const [draft, setDraft] = useState(null)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (uploadedDocument) read(uploadedDocument)
    // Run only for a newly uploaded document; edits must not restart extraction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedDocument?.id])
  async function read(doc) {
    setReading(doc.id); setMessage(''); setDraft(null)
    try {
      if (doc.scan_status !== 'clean') {
        const scan = await invokePortal('scan-student-document', { document_id: doc.id })
        if (scan.scan_status !== 'clean') throw new Error(scan.reason || 'This document has not passed its security scan yet.')
      }
      const result = await invokePortal('extract-student-document', { document_id: doc.id })
      setDraft({ document_id: doc.id, manual_review_required: result.manual_review_required, ...result.fields, date_of_birth: result.fields.date_of_birth || profile.date_of_birth || '', nationality: result.fields.nationality || profile.nationality || '', full_name: result.fields.full_name || profile.full_name || '', identification_number: result.fields.identification_number || result.fields.passport_number || profile.identification_number || '', residential_address: result.fields.residential_address || profile.residential_address || '' })
    } catch (error) { setMessage(error.message) }
    finally { setReading('') }
  }
  async function save(event) {
    event.preventDefault(); setReading(draft.document_id); setMessage('')
    try {
      const { error } = await supabase.rpc('portal_confirm_extracted_details', { document: draft.document_id, final_fields: {full_name:draft.full_name, identification_number:draft.identification_number, residential_address:draft.residential_address, date_of_birth:draft.date_of_birth, nationality:draft.nationality} })
      if (error) throw error
      setDraft(null); setMessage('Details saved to your profile. Trinity can now review your application and generate your agreement.'); await onSaved()
    } catch (error) { setMessage(error.message) }
    finally { setReading('') }
  }
  return <div className="portal-card portal-form-card"><h2>Read details from your documents</h2><p>Scan your NIC, passport or supporting document, then check the details before saving them to your profile.</p>
    {documents.filter(d => !['replaced', 'rejected'].includes(d.status)).map(doc => <article className="portal-document" key={doc.id}><span className="portal-doc-info"><strong>{doc.file_name}</strong><small>{doc.scan_status === 'clean' ? 'Ready to read' : 'Security scan required'}</small></span><button className="portal-outline compact" disabled={!!reading} onClick={() => read(doc)}>{reading === doc.id ? 'Reading…' : 'Read / retry details'}</button></article>)}
    {!documents.length && <p>Upload a document above to begin.</p>}
    {message && <p role="status" className="portal-pending">{message}</p>}
    {draft && <form onSubmit={save}><h3>Check your extracted details</h3>{draft.manual_review_required && <p className="portal-pending">Some details have low or unknown confidence. Trinity must review the original document.</p>}<p>Correct any scanning mistakes. Missing details can be entered here.</p>{[['full_name','Full name'],['identification_number','NIC or passport number'],['residential_address','Residential address'],['date_of_birth','Date of birth'],['nationality','Nationality']].map(([key,label]) => <label key={key}>{label}<input type={key === 'date_of_birth' ? 'date' : 'text'} required={['full_name','identification_number'].includes(key)} maxLength={key === 'residential_address' ? 1000 : 200} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })}/></label>)}{draft.date_of_birth && <p>Date of birth read: {draft.date_of_birth}</p>}{draft.nationality && <p>Nationality read: {draft.nationality}</p>}<button className="portal-primary" disabled={!!reading}>Confirm and save profile</button></form>}
  </div>
}

